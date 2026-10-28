'use strict';
const fs=require('node:fs');
const {decodeEntrance}=require('C:/AFnt100b3/animation/tools/decode-2k19-entrance-source.js');
const {parseFile}=require('C:/AFnt100b3/animation/tools/clips-layout.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const decoded=decodeEntrance('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin');
const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,c)=>s+x*b[c],0))))*180/Math.PI;
function q(v){const a=Math.hypot(...v),s=a?Math.sin(a)/a:0;return [Math.cos(a),...v.map(x=>x*s)];}
const stats=a=>{a.sort((a,b)=>a-b);return {median:a[Math.floor(a.length/2)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
const report={source:decoded.sourcePath,sourceSha256:decoded.sourceSha256,phases:[]};
for(const p of decoded.phases){
 const file=`D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/${p.phase*10000+273}.clips`;
 const l=parseFile(file,{includeRaw:false}),bi=l.records.reduce((best,x,i)=>x.trackIdentifiers.length>l.records[best].trackIdentifiers.length?i:best,0),r=parseClipsRecord(file,bi),stream=r.file.subarray(r.base,r.base+r.group.bytes);
 const tracks=[];
 for(const track of p.body){const d=readTrackDescriptors(r,track.index),rr=evalGroup(stream,r.bones[track.index].groups[1],d.slice(3,6),p.frames)||Array.from({length:p.frames},()=>d.slice(3,6).map(x=>x.rest)),pp=evalGroup(stream,r.bones[track.index].groups[0],d.slice(0,3),p.frames)||Array.from({length:p.frames},()=>d.slice(0,3).map(x=>x.rest));
  const errors=[],pos=[],spikes=[];let worst=null;
  for(let f=0;f<p.frames;f++){const e=angle(track.q[f],q(rr[f]));errors.push(e);pos.push(Math.hypot(...track.p[f].map((x,c)=>x-pp[f][c])));if(!worst||e>worst.error)worst={frame:f,error:e};if(f&&angle(track.q[f],track.q[f-1])>30)spikes.push(f);}
  tracks.push({track:track.index,rotation:stats(errors),position:stats(pos),worst,spikes:spikes.length,spikeFrames:spikes});
 }
 report.phases.push({phase:p.phase,frames:p.frames,rotationSummary:stats(tracks.map(t=>t.rotation.max)),positionSummary:stats(tracks.map(t=>t.position.max)),tracks});
}
fs.writeFileSync(__dirname+'/source-body-verification.json',JSON.stringify(report,null,2));
fs.writeFileSync(__dirname+'/source273-decoded.json',JSON.stringify(decoded));
for(const p of report.phases){console.log(JSON.stringify({phase:p.phase,frames:p.frames,rotation:p.rotationSummary,position:p.positionSummary,spikes:p.tracks.reduce((s,t)=>s+t.spikes,0),worst:p.tracks.sort((a,b)=>b.rotation.max-a.rotation.max).slice(0,4).map(t=>({track:t.track,rotation:t.rotation,position:t.position,worst:t.worst}))}));}
