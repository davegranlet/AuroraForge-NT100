'use strict';

// Convert the four fixed-placement Victory6100 companions that are absent from
// the original eight-rope builder. Their 0FOP placements and target clip names
// are measured inputs; untouched target-only helper tracks remain scaffolding.
const fs=require('node:fs'),path=require('node:path');
const {decode}=require('../../tools/yanm-keyframes');
const {readTrackDescriptors}=require('../../tools/clips-codec/read-track-descriptors');
const {parseFile,clipNameId}=require('../../tools/clips-layout');
const {parseClipsRecord}=require('../../tools/clips-codec/parse-clips-record');
const {encodeSourceBodyRecord}=require('../../tools/build-source19-body-clips');
const {readVictoryAuxiliaryPlacements}=require('../../tools/fop19-victory-rope-placement');
const {resolve2k19ExtractPath}=require('../../tools/resolve-2k19-extract-path');

const root=__dirname;
const sourceRoot=path.dirname(resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop'));
const sourceFop=fs.readFileSync(resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop'));
const targetFile=path.resolve(root,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const target=parseFile(targetFile,{includeRaw:false});
const placements=readVictoryAuxiliaryPlacements(sourceFop);
const rootHash=s=>{let h=0;for(const b of Buffer.from(s))h=(((h<<7)|(h>>>25))^b)>>>0;return h.toString(16).padStart(8,'0');};
const output=[];

for(const placement of placements){
 const childDir=path.join(sourceRoot,'children');
 const children=fs.readdirSync(childDir).filter(name=>name.startsWith(`${placement.sourceChild}_`)&&name.endsWith('.bin'));
 if(children.length!==1)throw Error(`Expected one source companion child ${placement.sourceChild}`);
 const source=decode(fs.readFileSync(path.join(childDir,children[0])))[0];
 if(source.tracks.length!==2||source.tracks[0].hash!==rootHash(placement.sourceRootName)||source.tracks.some(t=>t.frameCount!==2420||!t.timelineMatches))throw Error(`Source identity/timeline mismatch for child ${placement.sourceChild}`);
 const clip=`6100_00_r${placement.sourceRootName.slice(-2)}`,id=clipNameId(clip);
 const targetRecords=target.records.filter(r=>r.id===id);
 if(targetRecords.length!==1||targetRecords[0].trackIdentifiers.length!==3)throw Error(`Target clip/track identity is not unique: ${clip}`);
 const rec=targetRecords[0],parsed=parseClipsRecord(targetFile,rec.index),frames=2421,body=[];
 for(let track=0;track<3;track++){
  const d=readTrackDescriptors(parsed,track);
  const p=Array.from({length:frames},()=>d.slice(0,3).map(x=>x.rest));
  const rotation=Array.from({length:frames},()=>d.slice(3,6).map(x=>x.rest));
  if(track===0){
   const position=[placement.position[0],-placement.position[1],placement.position[2]];
   const yaw=-placement.yaw/2;
   for(let frame=0;frame<frames;frame++){p[frame]=position;rotation[frame]=[0,yaw,0];}
  }
  body.push({index:track,p,rotation});
 }
 const outputPath=path.join(root,'source-pose-audit',`auxiliary-${placement.sourceChild}-full-span.clips`);
 const result=encodeSourceBodyRecord({templatePath:targetFile,recordIndex:rec.index,expectedBoneIds:rec.trackIdentifiers,expectedRecordId:rec.id,body,frames,outputPath});
 const targetRootRest=readTrackDescriptors(parsed,0).map(d=>d.rest);
 const convertedRoot=[placement.position[0],-placement.position[1],placement.position[2],0,-placement.yaw/2,0];
 output.push({sourceChild:placement.sourceChild,sourceFile:children[0],sourceRootName:placement.sourceRootName,sourceRootHash:source.tracks[0].hash,placementSection:placement.section,placementRecord:placement.recordIndex,sourcePlacement:placement.position,sourceYaw:placement.yaw,targetClip:clip,targetRecord:rec.index,frames,tracks:result.tracks,outputPath,targetRootRest,convertedRoot,rootPositionMatchesTarget:convertedRoot.slice(0,3).every((v,i)=>Math.abs(v-targetRootRest[i])<0.001),rootRotationMatchesTarget:convertedRoot.slice(3).every((v,i)=>Math.abs(v-targetRootRest[i+3])<0.001),nonRootTargetTracks:'preserved as static target structural scaffolding',limits:['source event timings/visibility behavior remain represented by target ADefs','source local child track 1 is constant-zero in the decoded fixture and target structural channels remain target rest values','converted record is offline development evidence; not runtime-validated']});
}

const report={schema:'aurora-forge-victory-fixed-companions/v1',sourceFop:resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop'),targetFile,companions:output,allOutputRecordsWritten:output.length===4};
fs.writeFileSync(path.join(root,'source-pose-audit/fixed-companion-build.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
