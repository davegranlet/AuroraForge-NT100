'use strict';

// Corpus-wide evidence audit. It validates that every indexed function has a
// source file and, where Ghidra reported a body, that the function label can be
// located in that file.
const fs = require('fs');
const path = require('path');

const [indexPath, outputPath] = process.argv.slice(2);
if (!indexPath || !outputPath) throw new Error('Usage: node decompilation-evidence-audit.js <function-index.csv> <output.json>');
function csv(line) { const out=[]; let v='', q=false; for(let i=0;i<line.length;i+=1){const c=line[i]; if(c==='"'&&line[i+1]==='"'&&q){v+='"';i+=1;} else if(c==='"')q=!q; else if(c===','&&!q){out.push(v);v='';} else v+=c;} out.push(v); return out; }
const lines=fs.readFileSync(indexPath,'utf8').split(/\r?\n/).filter(Boolean);
const header=csv(lines.shift()).map((v,i)=>i===0?v.replace(/^\uFEFF/,''):v); const col=Object.fromEntries(header.map((v,i)=>[v,i]));
const cache=new Map(); const rows=[];
function sourceRecord(source) {
  if (cache.has(source)) return cache.get(source);
  if (!fs.existsSync(source)) { const missing={ text:null, functions:new Set() }; cache.set(source, missing); return missing; }
  // Read each large decompilation file once and index labels. The previous
  // implementation performed a full-file substring scan for every row.
  const text=fs.readFileSync(source,'utf8');
  const functions=new Set(); const addresses=new Set();
  for (const match of text.matchAll(/===== function=([^\s]+) address=([0-9A-Fa-f]+) /g)) { functions.add(match[1]); addresses.add(match[2].toLowerCase()); }
  for (const match of text.matchAll(/\b(FUN_[0-9A-Fa-f]+)\s*\(/g)) functions.add(match[1]);
  const record={ text, functions, addresses }; cache.set(source, record); return record;
}
for(const line of lines){const f=csv(line); const binary=f[col.output_file], fn=f[col.function_name], address=f[col.address], decompiled=f[col.decompiled]==='True'; const source=path.resolve(path.dirname(indexPath),'ghidra-output',binary); const record=sourceRecord(source); const sourceExists=Boolean(record.text); const bodyFound=Boolean(decompiled&&sourceExists&&(record.addresses.has(address.toLowerCase())||record.functions.has(fn))); rows.push({binary,function:fn,address,decompiled,source,sourceExists,bodyFound,status:!sourceExists?'missing-source':(!decompiled?'no-recovered-body':(bodyFound?'evidence-locatable':'indexed-body-not-found'))});}
const counts={}; for(const row of rows) counts[row.status]=(counts[row.status]||0)+1;
const report={schema:'aurora-forge-evidence-audit/v1',generated:new Date().toISOString(),total:rows.length,counts,files:cache.size,rows};
fs.mkdirSync(path.dirname(path.resolve(outputPath)),{recursive:true}); fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify({output:path.resolve(outputPath),total:report.total,counts,files:report.files}));
