'use strict';
const {parseFile}=require('./clips-layout');
const {parseClipsRecord}=require('./clips-codec/parse-clips-record');
const {evalGroup}=require('./clips-codec/eval-group');
function compareMotion(leftFile,rightFile,trackIds) {
 if(!Array.isArray(trackIds)||!trackIds.length||new Set(trackIds).size!==trackIds.length)throw Error('An explicit unique track-ID set is required');
 const set=ids=>[...ids].sort().join(',');
 const expected=set(trackIds);
 function open(file) {
  const layout=parseFile(file,{includeRaw:false}),matches=layout.records.filter(r=>set(r.trackIdentifiers)===expected);
  if(matches.length!==1)throw Error(`${file}: expected one exact track-set match, found ${matches.length}`);
  const record=matches[0],parsed=parseClipsRecord(file,record.index);
  const stream=parsed.file.subarray(parsed.base,parsed.base+parsed.group.bytes);
  function channel(track,group) {
   const descs=Array.from({length:3},(_,axis)=>{const e=parsed.rec.raw.group78[track*6+group*3+axis];if(!e)throw Error('Missing descriptor');return {scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]};});
   const values=evalGroup(stream,parsed.bones[track].groups[group],descs,record.frameValue)||Array.from({length:record.frameValue},()=>descs.map(d=>d.rest));
   if(values.length!==record.frameValue||values.some(v=>v.length!==3||!v.every(Number.isFinite)))throw Error('Decoded channel does not cover all samples');return values;
  }
  return {record,channel,sha256:layout.sha256};
 }
 const left=open(leftFile),right=open(rightFile);
 if(left.record.frameValue!==right.record.frameValue||left.record.fps!==right.record.fps)throw Error('Timing differs; comparison will not truncate or retime');
 const frames=left.record.frameValue;
 const quat=v=>{const n=Math.hypot(...v),s=n<1e-12?1:Math.sin(n)/n;return [Math.cos(n),...v.map(x=>x*s)];};
 const tracks=trackIds.map(id=>{
  const a=left.record.trackIdentifiers.indexOf(id),b=right.record.trackIdentifiers.indexOf(id);
  const lp=left.channel(a,0),rp=right.channel(b,0),lr=left.channel(a,1),rr=right.channel(b,1);
  let maxPosition=0,sumPosition=0,maxAngleDegrees=0,sumAngle=0;
  for(let f=0;f<frames;f++) {
   const dp=Math.hypot(...lp[f].map((x,i)=>x-rp[f][i]));const qa=quat(lr[f]),qb=quat(rr[f]);
   const dr=2*Math.acos(Math.min(1,Math.abs(qa.reduce((n,x,i)=>n+x*qb[i],0))))*180/Math.PI;
   maxPosition=Math.max(maxPosition,dp);sumPosition+=dp;maxAngleDegrees=Math.max(maxAngleDegrees,dr);sumAngle+=dr;
  }
  return {id,leftIndex:a,rightIndex:b,maxPosition,meanPosition:sumPosition/frames,maxAngleDegrees,meanAngleDegrees:sumAngle/frames,leftStart:lp[0],rightStart:rp[0],leftEnd:lp[frames-1],rightEnd:rp[frames-1]};
 });
 return {schema:'aurora-clips-motion-comparison/v1',left:{file:leftFile,sha256:left.sha256,record:left.record.index},right:{file:rightFile,sha256:right.sha256,record:right.record.index},frames,fps:left.record.fps,tracks};
}
module.exports={compareMotion};
