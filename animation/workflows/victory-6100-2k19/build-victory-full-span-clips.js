'use strict';
// Replace the Victory template body and facial records with source-derived 2421-frame records.
// All other 15 records remain byte-identical to the target template.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {parse,build}=require('../../tools/clips-layout');

const root=__dirname;
// Regenerate the semantic root/origin tracks in this target template's ID order
// before consuming the body record. This prevents stale slot-ordered artifacts.
execFileSync(process.execPath,[path.join(root,'build-victory-body-root-order.js')],{stdio:'inherit'});
const targetFile=path.resolve(root,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const bodyFile=path.join(root,'source-pose-audit/body-full-span-victory-id-order.clips');
const facialFile=path.join(root,'source-pose-audit/facial-full-span.clips');
const outFile=path.join(root,'source-pose-audit/14003-full-span.clips');
const reportFile=path.join(root,'source-pose-audit/full-span-clips-report.json');

function payloads(file){
  const bytes=fs.readFileSync(file);
  const layout=parse(bytes,{includeRaw:false});
  return {bytes,layout,payloads:layout.records.map(r=>Buffer.from(bytes.subarray(r.offset,r.offset+r.length)))};
}
const target=payloads(targetFile);
if(target.layout.count!==17)throw new Error(`Expected 17 target records, got ${target.layout.count}`);
const body=payloads(bodyFile);
const facial=payloads(facialFile);
if(body.layout.count!==1||facial.layout.count!==1)throw new Error('Body/facial sources must each be one record');
const bodyLayout=body.layout;
const facialLayout=facial.layout;
if(bodyLayout.records[0].trackIdentifiers.length!==64||bodyLayout.records[0].frameValue!==2421)throw new Error('Body record is not 64-track/2421-frame');
if(facialLayout.records[0].trackIdentifiers.length!==8||facialLayout.records[0].frameValue!==2421)throw new Error('Facial record is not 8-track/2421-frame');
if(bodyLayout.records[0].id!==target.layout.records[15].id)throw new Error('Body record ID does not match target record 15');
if(facialLayout.records[0].id!==target.layout.records[16].id)throw new Error('Facial record ID does not match target record 16');

const payloadsOut=target.payloads.slice();
payloadsOut[15]=body.payloads[0];
payloadsOut[16]=facial.payloads[0];
const out=build(payloadsOut);
const check=parse(out,{includeRaw:false});
if(check.count!==17)throw new Error('Rebuilt container does not contain 17 records');
const changed=[];
for(let i=0;i<17;i++){
  const a=target.payloads[i],b=payloadsOut[i];
  if(!a.equals(b))changed.push(i);
}
if(changed.length!==2||changed[0]!==15||changed[1]!==16)throw new Error(`Unexpected changed records: ${changed}`);
if(check.records[15].frameValue!==2421||check.records[16].frameValue!==2421)throw new Error('Rebuilt frames mismatch');

const report={
  schema:'aurora-forge/victory-full-span-clips/v1',
  target:targetFile,
  output:outFile,
  bytes:out.length,
  records:check.count,
  changed,
  body:{record:15,frames:check.records[15].frameValue,tracks:check.records[15].trackIdentifiers.length,bytes:check.records[15].length,id:check.records[15].id},
  facial:{record:16,frames:check.records[16].frameValue,tracks:check.records[16].trackIdentifiers.length,bytes:check.records[16].length,g38:check.records[16].sections.find(s=>s.name==='group38').count,id:check.records[16].id},
  preserved:{otherRecords:15,camera:true,ring:true,assembly:true}
};
fs.writeFileSync(outFile,out);
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
