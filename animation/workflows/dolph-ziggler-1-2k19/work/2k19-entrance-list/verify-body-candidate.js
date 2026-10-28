'use strict';
const fs=require('node:fs'),path=require('node:path');
const {decodeEntrance}=require('C:/AFnt100b3/animation/tools/decode-2k19-entrance-source.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const source=decodeEntrance('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin');
const out=path.resolve('outputs/dolph-ziggler-1-2k19/body-candidate'),report=[];
function quat(v){const a=Math.hypot(...v),s=a?Math.sin(a)/a:0;return [Math.cos(a),...v.map(x=>x*s)];}
const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,c)=>s+x*b[c],0))))*180/Math.PI;
for(const phase of source.phases){
 const p=path.join(out,`${phase.phase}-Dolph-Ziggler-1-body-only.clips`),r=parseClipsRecord(p,0),stream=r.file.subarray(r.base,r.base+r.group.bytes);
 let rotationMax=0,positionMax=0,spikes=0;
 for(const track of phase.body){const d=readTrackDescriptors(r,track.index),position=evalGroup(stream,r.bones[track.index].groups[0],d.slice(0,3),phase.frames)||Array.from({length:phase.frames},()=>d.slice(0,3).map(d=>d.rest)),rotation=evalGroup(stream,r.bones[track.index].groups[1],d.slice(3,6),phase.frames)||Array.from({length:phase.frames},()=>d.slice(3,6).map(d=>d.rest));
 for(let f=0;f<phase.frames;f++){
  rotationMax=Math.max(rotationMax,angle(track.q[f],quat(rotation[f])));
  positionMax=Math.max(positionMax,Math.hypot(...track.p[f].map((x,c)=>x-position[f][c])));
  if(f&&angle(quat(rotation[f-1]),quat(rotation[f]))>30)spikes++;
 }}
 if(rotationMax>.002||positionMax>.001)throw new Error('Body candidate does not faithfully encode decoded source poses');
 report.push({phase:phase.phase,frames:phase.frames,decodedTracks:64,maxRotationEncodingErrorDegrees:rotationMax,maxPositionEncodingError:positionMax,angularChangesOver30Degrees:spikes});
}
fs.writeFileSync(path.join(out,'encoding-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
