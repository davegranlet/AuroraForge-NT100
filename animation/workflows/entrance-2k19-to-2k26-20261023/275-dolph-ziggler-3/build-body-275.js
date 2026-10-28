'use strict';
const fs=require('node:fs'), path=require('node:path');
const root='C:/nt100-codebasemain';
const work=path.join(root,'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3');
const {decodeEntrance}=require(path.join(root,'animation/tools/decode-2k19-entrance-source.js'));
const {parse}=require(path.join(root,'animation/tools/clips-layout.js'));
const {encodeSourceBodyRecord}=require(path.join(root,'animation/tools/build-source19-body-clips.js'));
const {sourceSha256,phases}=decodeEntrance(path.join(work,'source/275.bin'));
const templates='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const output=path.join(work,'body-clips'); fs.mkdirSync(output,{recursive:true});
const results=[];
for(let p=0;p<5;p++){
 const phase=phases[p], template=path.join(templates,`1${p}00273.clips`), layout=parse(fs.readFileSync(template),{includeRaw:false});
 const matches=layout.records.filter(r=>r.trackIdentifiers.length===64);
 if(matches.length!==1)throw new Error(`phase ${phase.phase}: expected one 64-track body record, got ${matches.length}`);
 const rec=matches[0], out=path.join(output,`1${p}14004-source275-body.clips`);
 const result=encodeSourceBodyRecord({templatePath:template,recordIndex:rec.index,expectedBoneIds:rec.trackIdentifiers,expectedRecordId:rec.id,body:phase.body,frames:phase.frames,outputPath:out});
 const check=parse(fs.readFileSync(out),{includeRaw:false});
 if(check.count!==1||check.records[0].frameValue!==phase.frames||check.records[0].trackIdentifiers.length!==64)throw new Error(`phase ${phase.phase}: structural verify failed`);
 results.push({phase:phase.phase,frames:phase.frames,sourceBodyTracks:62,targetBodyTracks:64,output:out,bytes:fs.statSync(out).size,status:result.status});
}
const report={schema:'aurora-forge-source19-275-body-candidate/v1',sourceSha256,sourceEventId:275,destinationEntry:14004,templateMotion:273,results,limitations:['body-only one-record clip outputs; not registered or packaged','clip identities still require new 14004 registration links','facial converter separate; 119 source YMAM/morph channels remain unmapped','original 2K19 camera/director/object/companion layers not converted','support event timings/phase composition not yet rewritten']};
fs.writeFileSync(path.join(work,'body-clips/body-build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
