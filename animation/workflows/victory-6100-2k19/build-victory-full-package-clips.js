'use strict';
// Full source-derived Victory clip container: body, face, ring mat, all twelve
// mapped ring companions, and the Camera01/target pair in the c0 record.
// One unreferenced target assembly/helper record remains structural scaffolding.
const fs=require('node:fs');
const path=require('node:path');
const {parse,build}=require('../../tools/clips-layout');
const {retimeClips}=require('../../tools/clips-codec/retime-clips-records');
const {resolve2k19ExtractPath}=require('../../tools/resolve-2k19-extract-path');
const {convertSourceCameraRecord}=require('../../tools/build-source19-camera-clips');

const root=__dirname;
const targetFile=path.resolve(root,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const audit=path.join(root,'source-pose-audit');
const outFile=path.join(audit,'14003-full-package.clips');
const reportFile=path.join(audit,'full-package-clips-report.json');

const cameraSource=resolve2k19ExtractPath('_work/6100/children/1_01_F65A2B0D51E5786C.unpacked_entry_1_(ZLIB).bin');
const cameraTemplate=path.resolve(root,'candidate-victory-duration-aligned/Animation/Victory/14003.clips');
const cameraOutput=path.join(audit,'camera-c0-full-span.clips');
const cameraReport=convertSourceCameraRecord({sourcePath:cameraSource,templatePath:cameraTemplate,targetRecordIndex:14,outputPath:cameraOutput});
fs.writeFileSync(path.join(audit,'camera-c0-full-span.json'),JSON.stringify(cameraReport,null,2)+'\n');

function readContainer(file){
  const bytes=fs.readFileSync(file), layout=parse(bytes,{includeRaw:false});
  if(layout.count!==1)throw new Error(`${file}: expected one record`);
  return {bytes,layout,payload:Buffer.from(bytes.subarray(layout.records[0].offset,layout.records[0].offset+layout.records[0].length))};
}
const targetBytes=fs.readFileSync(targetFile), target=parse(targetBytes,{includeRaw:false});
if(target.count!==17)throw new Error('Target is not 17 records');
const replacements=new Map([
  [1,path.join(audit,'auxiliary-13-full-span.clips')],
  [3,path.join(audit,'auxiliary-14-full-span.clips')],
  [4,path.join(audit,'auxiliary-8-full-span.clips')],
  [8,path.join(audit,'auxiliary-7-full-span.clips')],
  [0,path.join(audit,'side-12-full-span.clips')],
  [5,path.join(audit,'side-11-full-span.clips')],
  [6,path.join(audit,'side-10-full-span.clips')],
  [7,path.join(audit,'side-9-full-span.clips')],
  [9,path.join(audit,'corner-6-full-span.clips')],
  [10,path.join(audit,'corner-5-full-span.clips')],
  [11,path.join(audit,'corner-4-full-span.clips')],
  [12,path.join(audit,'corner-3-full-span.clips')],
  [13,path.join(audit,'ringmat-full-span.clips')],
  [14,path.join(audit,'camera-c0-full-span.clips')],
  [15,path.join(audit,'body-full-span.clips')],
  [16,path.join(audit,'facial-full-span.clips')]
]);
const payloads=target.records.map(r=>Buffer.from(targetBytes.subarray(r.offset,r.offset+r.length)));
const changed=[];
for(const [index,file] of replacements){
  const replacement=readContainer(file),r=replacement.layout.records[0],expected=target.records[index];
  if(r.frameValue!==2421)throw new Error(`${file}: frames ${r.frameValue} != 2421`);
  if(r.id!==expected.id)throw new Error(`${file}: record id ${r.id} != target ${expected.id}`);
  if(r.trackIdentifiers.length!==expected.trackIdentifiers.length)throw new Error(`${file}: track count mismatch`);
  payloads[index]=replacement.payload;
  changed.push(index);
}
const assembled=build(payloads);
const retimed=retimeClips(assembled,2421,[2]);
const out=retimed.output,check=parse(out,{includeRaw:false});
if(check.count!==17)throw new Error('Rebuilt container does not contain 17 records');
if(check.records.some(r=>r.frameValue!==2421))throw new Error('A record does not match the 2421-sample source timeline');
const report={
  schema:'aurora-forge/victory-full-package-clips/v1',
  target:targetFile,
  output:outFile,
  bytes:out.length,
  records:check.count,
  replaced:changed.map(i=>({record:i,frames:check.records[i].frameValue,tracks:check.records[i].trackIdentifiers.length,bytes:check.records[i].length,id:check.records[i].id})),
  retimedTemplateCompanions:retimed.reports,
  allRecordsMatchSourceSampleCount:check.records.every(r=>r.frameValue===2421),
  scope:'16 records contain source-derived body, face, ring mat, twelve ring-companion transforms, and Camera01/target camera data. One unreferenced target assembly/helper record (2) is retained and time-scaled from 1755 to 2421 samples; target-only c0 auxiliary channel is retained from the existing 2421-sample candidate.'
};
fs.writeFileSync(outFile,out);
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
