'use strict';
// Build the complete Victory 6100 facial record: 7 source facial bones mapped to target bones 1..7,
// target bone 0 preserved, and all 720 target morph channels re-encoded on the source 2421-frame timeline.
// Unmapped target channels are made static at rest; no donor facial motion is copied.
const fs=require('node:fs');
const path=require('node:path');
const {parse,build}=require('../../tools/clips-layout');
const {BitWriter}=require('../../tools/clips-codec/bit-writer');
const {encodeDenseGroup}=require('../../tools/clips-codec/encode-dense-group');
const {concatWriters}=require('../../tools/clips-codec/concat-writers');
const {BitReader}=require('../../tools/clips-codec/bit-reader');
const {evalGroup}=require('../../tools/clips-codec/eval-group');
const {readScalarExtras}=require('../../tools/facial-extra-layout');
const {decodeVictory,halfLog}=require('../../tools/decode-2k19-entrance-source');

const root=__dirname;
const targetFile=path.resolve(root,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const {resolve2k19ExtractPath}=require('../../tools/resolve-2k19-extract-path');
const sourceFile=resolve2k19ExtractPath('victory/6100.bin');
const transferFile=path.join(root,'victory-facial-transfer-map.json');
const outDir=path.join(root,'source-pose-audit');
const outClips=path.join(outDir,'facial-full-span.clips');
const outPayload=path.join(outDir,'facial-full-span.payload.bin');
const outReport=path.join(outDir,'facial-full-span-report.json');

const EXPECTED_BONE_IDS=['0x9A7CE19BAA54C278','0xDD8399C6738EDEA4','0xDD839FC6738EE8D6','0x0E2668572C6D1C38','0x8695D8942CA94585','0x8695D5942CA9406C','0x8695D6942CA9421F','0x8695D3942CA93D06'];
const BONE_NAMES=['base','J_Eye_L','J_Eye_R','J_Jaw','J_Tongue1','J_Tongue2','J_Tongue3','J_Tongue4'];

function descriptor(series,scale){
  const step=2**scale;
  const lo=Math.min(...series),hi=Math.max(...series);
  if(!Number.isFinite(lo)||!Number.isFinite(hi))throw new Error('Non-finite facial channel');
  if(hi===lo)return {scale:0,width:0,rest:lo};
  const rest=Math.fround(Math.floor(lo/step)*step);
  const width=Math.max(1,Math.ceil(Math.log2(Math.ceil((hi-rest)/step+1e-9)+1)));
  if(width>30)throw new Error('Facial bone channel exceeds encoding range');
  return {scale,width,rest};
}
function writeDescriptor(buf,at,d){
  buf.writeInt8(d.scale,at);buf.writeUInt8(d.width,at+1);buf.writeUInt16LE(0,at+2);buf.writeFloatLE(d.rest,at+4);
}
function quantize(values,d){
  const step=2**d.scale,max=(2**d.width)-1,out=new Uint32Array(values.length);
  let clamps=0;
  for(let i=0;i<values.length;i++){
    let q=Math.round((values[i]-d.rest)/step);
    if(q<0){q=0;clamps++;}
    if(q>max){q=max;clamps++;}
    out[i]=q;
  }
  return {q:out,clamps};
}

const targetBytes=fs.readFileSync(targetFile);
const targetLayout=parse(targetBytes,{includeRaw:false});
const rec=targetLayout.records.find(r=>r.index===16);
if(!rec||rec.trackIdentifiers.length!==8)throw new Error('Target facial record is not the 8-track profile');
rec.trackIdentifiers.forEach((id,i)=>{if(id!==EXPECTED_BONE_IDS[i])throw new Error(`Unexpected target facial bone ${i}: ${id}`);});
const payload=Buffer.from(targetBytes.subarray(rec.offset,rec.offset+rec.length));
const g90=rec.sections.find(s=>s.name==='group90');
const g90Off=parseInt(g90.relativeOffset,16);
const descOff=parseInt(rec.sections.find(s=>s.name==='group78 descriptors').relativeOffset,16);
const prefix=Buffer.from(payload.subarray(0,g90Off));

const source=decodeVictory(sourceFile);
if(source.facial.length!==7)throw new Error(`Expected 7 source facial bones, got ${source.facial.length}`);
const F=source.frames;
if(F!==2421)throw new Error(`Unexpected source facial frame count ${F}`);

const boneData=[{bone:0,name:'base',preserved:true}];
source.facial.forEach((track,i)=>{
  const pos=track.p;
  const rot=track.q.map(halfLog);
  boneData.push({bone:i+1,name:BONE_NAMES[i+1],sourceIndex:i,pos,rot,posDesc:[0,1,2].map(c=>descriptor(pos.map(r=>r[c]),-14)),rotDesc:[0,1,2].map(c=>descriptor(rot.map(r=>r[c]),-18))});
});

// Bone 0 is preserved structurally: it must be zero-width so the rebuilt stream can skip it.
const bone0Descs=[0,1,2,3,4,5].map(k=>({scale:prefix.readInt8(descOff+k*8),width:prefix[descOff+k*8+1],rest:prefix.readFloatLE(descOff+k*8+4)}));
if(bone0Descs.some(d=>d.width!==0))throw new Error('Target base facial bone is not static; writer does not support preserving its bits');

const boneWriters=[];
for(const bd of boneData){
  if(bd.preserved)continue;
  const pw=encodeDenseGroup(bd.pos,bd.posDesc);
  const rw=encodeDenseGroup(bd.rot,bd.rotDesc);
  if(pw.clampCount||rw.clampCount)throw new Error(`Bone ${bd.bone} clamped`);
  if(pw.bitLength())boneWriters.push(pw);
  if(rw.bitLength())boneWriters.push(rw);
  for(let c=0;c<3;c++){
    writeDescriptor(prefix,descOff+(bd.bone*6+c)*8,bd.posDesc[c]);
    writeDescriptor(prefix,descOff+(bd.bone*6+3+c)*8,bd.rotDesc[c]);
  }
}
const boneWriter=concatWriters(boneWriters);
const boneBits=boneWriter.bitLength();

const transfer=JSON.parse(fs.readFileSync(transferFile,'utf8'));
const byIndex=new Map(transfer.targetChannels.map(c=>[c.index,c]));
const extraWriter=new BitWriter();
const extraMeta=[];
for(let i=0;i<720;i++){
  const at=descOff+(48+i)*8;
  const mapped=byIndex.get(i);
  if(!mapped){
    writeDescriptor(prefix,at,{scale:0,width:0,rest:0});
    extraMeta.push({index:i,active:false});
    continue;
  }
  const d={scale:mapped.scale,width:mapped.width,rest:mapped.rest};
  if(d.width<1||d.width>12)throw new Error(`Invalid mapped descriptor at ${i}`);
  const {q,clamps}=quantize(mapped.series,d);
  if(clamps)throw new Error(`Mapped channel ${i} clamped ${clamps} times`);
  for(const v of q)extraWriter.write(v,d.width);
  writeDescriptor(prefix,at,d);
  extraMeta.push({index:i,active:true,width:d.width,scale:d.scale,rest:d.rest,sources:mapped.sources});
}

const combined=concatWriters([boneWriter,extraWriter]);
const totalBits=combined.bitLength();
const packed=combined.flush();
const group=Buffer.concat([packed,Buffer.alloc((8-packed.length%8)%8)]);
prefix.writeUInt32LE(F,0x44);
prefix.writeUInt32LE(group.length/8,0x90);
prefix.writeUInt32LE(group.length/8,0x94);
prefix.writeUInt32LE(boneBits,0x9c);
const newPayload=Buffer.concat([prefix,group]);
const container=build([newPayload]);

// Decode-back verification.
const reparsed=parse(container,{includeRaw:false});
if(reparsed.count!==1)throw new Error('Facial payload did not rebuild as one record');
const rr=reparsed.records[0];
const check=readScalarExtras(container,0);
if(check.frames!==F||check.channels.length!==720||check.bonePrefixBits!==boneBits)throw new Error('Facial structure readback mismatch');
if(!check.boundaryExact)throw new Error('Facial stream boundary mismatch');
const stream=container.subarray(rr.offset+parseInt(rr.sections.find(s=>s.name==='group90').relativeOffset,16),rr.offset+parseInt(rr.sections.find(s=>s.name==='group90').relativeOffset,16)+rr.sections.find(s=>s.name==='group90').bytes);
const rd=new BitReader(stream);
// Walk the bone prefix to decode each group.
const groupList=[];
for(let gi=0;gi<16;gi++){
  const k=gi*3;
  const w=[0,1,2].map(c=>rr.raw?0:0);
}
const descs=Array.from({length:768},(_,i)=>({scale:container.readInt8(rr.offset+descOff+i*8),width:container[rr.offset+descOff+i*8+1],rest:container.readFloatLE(rr.offset+descOff+i*8+4)}));
const boneCheck=[];
let maxBonePos=0,maxBoneRot=0;
for(let b=1;b<8;b++){
  const pg=check.boneGroups[2*b],rg=check.boneGroups[2*b+1];
  const pd=[0,1,2].map(c=>descs[b*6+c]),rdsc=[0,1,2].map(c=>descs[b*6+3+c]);
  const pos=pg&&!pg.skipped?evalGroup(stream,pg,pd,F):Array.from({length:F},()=>pd.map(d=>d.rest));
  const rot=rg&&!rg.skipped?evalGroup(stream,rg,rdsc,F):Array.from({length:F},()=>rdsc.map(d=>d.rest));
  const src=source.facial[b-1];
  let pe=0,re=0;
  for(let f=0;f<F;f++){
    for(let c=0;c<3;c++)pe=Math.max(pe,Math.abs(pos[f][c]-src.p[f][c]));
    for(let c=0;c<3;c++)re=Math.max(re,Math.abs(rot[f][c]-halfLog(src.q[f])[c]));
  }
  maxBonePos=Math.max(maxBonePos,pe);maxBoneRot=Math.max(maxBoneRot,re);
  boneCheck.push({bone:b,name:BONE_NAMES[b],maxPositionError:pe,maxHalfLogRotationError:re});
}
let maxChannelError=0,activeChannels=0;
for(const ch of check.channels){
  const m=byIndex.get(ch.index);
  if(!m)continue;
  activeChannels++;
  for(let f=0;f<F;f++)maxChannelError=Math.max(maxChannelError,Math.abs(ch.values[f]-m.series[f]));
}

const report={
  schema:'aurora-forge/victory-facial-record/v1',
  source:{file:sourceFile,sha256:source.sourceSha256,frames:F},
  target:{file:targetFile,record:rec.index,frames:rec.frameValue,tracks:rec.trackIdentifiers.length,group38:rec.sections.find(s=>s.name==='group38').count},
  output:{clips:outClips,clipsBytes:container.length,payloadBytes:newPayload.length,payloadSha256:require('node:crypto').createHash('sha256').update(newPayload).digest('hex').toUpperCase()},
  mapping:{channels:activeChannels,inferredSourceRows:transfer.counts.inferred,referenceSourceRows:transfer.counts.reference,staticSourceRows:transfer.counts.staticSource},
  boneCheck,
  maxBonePositionError:maxBonePos,
  maxBoneHalfLogRotationError:maxBoneRot,
  maxMappedChannelError:maxChannelError,
  structure:{boneBits,totalBits,qwords:group.length/8,group38Preserved:true,descriptors:768,channels:720},
  limits:['The 97-name reference is a mesh shape-delta crosswalk, not an animation-weight proof.','Thirteen source rows use semantic AU approximations and are marked inferred in victory-facial-transfer-map.json.','Unmapped target channels are static; no donor facial motion is retained.','Runtime/editor acceptance is not established by this offline record.']
};
fs.writeFileSync(outPayload,newPayload);
fs.writeFileSync(outClips,container);
fs.writeFileSync(outReport,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outClips,outPayload,bytes:newPayload.length,frames:F,boneBits,totalBits:totalBits,activeChannels,maxBonePos,maxBoneRot,maxChannelError},null,2));
