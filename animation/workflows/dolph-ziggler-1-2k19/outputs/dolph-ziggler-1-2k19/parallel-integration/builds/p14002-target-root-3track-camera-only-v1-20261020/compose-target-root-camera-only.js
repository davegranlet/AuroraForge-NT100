'use strict';
const fs=require('fs'),path=require('path');
const L=require('../../lib/integration.js');
const clips=require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const root='C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration';
const buildRoot=__dirname;
const baseRoot=path.join(root,'builds/p14002-pairfix-v2');
const baseCak=path.join(baseRoot,'aurora-2k25-replace-mod.cak');
const cameraManifest=path.join(root,'build-inputs/p14002-cam-B-target-root-v1-20261020/components.camera-B-target-root.json');
const cameraVerify='C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/final-camera/discriminators-verification.json';
const req={
 '100':['10','1014002.clips','0xC7FAC19AFC229E67'],
 '110':['11','1114002.clips','0xC9DE73B1CD43DA22'],
 '120':['12','1214002.clips','0x55401F660E2FD834'],
 '130':['13','1314002.clips','0xFDC4CD4CC8556CD9'],
 '140':['14','1414002.clips','0xBACE2D2FE87E7289']
};
for(const p of [baseCak,cameraManifest,cameraVerify])if(!fs.existsSync(p))throw Error('missing required pinned input: '+p);
const baseCakSha=L.sha256(baseCak);if(baseCakSha!=='0faead25f8033225e1479af07a49ef6cad65c16945c3ab2eeec40de9b6e6d0a1')throw Error('0FAE baseline hash mismatch: '+baseCakSha);
const cm=JSON.parse(fs.readFileSync(cameraManifest,'utf8'));if(!Array.isArray(cm.phases)||cm.build.motionId!==14002)throw Error('camera manifest contract mismatch');
const cv=JSON.parse(fs.readFileSync(cameraVerify,'utf8'));const bChecks=cv.variants&&cv.variants.B;if(cv.pass!==true||!Array.isArray(bChecks)||bChecks.length!==5||bChecks.some(x=>x.pass!==true||x.structural!==true||x.othersIdentical!==true||x.err.posVsBase!==0||x.err.rotVsBase!==0||x.err.t2VsBase!==0||!Number.isFinite(x.err.tgtVsIntended)||x.err.tgtVsIntended>0.001))throw Error('camera B verification failed one or more phase gates');
const baseIntent=JSON.parse(fs.readFileSync(path.join(baseRoot,'build-intent.json'),'utf8'));
const merge=JSON.parse(fs.readFileSync(path.join(baseRoot,'merge-report.json'),'utf8'));
const staging=path.join(buildRoot,'staging');if(fs.existsSync(staging))throw Error('candidate staging already exists');
fs.cpSync(path.join(baseRoot,'staging'),staging,{recursive:true,errorOnExist:true,force:false});
const phaseReports=[];
for(const [phase,[phaseDir,file,cameraId]]of Object.entries(req)){
 const phaseSpec=cm.phases.find(x=>String(x.phase)===phase);if(!phaseSpec)throw Error('missing B camera phase '+phase);
 const overlay=phaseSpec.overlays.find(x=>x.component==='camera');if(!overlay)throw Error('missing camera overlay phase '+phase);
 const overlayBytes=fs.readFileSync(overlay.path),overlaySha=L.sha256(overlay.path);if(overlay.sha256!==overlaySha)throw Error('B overlay hash mismatch phase '+phase);
 const ob=clips.parse(overlayBytes,{includeRaw:false});if(ob.count!==1)throw Error('camera overlay is not single-record phase '+phase);
 const or=ob.records[0];if(or.id!==cameraId||or.trackIdentifiers.length!==3)throw Error('B camera id/topology mismatch phase '+phase);
 const candidateFile=path.join(staging,'Animation/CaeAdvanced',file);const baseBytes=fs.readFileSync(candidateFile);const base=clips.parse(baseBytes,{includeRaw:false});
 const br=base.records.find(r=>r.id===cameraId);if(!br||br.trackIdentifiers.length!==3)throw Error('0FAE camera id/topology mismatch phase '+phase);
 if(br.frameValue!==or.frameValue||JSON.stringify(br.trackIdentifiers)!==JSON.stringify(or.trackIdentifiers))throw Error('camera frame/track order mismatch phase '+phase);
 const payloads=base.records.map(r=>baseBytes.subarray(r.offset,r.offset+r.length));payloads[br.index]=overlayBytes.subarray(or.offset,or.offset+or.length);
 const built=clips.build(payloads);fs.writeFileSync(candidateFile,built);
 const after=clips.parse(built,{includeRaw:false});const changed=[];
 for(const r of base.records){const nr=after.records.find(x=>x.id===r.id);if(!nr||nr.sha256!==r.sha256)changed.push(r.id);}
 if(JSON.stringify(changed)!==JSON.stringify([cameraId]))throw Error('more than camera record changed phase '+phase+': '+changed.join(','));
 const out=after.records.find(r=>r.id===cameraId);if(out.sha256!==or.sha256)throw Error('inserted B camera record differs from overlay phase '+phase);
 const phaseMerge=merge.phases.find(x=>String(x.phase)===phase);if(!phaseMerge)throw Error('missing base merge phase '+phase);
 const prev=phaseMerge.overlays.findIndex(x=>x.component==='camera');if(prev>=0)phaseMerge.overlays.splice(prev,1);
 phaseMerge.overlays.push({component:'camera-target-root',recordIndex:br.index,status:overlay.status,provenance:overlay.provenance,path:overlay.path,tracks:3,overlaySha256:overlaySha,payloadBytesBeyondIdIdentical:false});
 phaseMerge.outputSha256=L.sha256(candidateFile);phaseMerge.outputBytes=built.length;
 const led=phaseMerge.recordLedger.find(x=>x.index===br.index);if(led){led.source='camera-target-root-overlay';led.componentStatus=overlay.status;led.componentProvenance=overlay.provenance;}
 if(Array.isArray(phaseMerge.nativePreservedRecords))phaseMerge.nativePreservedRecords=phaseMerge.nativePreservedRecords.filter(x=>x.index!==br.index&&x.id!==cameraId);
 phaseReports.push({phase,phaseDir,file,cameraId,frameValue:out.frameValue,tracks:out.trackIdentifiers,baselineRecordSha256:br.sha256,cameraOverlaySha256:overlaySha,outputRecordSha256:out.sha256,baselineClipSha256:base.sha256,outputClipSha256:L.sha256(candidateFile),changedRecordIds:changed});
}
const intent={...baseIntent,buildId:path.basename(buildRoot),generated:new Date().toISOString(),manifest:cameraManifest,manifestHash:L.sha256(cameraManifest),members:baseIntent.members.map(m=>({...m}))};
for(const row of intent.members){const m=phaseReports.find(x=>'Animation/CaeAdvanced/'+x.file===row.archive);if(m){const f=path.join(staging,...row.archive.split('/'));row.sha256=L.sha256(f);row.bytes=fs.statSync(f).size;row.status='0FAE package + verified B target-root camera record; all other phase records preserved';}}
L.writeJsonBomFree(path.join(buildRoot,'build-intent.json'),intent);L.writeJsonBomFree(path.join(buildRoot,'merge-report.json'),merge);
const composition={schema:'aurora-forge-target-root-camera-only-composition/v1',generated:new Date().toISOString(),baseline:{cak:baseCak,sha256:baseCakSha},cameraManifest:{path:cameraManifest,sha256:L.sha256(cameraManifest),verification:cameraVerify,verificationSha256:L.sha256(cameraVerify),pass:cv.pass,variantBChecks:bChecks},claim:'B target-only root-aim camera record inserted into exact 0FAE pairfix-v2 package; all other records and CAK members intended unchanged.',phases:phaseReports};
L.writeJsonBomFree(path.join(buildRoot,'composition.json'),composition);
const cak=path.join(buildRoot,'aurora-2k25-replace-mod.cak');const bake=L.repackager.buildCak(staging,cak,{});const cakSha=L.sha256(cak);
const buildReport={schema:'aurora-forge-integration-build/v1',buildId:path.basename(buildRoot),buildRoot,cak,cakSha256:cakSha,cakBytes:bake.bytes,archiveKey:'0x'+bake.archiveKey.toString(16).toUpperCase(),members:bake.fileCount,tdb:bake.textureDatabase,baselineCakSha256:baseCakSha,cameraVerification:'15/15 PASS'};L.writeJsonBomFree(path.join(buildRoot,'build-report.json'),buildReport);
console.log(JSON.stringify({buildId:buildReport.buildId,cak,cakSha256:cakSha,cakBytes:bake.bytes,archiveKey:buildReport.archiveKey,members:bake.fileCount,phases:phaseReports.map(p=>({phase:p.phase,cameraId:p.cameraId,tracks:p.tracks.length,frame:p.frameValue,changedRecords:p.changedRecordIds.length}))},null,2));
