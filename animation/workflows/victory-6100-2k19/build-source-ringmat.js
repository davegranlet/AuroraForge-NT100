'use strict';
const fs=require('node:fs'),path=require('node:path');
const tools=path.resolve(__dirname,'../../tools');
const {decode}=require(path.join(tools,'yanm-keyframes'));
const {positionFrames}=require(path.join(tools,'decode-2k19-entrance-source'));
const {parseFile,clipNameId}=require(path.join(tools,'clips-layout'));
const {parseClipsRecord}=require(path.join(tools,'clips-codec/parse-clips-record'));
const {readTrackDescriptors}=require(path.join(tools,'clips-codec/read-track-descriptors'));
const {encodeSourceBodyRecord}=require(path.join(tools,'build-source19-body-clips'));
const {resolve2k19ExtractPath}=require('../../tools/resolve-2k19-extract-path');
const root=require('node:path').dirname(require('node:path').dirname(resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop')));
function child(id,prefix){const d=path.join(root,id,'children'),files=fs.readdirSync(d).filter(f=>f.startsWith(prefix)&&f.endsWith('.bin'));if(files.length!==1)throw Error('Ambiguous source child');return decode(fs.readFileSync(path.join(d,files[0])))[0];}
const source=child('6100','2_'),control=child('273','3_');
if(source.tracks.length!==27||source.tracks.some((t,i)=>t.hash!==control.tracks[i].hash))throw Error('Ringmat source identity differs from measured mapping');
const names=['base','bone01','bone11','bone12','bone13','bone14','bone15','bone16','bone17','bone18','bone03','bone04','bone05','bone06','bone07','bone08','bone09','bone10','bone02','bone19','bone20','bone21','bone22','bone23','bone24','bone25','bone26','bone27'];
// Resolve the actual repo path independent of the workflow nesting.
const templatePath=path.resolve(tools,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const layout=parseFile(templatePath,{includeRaw:false}),ids=names.map(clipNameId);
const matches=layout.records.filter(r=>r.trackIdentifiers.length===ids.length&&r.trackIdentifiers.every((id,i)=>id===ids[i]));
if(matches.length!==1)throw Error('Ringmat target identity is not unique');
const record=matches[0],parsed=parseClipsRecord(templatePath,record.index),duration=source.tracks[0].frameCount,frames=duration+1,body=[];
for(let i=0;i<28;i++){
  const d=readTrackDescriptors(parsed,i);
  if(d.slice(3).some(x=>x.width!==0)||i===27&&d.some(x=>x.width!==0))throw Error('Unexpected animated structural helper');
  const p=i<27?positionFrames(source.tracks[i].secondary,source.tracks[i].quantizationCandidates,duration):Array.from({length:frames},()=>d.slice(0,3).map(x=>x.rest));
  body.push({index:i,p,rotation:Array.from({length:frames},()=>d.slice(3).map(x=>x.rest))});
}
const report=encodeSourceBodyRecord({templatePath,recordIndex:record.index,expectedBoneIds:ids,body,frames,outputPath:path.join(__dirname,'source-pose-audit/ringmat-full-span.clips')});
fs.writeFileSync(path.join(__dirname,'source-pose-audit/ringmat-build.json'),JSON.stringify({...report,sourceTracks:27,staticTargetHelpers:1,identityEvidence:'exact source273 track hashes and target name hashes',runtimeValidated:false},null,2));
console.log(report);
