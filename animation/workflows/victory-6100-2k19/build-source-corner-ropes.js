'use strict';
const fs=require('node:fs'),path=require('node:path');
const tools=path.resolve(__dirname,'../../tools');
const {decode}=require(path.join(tools,'yanm-keyframes'));
const {positionFrames}=require(path.join(tools,'decode-2k19-entrance-source'));
const {readVictoryRopePlacements}=require(path.join(tools,'fop19-victory-rope-placement'));
const {parseFile,clipNameId}=require(path.join(tools,'clips-layout'));
const {parseClipsRecord}=require(path.join(tools,'clips-codec/parse-clips-record'));
const {readTrackDescriptors}=require(path.join(tools,'clips-codec/read-track-descriptors'));
const {encodeSourceBodyRecord}=require(path.join(tools,'build-source19-body-clips'));
const {resolve2k19ExtractPath}=require('../../tools/resolve-2k19-extract-path');
const root=require('node:path').dirname(resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop'));
const templatePath=path.resolve(tools,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const events=readVictoryRopePlacements(fs.readFileSync(path.join(root,'00_0CE8FE35827FD8DE.unpacked.0fop')));
const mapping=JSON.parse(fs.readFileSync(path.join(__dirname,'rope-identity-crosswalk.json'))).rows;
const layout=parseFile(templatePath,{includeRaw:false}),results=[];
for(const {child,eventId,side} of [3,4,5,6].map((child,i)=>({child,eventId:14+i,side:false})).concat([9,10,11,12].map((child,i)=>({child,eventId:20+i,side:true})))){
 const row=mapping.find(r=>r.sourceChild===child);
 const dir=path.join(root,'children'),files=fs.readdirSync(dir).filter(f=>f.startsWith(child+'_')&&f.endsWith('.bin'));
 if(files.length!==1)throw Error('Ambiguous corner rope source');
 const section=decode(fs.readFileSync(path.join(dir,files[0])))[0],duration=section.tracks[0].frameCount,frames=duration+1;
 if(section.tracks.length!==4||section.tracks[0].hash!==row.sourceRootHash)throw Error('Source identity mismatch');
 const rec=layout.records[row.targetRecord];
 if(rec.id!==clipNameId(row.targetClip))throw Error('Target clip identity mismatch');
 const parsed=parseClipsRecord(templatePath,rec.index),event=events.find(e=>e.identifier===eventId);
 if(!side&&event.tuples.length!==1)throw Error('Corner placement is not static');
 if(event.tuples.some(t=>t.yaw!==event.tuples[0].yaw))throw Error('Varying event yaw requires rotation interpolation');
 const tuple=event.tuples[0],body=[];
 for(let track=0;track<5;track++){
  const d=readTrackDescriptors(parsed,track);
  if(track!==0&&track!==2&&d.some(x=>x.width!==0)||track===2&&d.slice(3).some(x=>x.width!==0))throw Error('Unexpected animated structural helper');
  let p=Array.from({length:frames},()=>d.slice(0,3).map(x=>x.rest));
  let rotation=Array.from({length:frames},()=>d.slice(3).map(x=>x.rest));
  if(track===0){p=side?positionFrames(section.tracks[0].secondary,section.tracks[0].quantizationCandidates,duration):Array.from({length:frames},()=>[tuple.position[0],-tuple.position[1],tuple.position[2]]);rotation=Array.from({length:frames},()=>[0,-tuple.yaw/2,0]);}
  if(track===2)p=positionFrames(section.tracks[2].secondary,section.tracks[2].quantizationCandidates,duration);
  body.push({index:track,p,rotation});
 }
 const outputPath=path.join(__dirname,'source-pose-audit',`${side?'side':'corner'}-${child}-full-span.clips`);
 const report=encodeSourceBodyRecord({templatePath,recordIndex:rec.index,expectedBoneIds:rec.trackIdentifiers,body,frames,outputPath});
 fs.writeFileSync(outputPath+'.expected.json',JSON.stringify({body,frames}));
 results.push({...report,sourceChild:child,targetClip:row.targetClip,rootProvenance:side?'source root position curve; event yaw':'source event tuple',deformationProvenance:'source rope track2',structuralHelpers:'static target rest values only',limits:['compact source helper rotation semantics not independently validated','not a complete Victory package; no runtime validation']});
}
fs.writeFileSync(path.join(__dirname,'source-pose-audit/corner-rope-build.json'),JSON.stringify(results,null,2));
console.log(results.map(r=>({clip:r.targetClip,frames:r.frames,tracks:r.tracks,copiedAnimatedGroups:r.copiedAnimatedGroups})));
