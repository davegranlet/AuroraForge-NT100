'use strict';

// Adapted from Aurora's proven 2K19->2K26 facial bone pass. Source 100 has
// facial phases with independently declared sample counts, so this consumes
// the exact retained samples from facial-source-curves.json without resampling.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = 'C:/nt100-codebasemain';
const { parse, build } = require(path.join(ROOT, 'animation/tools/clips-layout.js'));
const { BitReader } = require(path.join(ROOT, 'animation/tools/clips-codec/bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation/tools/clips-codec/parse-timing-group.js'));
const { evalGroup } = require(path.join(ROOT, 'animation/tools/clips-codec/eval-group.js'));
const { encodeDenseGroup } = require(path.join(ROOT, 'animation/tools/clips-codec/encode-dense-group.js'));
const { concatWriters } = require(path.join(ROOT, 'animation/tools/clips-codec/concat-writers.js'));
const { halfLog } = require(path.join(ROOT, 'animation/tools/decode-2k19-entrance-source.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const INPUT = path.join(__dirname, 'facial-source-curves.json');
const OUT = path.join(__dirname, 'facial-converted');
fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const source = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const expectedBoneIds = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];

function descriptor(series, scale) {
  const step = Math.pow(2, scale), lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw Error('non-finite channel values');
  if (hi === lo) return { scale: 0, width: 0, rest: lo };
  let s = scale;
  let rest = Math.fround(Math.floor(lo / Math.pow(2, s)) * Math.pow(2, s));
  let width = Math.max(1, Math.ceil(Math.log2(Math.ceil((hi - rest) / Math.pow(2, s) + 1e-9) + 1)));
  while (width > 30) { s += 1; rest = Math.fround(Math.floor(lo / Math.pow(2, s)) * Math.pow(2, s)); width = Math.max(1, Math.ceil(Math.log2(Math.ceil((hi - rest) / Math.pow(2, s) + 1e-9) + 1))); }
  return { scale: s, width, rest };
}
function rotVecToQuat(v) { const th = Math.hypot(...v); if (th < 1e-12) return [1,0,0,0]; const s = Math.sin(th) / th; return [Math.cos(th), v[0]*s, v[1]*s, v[2]*s]; }
function quatAngleDeg(a,b) { const d = Math.abs(a.reduce((s,v,i)=>s+v*b[i],0)); return 2*Math.acos(Math.min(1,d))*180/Math.PI; }

const report = { schema: 'aurora-forge-100-facial-bone-conversion/v1', sourceSha256: source.sourceSha256, sourceFramesAreIndependent: true, phases: [] };
for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const srcPhase = source.phases.find((x) => x.phase === phase);
  if (!srcPhase || srcPhase.tracks.length !== 7) throw Error(`phase ${phase}: expected seven source facial tracks`);
  const frames = srcPhase.frames;
  const file = path.join(NAT, `${phase}0273.clips`);
  const buf = fs.readFileSync(file), layout = parse(buf, { includeRaw: true });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  if (!rec) throw Error(`phase ${phase}: native 273 template facial record not found`);
  rec.trackIdentifiers.forEach((id,i)=>{if(id!==expectedBoneIds[i])throw Error(`phase ${phase}: unexpected facial track id ${id} at ${i}`);});
  const payload = Buffer.from(buf.subarray(rec.offset, rec.offset + rec.length));
  const x9c=payload.readUInt32LE(0x9c), g90=rec.sections.find(s=>s.name==='group90'), g90Off=parseInt(g90.relativeOffset,16), descOff=parseInt(rec.sections.find(s=>s.name==='group78 descriptors').relativeOffset,16);
  const nativeStream=payload.subarray(g90Off,g90Off+g90.bytes), nativeTotalBits=g90.bytes*8;
  const desc=rec.raw.group78.map(e=>({scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]}));
  const boneData=[{bone:0,preserved:true,posDesc:desc.slice(0,3),rotDesc:desc.slice(3,6)}];
  srcPhase.tracks.forEach((track,i)=>{
    const pos=track.p, rot=track.q.map(q=>halfLog(q));
    if(pos.length!==frames||rot.length!==frames) throw Error(`phase ${phase} source track ${i} count differs from declared facial sample count`);
    boneData.push({bone:i+1,name:['J_Eye_L','J_Eye_R','J_Jaw','J_Tongue1','J_Tongue2','J_Tongue3','J_Tongue4'][i],sourceIndex:i,pos,rot,posDesc:[0,1,2].map(c=>descriptor(pos.map(r=>r[c]),-14)),rotDesc:[0,1,2].map(c=>descriptor(rot.map(r=>r[c]),-18))});
  });
  const writers=[], groupLog=[];
  for(const bd of boneData){if(bd.preserved){groupLog.push({bone:0,preserved:true});continue;}const pw=encodeDenseGroup(bd.pos,bd.posDesc),rw=encodeDenseGroup(bd.rot,bd.rotDesc);if(pw.clampCount||rw.clampCount)throw Error(`phase ${phase} clamp in facial conversion`);if(pw.bitLength())writers.push(pw);if(rw.bitLength())writers.push(rw);groupLog.push({bone:bd.bone,posBits:pw.bitLength(),rotBits:rw.bitLength()});}
  const boneWriter=concatWriters(writers), boneBits=boneWriter.bitLength(),boneBytes=boneWriter.flush(),totalBits=boneBits+(nativeTotalBits-x9c),outBytes=Buffer.alloc(Math.ceil(totalBits/64)*8);
  for(let i=0;i<boneBits;i++)if((boneBytes[i>>3]>>(i&7))&1)outBytes[i>>3]|=1<<(i&7);
  for(let i=x9c;i<nativeTotalBits;i++)if((nativeStream[i>>3]>>(i&7))&1){const at=boneBits+(i-x9c);outBytes[at>>3]|=1<<(at&7);}
  const newPayload=Buffer.concat([payload.subarray(0,g90Off),outBytes]);
  newPayload.writeUInt32LE(outBytes.length/8,0x90);newPayload.writeUInt32LE(outBytes.length/8,0x94);newPayload.writeUInt32LE(boneBits,0x9c);newPayload.writeUInt32LE(frames,0x44);
  for(const bd of boneData){if(bd.preserved)continue;for(let c=0;c<3;c++){const put=(slot,d)=>{const at=descOff+slot*8;newPayload.writeInt8(d.scale,at);newPayload.writeUInt8(d.width,at+1);newPayload.writeUInt16LE(0,at+2);newPayload.writeFloatLE(d.rest,at+4);};put(bd.bone*6+c,bd.posDesc[c]);put(bd.bone*6+3+c,bd.rotDesc[c]);}}
  const container=build([newPayload]), reread=parse(container,{includeRaw:true}), rr=reread.records[0];
  if(rr.frameValue!==frames||rr.trackIdentifiers.length!==8||rr.raw.group90.length!==outBytes.length/8)throw Error(`phase ${phase} facial output parse-back failed`);
  const rDesc=rr.raw.group78.map(e=>({scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]}));
  const rg=rr.sections.find(s=>s.name==='group90'),rStream=container.subarray(rr.offset+parseInt(rg.relativeOffset,16),rr.offset+parseInt(rg.relativeOffset,16)+rg.bytes),rd=new BitReader(rStream),groups=[];
  for(let gi=0;gi<16;gi++){const k=gi*3,w=[rDesc[k].width,rDesc[k+1].width,rDesc[k+2].width];groups.push(w.every(x=>x===0)?null:parseTimingGroup(rd,frames,w));}
  if(rd.pos!==boneBits||container.readUInt32LE(rr.offset+0x9c)!==boneBits)throw Error(`phase ${phase} facial decode-back boundary mismatch`);
  let maxRotDeg=0,maxPosErr=0;
  for(let b=1;b<8;b++){const pgp=groups[2*b],pgr=groups[2*b+1],dp=[0,1,2].map(c=>rDesc[2*b*3+c]),dr=[0,1,2].map(c=>rDesc[(2*b+1)*3+c]);const pos=pgp?evalGroup(rStream,pgp,dp,frames):Array.from({length:frames},()=>dp.map(x=>x.rest));const rot=pgr?evalGroup(rStream,pgr,dr,frames):Array.from({length:frames},()=>dr.map(x=>x.rest));const src=srcPhase.tracks[b-1];for(let f=0;f<frames;f++){maxRotDeg=Math.max(maxRotDeg,quatAngleDeg(rotVecToQuat(rot[f]),src.q[f]));for(let c=0;c<3;c++)maxPosErr=Math.max(maxPosErr,Math.abs(pos[f][c]-src.p[f][c]));}}
  const tailStartBit=boneBits;
  let tailMismatch=0;for(let i=x9c;i<nativeTotalBits;i++){const a=(nativeStream[i>>3]>>(i&7))&1,at=tailStartBit+(i-x9c),b=(outBytes[at>>3]>>(at&7))&1;if(a!==b)tailMismatch++;}
  const outFile=path.join(OUT,`${phase}-2k19-the-rock-facial.clips`);fs.writeFileSync(outFile,container,{flag:'wx'});
  report.phases.push({phase,sourceFrames:frames,nativeTemplateFrames:rec.frameValue,outputFrames:rr.frameValue,recordIndex:rec.index,tracks:rr.trackIdentifiers.length,bytes:container.length,sha256:sha(container),maxRotDeg:+maxRotDeg.toFixed(5),maxPosErr:+maxPosErr.toExponential(3),nativeMorphTailBitsPreserved:tailMismatch===0,nativeMorphTailMismatchBits:tailMismatch,nativeMorphTailMeaning:'unresolved target-native 273 placeholder; its time interpretation is not claimed source-faithful',groups:groupLog});
}
fs.writeFileSync(path.join(OUT,'facial-conversion-evidence.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report.phases.map(({phase,sourceFrames,nativeTemplateFrames,outputFrames,maxRotDeg,maxPosErr,nativeMorphTailBitsPreserved,sha256})=>({phase,sourceFrames,nativeTemplateFrames,outputFrames,maxRotDeg,maxPosErr,nativeMorphTailBitsPreserved,sha256})),null,2));
