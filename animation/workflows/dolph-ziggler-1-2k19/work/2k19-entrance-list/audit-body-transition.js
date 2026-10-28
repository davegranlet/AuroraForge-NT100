'use strict';
const fs=require('node:fs'),path=require('node:path');
const d=require('C:/AFnt100b3/animation/tools/decode-2k19-entrance-source');
const {decode}=require('C:/AFnt100b3/animation/tools/yanm-keyframes');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record');
const {parseFile}=require('C:/AFnt100b3/animation/tools/clips-layout');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group');
const sourcePath='D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const nativePath='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1300273.clips';
const sections=decode(fs.readFileSync(sourcePath)),decoded=d.decodeEntrance(sourcePath);
const phase=decoded.phases[3],track=phase.body[56],raw=sections[6].tracks[56];
const keys=(raw.type===0x304?raw.secondary:raw.primary).keys;
const layout=parseFile(nativePath,{includeRaw:false});
const bodyIndex=layout.records.findIndex(r=>r.trackIdentifiers.length===64);
if(bodyIndex<0)throw new Error('Native reference body record not found');
const r=parseClipsRecord(nativePath,bodyIndex),desc=readTrackDescriptors(r,56);
const rows=evalGroup(r.file.subarray(r.base,r.base+r.group.bytes),r.bones[56].groups[1],desc.slice(3,6),phase.frames);
const fromHalfVector=v=>{const a=Math.hypot(...v),s=a?Math.sin(a)/a:0;return [Math.cos(a),...v.map(x=>x*s)];};
const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,v,c)=>s+v*b[c],0))))*180/Math.PI;
const frames=[];
for(let f=445;f<=459;f++){
 const q=fromHalfVector(rows[f]);
 frames.push({frame:f,sourceChangeDegrees:angle(track.q[f-1],track.q[f]),nativeReferenceChangeDegrees:angle(fromHalfVector(rows[f-1]),q),sourceToNativeErrorDegrees:angle(track.q[f],q),sourceQuaternion:track.q[f]});
}
const a=keys.find(k=>k.frame===451),b=keys.find(k=>k.frame===453);
const report={phase:130,sourceTrack:56,bone:'J_Toe_L',sourcePath,nativeReferencePath:nativePath,
 sourceKeySeparationDegrees:angle(d.eulerWordsToQuaternion(a.packed),d.eulerWordsToQuaternion(b.packed)),
 sharedControlWords:a.packed.slice(6,9),incomingMatchesOutgoing:JSON.stringify(a.packed.slice(6,9))===JSON.stringify(b.packed.slice(3,6)),
 nearbySourceKeys:keys.filter(k=>k.frame>=445&&k.frame<=459),frames,
 interpretation:'Native reference is a diagnostic comparison only; no target motion is used to generate candidate poses.'};
const out=path.resolve('outputs/dolph-ziggler-1-2k19/body-transition-audit.json');
fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({output:out,sourceKeySeparationDegrees:report.sourceKeySeparationDegrees,incomingMatchesOutgoing:report.incomingMatchesOutgoing,frames:frames.map(({frame,sourceChangeDegrees,nativeReferenceChangeDegrees,sourceToNativeErrorDegrees})=>({frame,sourceChangeDegrees,nativeReferenceChangeDegrees,sourceToNativeErrorDegrees}))},null,2));
