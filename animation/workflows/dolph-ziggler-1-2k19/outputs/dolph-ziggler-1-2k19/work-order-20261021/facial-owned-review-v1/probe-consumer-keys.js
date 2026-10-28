'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {readScalarExtras}=require(path.join(process.cwd(),'animation/tools/facial-extra-layout'));
const native='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Animation/CaeAdvanced/1000273.clips';
const keys=new Set(readScalarExtras(fs.readFileSync(native),2).channels.map(c=>c.key));
const report={schema:'aurora-facial-consumer-key-probe/v1',native,keys:keys.size,inputs:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function scan(buffer,begin,length){const hits=[];for(let i=begin;i+4<=begin+length;i++) {const le=buffer.readUInt32LE(i),be=buffer.readUInt32BE(i);if(keys.has(le))hits.push({offset:i,endian:'LE',key:le});if(keys.has(be))hits.push({offset:i,endian:'BE',key:be});}const clusters=[];for(let i=0;i<hits.length;i++){const group=hits.filter(h=>h.offset>=hits[i].offset&&h.offset<hits[i].offset+1024);if(new Set(group.map(h=>h.key)).size>=8)clusters.push(group);}return {hits,clusters};}
for(const ext of ['mcd','ctg']){const file=`D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.${ext}`,b=fs.readFileSync(file);report.inputs.push({file,sha256:hash(b),bytes:b.length,...scan(b,0,b.length)});}
const file='C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe',b=fs.readFileSync(file),pe=b.readUInt32LE(0x3c);
if(b.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('Invalid PE image');
const count=b.readUInt16LE(pe+6),optionalBytes=b.readUInt16LE(pe+20),sectionStart=pe+24+optionalBytes,sections=[];
for(let i=0;i<count;i++){const at=sectionStart+i*40,name=b.toString('ascii',at,at+8).replace(/\0.*$/,''),length=b.readUInt32LE(at+16),begin=b.readUInt32LE(at+20);if(name!=='.rdata')continue;if(begin+length>b.length)throw Error('PE section exceeds file');sections.push({name,begin,length,...scan(b,begin,length)});}
report.inputs.push({file,sha256:hash(b),bytes:b.length,sections});
report.limit='Sparse numeric hits without a bounded key/name record or consumer are coincidences, not mappings. No production mapping is registered.';
fs.writeFileSync(path.join(__dirname,'consumer-key-probe.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report.inputs.map(i=>({file:i.file,bytes:i.bytes,hits:i.hits?.length,clusters:i.clusters?.length,sections:i.sections?.map(s=>({name:s.name,hits:s.hits.length,clusters:s.clusters.length}))})),null,2));
