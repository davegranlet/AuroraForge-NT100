'use strict';
// Build rope overlay from the verified 985E custom-entry staging tree.
const fs=require('node:fs'),path=require('node:path');
const L=require('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');
const source=path.resolve('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/work-order-20261021/candidate-reproduction-v1/builds/p14002-workorder-20261021-direct-root-v2/staging');
const root=path.join(__dirname,'out','rope-only-from-985e-final-20261022');
const overlay=path.join(__dirname,'out','applied-rope-only','1314002.clips');
const cak=path.join(__dirname,'out','rope-only-from-985e-20261022','aurora-2k25-replace-mod.cak');
if(fs.existsSync(root)||fs.existsSync(cak)) throw Error('immutable output exists');
fs.cpSync(source,root,{recursive:true}); fs.copyFileSync(overlay,path.join(root,'Animation','CaeAdvanced','1314002.clips'));
const b=L.repackager.buildCak(root,cak,{}); const report={schema:'aurora-forge-rope-only-from-985e/v1',source,candidate:cak,candidateSha256:L.sha256(cak),bytes:b.bytes,members:b.fileCount,archiveKey:'0x'+b.archiveKey.toString(16).toUpperCase(),sourceSdbSha256:L.sha256(path.join(source,'Sdb','ENG.sdb')),changedMembers:['Animation/CaeAdvanced/1314002.clips'],status:'offline-only'};
fs.writeFileSync(path.join(root,'BUILD-REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'}); console.log(JSON.stringify(report,null,2));
