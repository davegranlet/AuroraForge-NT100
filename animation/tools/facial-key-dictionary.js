'use strict';
const {parse}=require('./clips-layout');
// Reflected CRC32C, initial/final XOR ffffffff. Case is significant.
function facialNameKey(name){
 if(typeof name!=='string'||!name.length||name.length>128||/[^\x20-\x7e]/.test(name))throw Error('Invalid facial channel name');
 let value=0xffffffff;
 for(const byte of Buffer.from(name,'ascii')){
  value^=byte;
  for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0x82f63b78:0);
 }
 return (~value)>>>0;
}
function readFacialKeyDictionary(buffer,recordIndex,names){
 const record=parse(buffer,{includeRaw:false}).records[recordIndex];
 if(!record||record.trackIdentifiers.length!==8)throw Error('Expected an eight-bone facial record');
 const section=record.sections.find(s=>s.name==='group38');
 if(!section||section.count!==720)throw Error('Unsupported facial key profile');
 const offset=record.offset+parseInt(section.relativeOffset,16);
 const keys=Array.from({length:720},(_,index)=>({index,key:buffer.readUInt32LE(offset+index*4)}));
 if(new Set(keys.map(r=>r.key)).size!==keys.length)throw Error('Duplicate target facial keys');
 const candidates=new Map();
 for(const name of new Set(names)){
  const key=facialNameKey(name);
  if(candidates.has(key)&&candidates.get(key)!==name)throw Error('Ambiguous name hash collision');
  candidates.set(key,name);
 }
 const entries=keys.map(row=>({...row,name:candidates.get(row.key)||null,status:candidates.has(row.key)?'exact CRC32C name-key match':'unresolved'}));
 return {schema:'aurora-facial-key-dictionary/v1',recordIndex,algorithm:'CRC32C UTF-8/ASCII, case-sensitive, initial/final XOR ffffffff',matched:entries.filter(r=>r.name!==null).length,total:720,entries,limits:['Name hash identity does not establish source expression equivalence','No source-to-target mapping or payload mutation is performed']};
}
module.exports={facialNameKey,readFacialKeyDictionary};
