const fs=require('fs'),path=require('path');
const {parse}=require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const root=path.resolve('outputs/work-order-004-package');
const phases=[];
for(let d=0;d<5;d++){
 const b=fs.readFileSync(path.join(root,`package/Animation/CaeAdvanced/1${d}14002.clips`));
 const c=fs.readFileSync(path.resolve('outputs/dolph-ziggler-1-2k19/body-candidate',`${[100,110,120,130,140][d]}-Dolph-Ziggler-1-body-only.clips`));
 const p=parse(b),q=parse(c),ids=new Set(q.records[0].trackIdentifiers);
 const matches=p.records.filter(r=>r.trackIdentifiers.length===ids.size&&new Set(r.trackIdentifiers).size===ids.size&&r.trackIdentifiers.every(t=>ids.has(t)));
 if(matches.length!==1)throw Error('ambiguous body');
 const r=matches[0],s=q.records[0];const a=b.subarray(r.offset,r.offset+r.length),z=c.subarray(s.offset,s.offset+s.length);
 phases.push({phase:d,uniqueEqualBoneSets:true,bodyBytesAfterIdIdentical:a.subarray(8).equals(z.subarray(8)),newRecordId:r.id,recordCount:p.records.length});
}
const out={scope:'Independent lead verification of saved output, not replay of writer.',phases};
fs.writeFileSync(path.resolve('outputs/dolph-ziggler-1-2k19/WO004-LEAD-INDEPENDENT-CHECK.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
