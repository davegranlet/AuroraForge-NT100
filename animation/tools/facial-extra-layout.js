'use strict';
const fs=require('node:fs');
const {parse}=require('./clips-layout');
const {BitReader}=require('./clips-codec/bit-reader');
const {parseTimingGroup}=require('./clips-codec/parse-timing-group');
class BoundedBits extends BitReader {
 read(n){if(!Number.isInteger(n)||n<0||n>32||!Number.isSafeInteger(this.pos)||this.pos<0||this.pos+n>this.buf.length*8)throw Error('Facial bit read exceeds stream');return super.read(n);}
}
function inspectFacial(buffer,recordIndex) {
 const layout=parse(buffer,{includeRaw:true}),record=layout.records[recordIndex];
 if(!record)throw Error('Facial record index is out of range');
 const section=name=>{const s=record.sections.find(s=>s.name===name);if(!s)throw Error(`Missing ${name}`);return s;};
 const payload=buffer.subarray(record.offset,record.offset+record.length),descriptorSection=section('group78 descriptors'),keysSection=section('group38'),streamSection=section('group90');
 const descriptorBase=parseInt(descriptorSection.relativeOffset,16),keyBase=parseInt(keysSection.relativeOffset,16),streamBase=parseInt(streamSection.relativeOffset,16),stream=payload.subarray(streamBase,streamBase+streamSection.bytes);
 const boneDescriptors=record.trackIdentifiers.length*6,extraCount=record.raw.group78.length-boneDescriptors;
 if(record.trackIdentifiers.length!==8||extraCount!==720||keysSection.bytes!==extraCount*4)throw Error('Unsupported 8-bone/720-extra facial profile');
 const descriptor=i=>{const at=descriptorBase+i*8,scale=payload.readInt8(at),width=payload[at+1],rest=payload.readFloatLE(at+4);if(width>32||!Number.isFinite(rest))throw Error('Invalid facial descriptor');return {scale,width,rest};};
 const rd=new BoundedBits(stream),boneGroups=[];
 for(let i=0;i<boneDescriptors;i+=3){const ds=[descriptor(i),descriptor(i+1),descriptor(i+2)];const group=parseTimingGroup(rd,record.frameValue,ds.map(d=>d.width));if(!Number.isSafeInteger(rd.pos)||rd.pos<0||rd.pos>stream.length*8)throw Error('Facial bone group exceeds stream');boneGroups.push(group);}
 const declaredPrefixBits=payload.readUInt32LE(0x9c);
 if(rd.pos!==declaredPrefixBits)throw Error(`Facial bone prefix mismatch: ${rd.pos} != ${declaredPrefixBits}`);
 const channels=Array.from({length:extraCount},(_,i)=>({index:i,key:payload.readUInt32LE(keyBase+i*4),...descriptor(boneDescriptors+i)}));
 const denseExtraBits=channels.reduce((n,c)=>n+c.width*record.frameValue,0),dataEndBits=declaredPrefixBits+denseExtraBits,totalBits=stream.length*8,paddingBits=totalBits-dataEndBits;
 if(paddingBits<0||paddingBits>63||Math.ceil(dataEndBits/64)*64!==totalBits)throw Error('Dense facial extra accounting does not align to uint64 stream');
 for(let i=dataEndBits;i<totalBits;i++)if((stream[i>>3]>>(i&7))&1)throw Error('Nonzero unexplained facial trailing bit');
 return {schema:'aurora-facial-extra-layout/v1',recordIndex,trackIds:record.trackIdentifiers,frames:record.frameValue,channels,boneGroups,bonePrefixBits:declaredPrefixBits,denseExtraBits,dataEndBits,totalBits,paddingBits,paddingAllZero:true,boundaryExact:true,channelOrder:'UNRESOLVED: dense bit budget proves storage extent, not scalar/triple ordering or name mapping'};
}
// Independent supplied-writer evidence: FUN_140031cb0, scalar loop following
// the bone loop (saved decompilation lines 1460..1620), writes all frames of one
// extra channel before advancing to the next descriptor. No timing header.
function readScalarExtras(buffer,recordIndex) {
 const report=inspectFacial(buffer,recordIndex),record=parse(buffer,{includeRaw:true}).records[recordIndex];
 const section=record.sections.find(s=>s.name==='group90'),base=record.offset+parseInt(section.relativeOffset,16);
 const rd=new BoundedBits(buffer.subarray(base,base+section.bytes));rd.pos=report.bonePrefixBits;
 const channels=report.channels.map(c=>{
  const bitStart=rd.pos;
  const values=c.width?Array.from({length:report.frames},()=>c.rest+rd.read(c.width)*2**c.scale):[c.rest];
  return {...c,bitStart,bitEnd:rd.pos,static:c.width===0,values};
 });
 if(rd.pos!==report.dataEndBits)throw Error('Scalar extra decode extent mismatch');
 return {...report,channels,channelOrder:'scalar-major: one complete sample series per descriptor',mapping:'UNRESOLVED: numeric keys are not named source mappings'};
}
module.exports={inspectFacial,readScalarExtras,BoundedBits};
if(require.main===module){try{const [input,index]=process.argv.slice(2);if(index===undefined)throw Error('Usage: node facial-extra-layout.js <input.clips> <record-index>');console.log(JSON.stringify(inspectFacial(fs.readFileSync(input),Number(index)),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
