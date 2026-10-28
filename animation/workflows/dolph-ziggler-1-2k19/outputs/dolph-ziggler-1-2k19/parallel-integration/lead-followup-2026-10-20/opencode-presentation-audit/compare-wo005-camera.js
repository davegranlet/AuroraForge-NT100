'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const base = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19';
const native = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const wo = path.join(base,'parallel-integration/lead-followup-2026-10-20/opencode-presentation-audit/verify-wo005/Animation/CaeAdvanced');
const old = path.join(base,'parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced');
const phases = [{p:100,t:'10',r:3},{p:110,t:'11',r:3},{p:120,t:'12',r:3},{p:130,t:'13',r:4},{p:140,t:'14',r:3}];
function decode(file,ri){const r=parseClipsRecord(file,ri), s=r.file.subarray(r.base,r.base+r.group.bytes), per=r.rec.raw.group78.length/r.rec.trackIdentifiers.length; const get=(t,g,gi)=>{const d=[0,1,2].map(c=>{const e=r.rec.raw.group78[t*per+g*3+c];return {scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]}});return evalGroup(s,r.bones[t].groups[gi],d,r.rec.frameValue)||Array.from({length:r.rec.frameValue},()=>d.map(x=>x.rest));}; return {frames:r.rec.frameValue,tracks:r.rec.trackIdentifiers.map(x=>'0x'+x.toString(16).toUpperCase()),hash:crypto.createHash('sha256').update(s).digest('hex'),bytes:r.group.bytes,groups:[get(0,0,0),get(0,0,1),...(r.rec.trackIdentifiers.length>1?[get(1,0,0)]:[]) ]};}
function diff(a,b){let m=0; for(let i=0;i<Math.min(a.length,b.length);i++)for(let j=0;j<Math.min(a[i].length,b[i].length);j++)m=Math.max(m,Math.abs(a[i][j]-b[i][j]));return +m.toFixed(5)}
const out={schema:'wo005-camera-vs-0fae-native/v1',phases:[]};
for(const x of phases){const files={wo005:path.join(wo,`${x.t}14002.clips`),zeroFAE:path.join(old,`${x.t}14002.clips`),native:path.join(native,`${x.p}0273.clips`)};const d={};for(const [k,v] of Object.entries(files))d[k]=decode(v,x.r);out.phases.push({phase:x.p,records:d,delta:{wo005_vs_0FAE:d.wo005.groups.map((g,i)=>diff(g,d.zeroFAE.groups[i])),wo005_vs_native:d.wo005.groups.map((g,i)=>diff(g,d.native.groups[i])),zeroFAE_vs_native:d.zeroFAE.groups.map((g,i)=>diff(g,d.native.groups[i]))}})}
const outFile=path.join(__dirname,'wo005-camera-compare.json');fs.writeFileSync(outFile,JSON.stringify(out,null,2));for(const x of out.phases)console.log(x.phase,JSON.stringify({frames:Object.fromEntries(Object.entries(x.records).map(([k,v])=>[k,v.frames])),bytes:Object.fromEntries(Object.entries(x.records).map(([k,v])=>[k,v.bytes])),hashes:Object.fromEntries(Object.entries(x.records).map(([k,v])=>[k,v.hash])),delta:x.delta}));console.log('saved',outFile);
