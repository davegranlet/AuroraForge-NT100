const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {parse}=require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const extraction=JSON.parse(fs.readFileSync('work/offline-cak-verification.json','utf8'));
const root=path.resolve('outputs/work-order-005-package/staging');
const rows=[];
for(const file of extraction.rows.filter(r=>r.verdict==='FAIL')){
 const a=fs.readFileSync(path.join(extraction.extractionRoot,file.file)),b=fs.readFileSync(path.join(root,file.file));
 const p=parse(a),q=parse(b);const allowed=new Set();
 for(let i=0;i<p.records.length;i++)for(let k=0;k<8;k++){allowed.add(0x18+i*16+k);allowed.add(p.records[i].offset+k);}
 const diff=[];for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])diff.push(i);
 const unexpected=diff.filter(i=>!allowed.has(i));
 if(a.length!==b.length||unexpected.length)throw Error('Unexpected content changes '+file.file);
 rows.push({file:file.file,sameLength:a.length===b.length,changedBytes:diff.length,onlyTableAndPayloadIdentityFields:unexpected.length===0,recordLayoutUnchanged:p.records.every((r,i)=>r.offset===q.records[i].offset&&r.length===q.records[i].length),motionBytesUnchanged:true});
}
const out={installedArchiveSha256:crypto.createHash('sha256').update(fs.readFileSync('outputs/baseline-recovery/installed-snapshot/aurora-2k25-replace-mod.cak')).digest('hex'),candidateArchiveSha256:crypto.createHash('sha256').update(fs.readFileSync('outputs/work-order-005-package/aurora-2k25-replace-mod.cak')).digest('hex'),identicalSourcePayloads:extraction.pass,changedFiles:rows,scope:'Installed B644C39E is preserved control, not asserted owner-confirmed playable. Candidate changes identity bytes only in five clips; no motion or registry changes. Runtime unverified.'};
fs.writeFileSync('outputs/baseline-recovery/installed-versus-wo005.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
