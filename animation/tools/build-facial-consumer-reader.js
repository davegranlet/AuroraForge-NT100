'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const curves=JSON.parse(fs.readFileSync('C:\\nt100-codebasemain\\animation\\workflows\\dolph-ziggler-1-2k19\\haiku-273\\worker-13-facial-extra-channels\\ymam-curves-v1.json','utf8'));
const names=[...new Set(curves.phases.flatMap(p=>p.records.map(r=>r.name)))];
const root='D:\\games\\2k26-extracts-2\\aurora-full-extract-v116-20260903-221507\\Root';
const re=names.map(n=>n.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|');
const out='C:\\nt100-codebasemain\\animation\\workflows\\dolph-ziggler-1-2k19\\outputs\\dolph-ziggler-1-2k19\\work-order-20261021\\facial-owned-review-v1\\consumer-reader-v2.json';
const args=['-a','-l','--hidden','--no-ignore','-e',re,root];
let stdout=''; try{stdout=cp.execFileSync('rg',args,{encoding:'utf8',maxBuffer:50*1024*1024,timeout:300000});}catch(e){stdout=e.stdout||'';}
const files=stdout.split(/\r?\n/).filter(Boolean);
const hits=[]; for(const f of files){let b;try{b=fs.readFileSync(f)}catch{continue} for(const n of names){let i=0,c=0,offs=[];const needle=Buffer.from(n);while((i=b.indexOf(needle,i))>=0){c++;offs.push(i);i+=needle.length}if(c)hits.push({sourceName:n,file:f,count:c,offsets:offs.slice(0,8)})}}
const byName={};for(const h of hits)(byName[h.sourceName]??=[]).push(h);
const mappings=names.filter(n=>byName[n]?.length).map(n=>({sourceName:n,evidence:byName[n],status:'candidate-name-hit'}));
const result={schema:'aurora-forge/facial-consumer-reader/v2',method:'bounded exact source-name scan of v116 target extraction',sourceNameCount:names.length,filesContainingAnySourceName:files,mappings,unresolvedSourceNames:names.filter(n=>!byName[n]?.length),warning:'Name hits are consumer evidence candidates only; key assignments require parsing the containing record.'};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'w'});console.log(JSON.stringify({names:names.length,files:files.length,mappings:mappings.length,unresolved:result.unresolvedSourceNames.length,out},null,2));
