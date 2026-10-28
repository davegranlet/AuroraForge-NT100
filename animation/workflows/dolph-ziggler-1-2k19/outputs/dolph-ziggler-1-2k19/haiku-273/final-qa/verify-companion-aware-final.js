'use strict';
const fs=require('fs');
const report=JSON.parse(fs.readFileSync(process.argv[2]||require('path').join(__dirname,'final-candidate-verification.json'),'utf8'));
const changed=[]; const failures=[];
for(const phase of report.phases){
 for(const rec of phase.records){
  if(rec.status==='CHANGED') changed.push({phase:phase.phase,id:rec.id,kind:rec.kind,tracks:rec.tracks});
  if(rec.kind==='body' && rec.status!=='EQUAL-BASELINE') failures.push(`body changed phase ${phase.phase}`);
  if(rec.kind==='facial' && (!rec.facialFrozenEqual || rec.status!=='EQUAL-BASELINE')) failures.push(`facial changed phase ${phase.phase}`);
 }
}
const expected=7;
if(changed.length!==expected) failures.push(`expected ${expected} reviewed companion changes, found ${changed.length}`);
if(changed.some(x=>x.kind!=='companion')) failures.push('non-companion record changed');
const out={schema:'aurora-forge-companion-aware-final-verify/v1',candidate:report.candidate,expectedReviewedCompanionChanges:expected,changed,failures,verdict:failures.length?'FAIL':'PASS'};
fs.writeFileSync(require('path').join(__dirname,'companion-aware-final-verification.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2)); process.exitCode=failures.length?1:0;
