'use strict';
const fs=require('node:fs');
const path=require('node:path');
function usage(){console.error('usage: node facial-consumer-dictionary.js --source <ymam-curves-v1.json> --consumer <consumer-full-index-map.json> --out <dictionary.json>');process.exit(2)}
function arg(name){const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]}
const source=arg('--source'), consumer=arg('--consumer'), out=arg('--out'); if(!source||!consumer||!out)usage();
const s=JSON.parse(fs.readFileSync(source,'utf8')); const c=JSON.parse(fs.readFileSync(consumer,'utf8'));
const records=(s.phases?.[0]?.records)||s.records; if(!Array.isArray(records))throw Error('source has no phase records');
const rows=c.rows; if(!Array.isArray(rows))throw Error('consumer map has no rows');
if(records.length!==119||rows.length!==119)throw Error(`expected 119 rows; source=${records.length} consumer=${rows.length}`);
const entries=records.map((r,i)=>{const m=rows[i]; if(m.i!==i||m.name!==r.name)throw Error(`row mismatch at ${i}: ${r.name}/${m.name}`); return {sourceIndex:i,sourceName:r.name,target:{kind:m.match?'facial-slot':'stack-record',index:i,token:m.token,prefix:m.prefix,verified:m.match===true},status:m.match?'verified-index':'stack-slot-unresolved'};});
const result={schema:'aurora-forge-facial-consumer-dictionary/v1',tool:'animation/tools/facial-consumer-dictionary.js',source:{path:path.resolve(source),curveCount:records.length},consumer:{path:path.resolve(consumer),rowCount:rows.length},entries,counts:{total:entries.length,verified:entries.filter(x=>x.status==='verified-index').length,stackUnresolved:entries.filter(x=>x.status==='stack-slot-unresolved').length},policy:'stack-record entries are emitted explicitly and never treated as verified facial slots'};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');console.log(JSON.stringify({out,counts:result.counts},null,2));
