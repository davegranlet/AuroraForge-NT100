'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parseFile,clipNameId}=require('../../tools/clips-layout');
const target=path.resolve(__dirname,'../../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const bytes=fs.readFileSync(target),record=parseFile(target,{includeRaw:false}).records[16];
const section=record.sections.find(s=>s.name==='group38'),offset=record.offset+parseInt(section.relativeOffset,16);
const keys=new Map(Array.from({length:section.count},(_,i)=>[bytes.readUInt32LE(offset+i*4),i]));
function crc(s,polynomial){let h=0xffffffff;for(const c of Buffer.from(s)){h^=c;for(let k=0;k<8;k++)h=(h>>>1)^((h&1)?polynomial:0);}return (~h)>>>0;}
function fnv(s,first){let h=2166136261;for(const c of Buffer.from(s))h=first?(Math.imul(h,16777619)^c)>>>0:Math.imul(h^c,16777619)>>>0;return h;}
function rotate(s){let h=0;for(const c of Buffer.from(s))h=(((h<<7)|(h>>>25))^c)>>>0;return h;}
const algorithms={crc32:s=>crc(s,0xedb88320),crc32c:s=>crc(s,0x82f63b78),fnv1a:s=>fnv(s,false),fnv1:s=>fnv(s,true),sourceRotate:rotate,fnv64low:s=>Number(BigInt(clipNameId(s))&0xffffffffn),fnv64high:s=>Number(BigInt(clipNameId(s))>>32n)};
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'source-pose-audit/victory-morph-curves.json'))).parsed.curves;
const suffixes=['',...['_','.','/',':',' '].flatMap(sep=>['x','y','z','X','Y','Z','0','1','2','3','4','5'].map(c=>sep+c))];
const prefixes=['','M_Head.','M_Head/','M_Head_','M_Head:','M_Head '],matches=[];
let candidates=0;
for(const curve of source)for(const prefix of prefixes)for(const suffix of suffixes)for(const value of new Set([prefix+curve.name+suffix,(prefix+curve.name+suffix).toLowerCase(),(prefix+curve.name+suffix).toUpperCase()]))for(const [algorithm,hash] of Object.entries(algorithms)){
 candidates++;const key=hash(value);if(keys.has(key))matches.push({sourceName:curve.name,algorithm,value,key,targetIndex:keys.get(key)});
}
const report={status:'exact candidate hash hits only; no mappings assigned',candidates,targetKeys:keys.size,matches};
fs.writeFileSync(path.join(__dirname,'morph-key-name-audit.json'),JSON.stringify(report,null,2));
console.log({candidates,targetKeys:keys.size,hits:matches.length,sample:matches.slice(0,8)});
