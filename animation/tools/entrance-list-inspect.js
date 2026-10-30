'use strict';
// A schema-neutral field inspector. The section-8 schema is not imposed on
// the other sections. Field spans bound reads; padding is not a type claim.
const fs=require('node:fs');
const lib=require('./jsfb-append-lib');
function inspect(buffer) {
 const {root}=lib.readHeader(buffer,'Entr'), rootTable=lib.tableAt(buffer,root);
 if(!rootTable||rootTable.fields.length!==9)throw Error('Unsupported Entr root');
 return rootTable.fields.map(({field:section})=>{
  const v=lib.readVector(buffer,lib.followChain(buffer,root,[section,0]));
  const records=v.tables.map((at,index)=>{
   if(!Number.isSafeInteger(at))throw Error(`Null table in section ${section}`);
   const table=lib.tableAt(buffer,at);if(!table||at+table.osize>buffer.length)throw Error(`Invalid section ${section} table ${index}`);
   return {index,table:at,objectBytes:table.osize,fields:table.fields.map(f=>{
    if(f.at+f.size>buffer.length)throw Error('Field exceeds input');
    return {field:f.field,at:f.at,span:f.size,hex:buffer.subarray(f.at,f.at+f.size).toString('hex'),u8:buffer[f.at],...(f.size>=2?{u16:buffer.readUInt16LE(f.at)}:{}),...(f.size>=4?{u32:buffer.readUInt32LE(f.at)}:{}),...(f.size>=8?{u64:buffer.readBigUInt64LE(f.at).toString()}:{} )};
   })};
  });
  return {section,vector:v.vec,count:v.count,records};
 });
}
function find(buffer,value) {
 if(!Number.isSafeInteger(value)||value<0||value>0xffffffff)throw Error('Search requires uint32');
 return inspect(buffer).flatMap(s=>s.records.filter(r=>r.fields.some(f=>f.u32===value)).map(r=>({section:s.section,...r})));
}
if(require.main===module){try{if(process.argv.length!==4)throw Error('Usage: node entrance-list-inspect.js <Entr.jsfb> <u32>');console.log(JSON.stringify(find(fs.readFileSync(process.argv[2]),Number(process.argv[3])),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={inspect,find};
