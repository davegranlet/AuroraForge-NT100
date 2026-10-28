'use strict';
// Build body-only development clips from decoded 2K19 poses. This deliberately
// does not copy ancillary target records or produce an installable entrance.
const fs=require('node:fs');
const path=require('node:path');
const {decodeEntrance}=require('./decode-2k19-entrance-source');
const {parseFile,build}=require('./clips-layout');
const {encodeDenseGroup}=require('./clips-codec/encode-dense-group');
const {concatWriters}=require('./clips-codec/concat-writers');

function descriptor(series,scale){
  const lo=Math.min(...series),hi=Math.max(...series);
  if(!Number.isFinite(lo)||!Number.isFinite(hi))throw new Error('Non-finite source transform');
  if(hi===lo)return {scale:0,width:0,rest:lo};
  const step=2**scale,rest=Math.floor(lo/step)*step;
  const width=Math.max(1,Math.ceil(Math.log2(Math.ceil((hi-rest)/step)+1)));
  if(width>31)throw new Error('Source transform exceeds encoding range');
  return {scale,width,rest};
}

function buildSourceBody(options){
  const {sourcePath,templateRoot,outputRoot,sourceMotionId}=options;
  if(sourceMotionId!==273)throw new Error('This measured candidate builder is restricted to 2K19 entrance 273');
  const source=decodeEntrance(sourcePath),results=[];
  fs.mkdirSync(outputRoot,{recursive:true});
  for(const phase of source.phases){
    const template=path.join(templateRoot,`${phase.phase*10000+sourceMotionId}.clips`);
    const layout=parseFile(template,{includeRaw:false}),body=layout.records.reduce((best,r)=>r.trackIdentifiers.length>best.trackIdentifiers.length?r:best,layout.records[0]);
    if(body.trackIdentifiers.length!==64||body.frameValue!==phase.frames)throw new Error('Template is not the matching classic entrance phase');
    const original=fs.readFileSync(template).subarray(body.offset,body.offset+body.length);
    const descSection=body.sections.find(s=>s.name==='group78 descriptors');
    if(descSection.count!==64*6)throw new Error('Unexpected body descriptor layout');
    const prefix=Buffer.from(original.subarray(0,parseInt(descSection.relativeOffset,16)+descSection.bytes));
    const descriptorsOffset=parseInt(descSection.relativeOffset,16),parts=[];
    for(const track of phase.body)for(let gi=0;gi<2;gi++){
      const rows=gi===0?track.p:track.rotation;
      const descs=[0,1,2].map(c=>descriptor(rows.map(row=>row[c]),gi===0?-12:-18));
      for(let c=0;c<3;c++){
        const at=descriptorsOffset+(track.index*6+gi*3+c)*8,d=descs[c];
        prefix.writeInt8(d.scale,at);prefix.writeUInt8(d.width,at+1);prefix.writeFloatLE(d.rest,at+4);
      }
      const writer=encodeDenseGroup(rows,descs);
      if(writer.clampCount)throw new Error('Source pose was clamped');
      parts.push(writer);
    }
    const writer=concatWriters(parts),bitLength=writer.bitLength(),packed=writer.flush();
    const group=Buffer.concat([packed,Buffer.alloc((8-packed.length%8)%8)]);
    prefix.writeUInt32LE(phase.frames,0x44);
    prefix.writeUInt32LE(group.length/8,0x90);
    prefix.writeUInt32LE(Math.ceil(bitLength/64),0x94);
    prefix.writeUInt32LE(bitLength,0x9c);
    const output=path.join(outputRoot,`${phase.phase}-Dolph-Ziggler-1-body-only.clips`);
    fs.writeFileSync(output,build([Buffer.concat([prefix,group])]));
    const check=parseFile(output,{includeRaw:false});
    if(check.count!==1||check.records[0].frameValue!==phase.frames)throw new Error('Body candidate failed structural verification');
    results.push({phase:phase.phase,output,frames:phase.frames,sourceTracks:62,targetTracks:64,copiedAnimationGroups:0,copiedAncillaryRecords:0});
  }
  const report={status:'body-only development candidate; not a complete entrance',sourcePath,sourceSha256:source.sourceSha256,
    sourceMotionId,sourceName:'DOLPH ZIGGLER 1',results,
    remaining:['camera/director event conversion','facial/morph container conversion','ring-interaction conversion','complete registration/package verification','in-game validation']};
  fs.writeFileSync(path.join(outputRoot,'provenance.json'),JSON.stringify(report,null,2));
  return report;
}
// Reuse the measured dense encoder for a source-only body development record.
// Callers provide an explicit verified body identity; never infer it by size.
function encodeSourceBodyRecord({templatePath,recordIndex,expectedBoneIds,expectedRecordId,body,frames,outputPath}){
  const layout=parseFile(templatePath,{includeRaw:false});
  const boneMatch=r=>r&&r.trackIdentifiers.length===expectedBoneIds.length&&r.trackIdentifiers.every((id,i)=>id===expectedBoneIds[i]);
  let rec;
  if(expectedRecordId!==undefined){
    rec=layout.records[recordIndex];
    if(!boneMatch(rec)||rec.id!==expectedRecordId)throw new Error('Explicit companion record ID/bone sequence mismatch');
  }else{
    const matches=layout.records.filter(boneMatch);
    if(matches.length!==1||matches[0].index!==recordIndex)throw new Error('Expected one explicitly matched body bone-ID sequence');
    rec=matches[0];
  }
  const section=rec.sections.find(s=>s.name==='group78 descriptors');
  if(body.length!==expectedBoneIds.length||section.count!==body.length*6)throw new Error('Body descriptor count mismatch');
  const raw=fs.readFileSync(templatePath),start=parseInt(section.relativeOffset,16);
  const prefix=Buffer.from(raw.subarray(rec.offset,rec.offset+start+section.bytes)),parts=[];
  for(const track of body)for(let gi=0;gi<2;gi++){
    const rows=gi===0?track.p:track.rotation;
    if(rows.length!==frames)throw new Error('Source sample count mismatch');
    const descs=[0,1,2].map(c=>descriptor(rows.map(r=>r[c]),gi===0?-12:-18));
    descs.forEach((d,c)=>{const at=start+(track.index*6+gi*3+c)*8;prefix.writeInt8(d.scale,at);prefix.writeUInt8(d.width,at+1);prefix.writeFloatLE(d.rest,at+4);});
    const encoded=encodeDenseGroup(rows,descs);
    if(encoded.clampCount)throw new Error('Source pose was clamped');
    parts.push(encoded);
  }
  const writer=concatWriters(parts),bits=writer.bitLength(),packed=writer.flush();
  const group=Buffer.concat([packed,Buffer.alloc((8-packed.length%8)%8)]);
  prefix.writeUInt32LE(frames,0x44);prefix.writeUInt32LE(group.length/8,0x90);
  prefix.writeUInt32LE(Math.ceil(bits/64),0x94);prefix.writeUInt32LE(bits,0x9c);
  fs.mkdirSync(path.dirname(outputPath),{recursive:true});
  fs.writeFileSync(outputPath,build([Buffer.concat([prefix,group])]));
  return {outputPath,frames,tracks:body.length,copiedAnimatedGroups:0,status:'source-only body development record; companion and runtime validation required'};
}
module.exports={buildSourceBody,encodeSourceBodyRecord};
