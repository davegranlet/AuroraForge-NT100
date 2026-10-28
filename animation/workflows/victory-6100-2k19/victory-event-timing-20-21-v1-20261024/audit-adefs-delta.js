'use strict';
const fs=require('node:fs'); const crypto=require('node:crypto');
const {decode}=require('../../../tools/adefs-file');
const {parsePayload}=require('../../../tools/adefs-payload');
const base=process.argv[2], next=process.argv[3], workRoot=process.argv[4], oodlePath=process.argv[5];
const opts={workRoot,oodlePath};
const abuf=decode(fs.readFileSync(base),opts), bbuf=decode(fs.readFileSync(next),opts); const a=parsePayload(abuf.payload), b=parsePayload(bbuf.payload);
const semantic=x=>({version:x.version,arguments:x.arguments,definitions:x.definitions});
const before=semantic(a), after=semantic(b); const states=new Map();
for(const d of after.definitions) for(const s of d.states) states.set(s.fields['3746237326'],s);
const expected=[['14003_20_0_0_0',1,430],['14003_20_0_0_0',2,990],['14003_21_0_0_0',1,404],['14003_21_0_0_0',2,990]];
const applied=[];
for(const [name,ei,value] of expected){const s=states.get(name);if(!s||!s.events[ei]?.triggers?.[0])throw Error('missing expected event '+name+'/'+ei);const actual=s.events[ei].triggers[0].value;s.events[ei].triggers[0].value=before.definitions.flatMap(d=>d.states).find(x=>x.fields['3746237326']===name).events[ei].triggers[0].value;if(actual!==value)throw Error('wrong patched trigger '+name+'/'+ei+': '+actual);applied.push({state:name,eventIndex:ei,restoredForComparisonTo: s.events[ei].triggers[0].value,expectedOutput:value});}
const sameExceptTargeted=JSON.stringify(before)===JSON.stringify(after);
const byteDiffs=[];const n=Math.min(abuf.payload.length,bbuf.payload.length);for(let i=0;i<n;i++)if(abuf.payload[i]!==bbuf.payload[i])byteDiffs.push(i);if(abuf.payload.length!==bbuf.payload.length)byteDiffs.push(`length:${abuf.payload.length}->${bbuf.payload.length}`);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
const report={schema:'aurora-forge/adefs-targeted-event-delta/v1',inputs:{baseline:base,baselineSha256:hash(base),candidate:next,candidateSha256:hash(next)},payloadBytes:{baseline:abuf.payload.length,candidate:bbuf.payload.length},payloadDifferingByteCount:byteDiffs.length,firstDifferingOffsets:byteDiffs.slice(0,32),onlyDocumentedFourEventValuesChanged:sameExceptTargeted,targetedValues:applied,pass:sameExceptTargeted&&byteDiffs.length===14};
if(!report.pass)process.exitCode=1;console.log(JSON.stringify(report,null,2));