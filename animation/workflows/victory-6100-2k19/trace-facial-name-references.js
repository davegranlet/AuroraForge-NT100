'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parsePe,rvaToOffset,offsetToRva,findAll}=require('../../tools/analyze-wwe-pe-xrefs');
const image='C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe',b=fs.readFileSync(image),pe=parsePe(b);
const targets=[];
for(const name of ['au039_l','au038_r','cas_parts'])for(const raw of findAll(b,Buffer.from(name+'\0'))){
 const rva=offsetToRva(pe,raw);if(rva===null)continue;
 targets.push({name,kind:'string',raw,rva,refs:[]});
 const pointer=Buffer.alloc(8);pointer.writeBigUInt64LE(BigInt(pe.imageBase+rva));
 for(const ptrRaw of findAll(b,pointer)){const ptrRva=offsetToRva(pe,ptrRaw);if(ptrRva!==null)targets.push({name,kind:'pointer',raw:ptrRaw,rva:ptrRva,refs:[]});}
}
const byRva=new Map(targets.map(t=>[t.rva,t]));
// The original game code is in .arch; protected appended sections are not decoded here.
const code=pe.sections.find(s=>s.name==='.arch');if(!code)throw Error('No measured game code section');
const tableReferences=[];
for(let raw=code.raw;raw+4<=code.raw+code.rawSize;raw++){
 const endRva=code.rva+raw-code.raw+4,resolved=endRva+b.readInt32LE(raw),target=byRva.get(resolved);
 if(target)target.refs.push({displacementRva:endRva-4,bytes:b.subarray(Math.max(code.raw,raw-4),raw+8).toString('hex')});
 if(resolved>=0x467f800&&resolved<0x4680000)tableReferences.push({targetRva:resolved,displacementRva:endRva-4,bytes:b.subarray(Math.max(code.raw,raw-4),raw+8).toString('hex')});
}
const report={image,imageBytes:b.length,scope:'.arch raw RIP-relative candidate scan; instruction boundary verification required',targets,tableReferences};
fs.writeFileSync(path.join(__dirname,'facial-name-references.json'),JSON.stringify(report,null,2));
console.log(targets.map(t=>({name:t.name,kind:t.kind,rva:t.rva.toString(16),refs:t.refs})));
console.log(tableReferences);
