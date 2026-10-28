'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parse}=require('../../tools/clips-layout');
const {facialNameKey,readFacialKeyDictionary}=require('../../tools/facial-key-dictionary');
const target=path.resolve(__dirname,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const modelNames=path.resolve(__dirname,'../dolph-ziggler-1-2k19/haiku-273/worker-13-facial-extra-channels/mcd-contiguous-name-list.json');
const bytes=fs.readFileSync(target),record=parse(bytes,{includeRaw:false}).records[16],section=record.sections.find(s=>s.name==='group38'),offset=record.offset+parseInt(section.relativeOffset,16);
const keys=new Set(Array.from({length:720},(_,i)=>bytes.readUInt32LE(offset+i*4))),names=new Set(),provenance={};
function candidate(name,evidence){if(keys.has(facialNameKey(name))){names.add(name);provenance[name]??=evidence;}}
for(const name of JSON.parse(fs.readFileSync(modelNames)))candidate(name,'existing model string inventory');
for(let number=0;number<250;number++)for(const type of ['au','ad'])for(const suffix of ['l','r','u','t','b','lt','rt','lb','rb','ct','cb',''])candidate(type+String(number).padStart(3,'0')+(suffix?'_'+suffix:''),'bounded AU/AD name-family key match');
const base=[...names].filter(n=>!n.includes('__'));
for(const a of base)for(const b of base)if(a!==b)candidate(a+'__'+b,'two-factor corrective name/key match');
for(let factors=2;factors<=3;factors++){
 const known=[...names].filter(n=>n.split('__').length===factors);
 for(const pair of known)for(const name of base){
  candidate(pair+'__'+name,`${factors+1}-factor corrective name/key match`);
  candidate(name+'__'+pair,`${factors+1}-factor corrective name/key match`);
 }
}
const result=readFacialKeyDictionary(bytes,16,[...names]);
result.target=target;result.modelNameEvidence=modelNames;
result.entries=result.entries.map(row=>({...row,nameEvidence:row.name?provenance[row.name]:null}));
result.sourceExpressionMappingEstablished=false;
const output=path.join(__dirname,'victory-facial-key-dictionary-current.json');
fs.writeFileSync(output,JSON.stringify(result,null,2));
console.log({output,matched:result.matched,total:result.total,unresolved:result.entries.filter(r=>!r.name).map(r=>r.index)});
