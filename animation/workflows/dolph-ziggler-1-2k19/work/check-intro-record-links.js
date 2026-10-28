const fs=require('fs'),path=require('path');
const layout=require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const base=path.resolve('outputs/dolph-ziggler-1-2k19');
const dirs=['native-1000273','identity-14002-reopened'];
const native='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1000273.clips';
const swapped='C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode/clips-14002-recordswap/1014002.clips';
const files=[native,swapped].filter(x=>fs.existsSync(x));
const sets=files.map(file=>({file,ids:layout.parse(fs.readFileSync(file)).records.map(r=>r.id)}));
function strings(v,out=[]){if(typeof v==='string')out.push(v);else if(v&&typeof v==='object')for(const x of Object.values(v))strings(x,out);return out;}
const results=[];
for(const dir of dirs){const full=path.join(base,'adefs-editor',dir);const names=new Set();for(const file of fs.readdirSync(full).filter(x=>x.endsWith('.json'))){for(const s of strings(JSON.parse(fs.readFileSync(path.join(full,file),'utf8'))))if(/^(273|14002)_a_/i.test(s))names.add(s);}
for(const name of names)results.push({exportDirectory:dir,name,verbatimId:layout.clipNameId(name),lowercaseId:layout.clipNameId(name.toLowerCase()),matches:sets.map(s=>({file:s.file,verbatim:s.ids.includes(layout.clipNameId(name)),lowercase:s.ids.includes(layout.clipNameId(name.toLowerCase()))}))});}
const out={scope:'Intro only. Exported clip-name strings compared to native and record-swap IDs. Does not prove runtime lookup semantics.',recordSets:sets,results};
fs.writeFileSync(path.join(base,'intro-record-link-independent-check.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
