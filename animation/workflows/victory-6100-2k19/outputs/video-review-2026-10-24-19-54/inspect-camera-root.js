'use strict';
const fs=require('node:fs');
const {parse}=require('../../../../tools/clips-layout');
const {parseClipsRecordBuffer}=require('../../../../tools/clips-codec/parse-clips-record');
const {evalGroup}=require('../../../../tools/clips-codec/eval-group');
const files=process.argv.slice(2);
for(const file of files){
 const b=fs.readFileSync(file), layout=parse(b,{includeRaw:false});
 const rec=layout.records.find(r=>r.trackIdentifiers.includes('0x1F4DA262FC146772'));
 const p=parseClipsRecordBuffer(b,rec.index), stream=b.subarray(p.base,p.base+p.group.bytes);
 console.log('\n'+file+' record '+rec.id+' frames='+rec.frameValue+' rootIdx='+rec.trackIdentifiers.indexOf('0x1F4DA262FC146772'));
 for(const id of ['0x1F4DA262FC146772','0x11558A1746547CA2','0x9A7CE19BAA54C278']){
  const i=rec.trackIdentifiers.indexOf(id); if(i<0){console.log(id+' missing');continue}
  console.log(id+' idx='+i);
  for(let g=0;g<2;g++){
   const desc=[0,1,2].map(a=>{const x=p.rec.raw.group78[i*6+g*3+a];return{scale:Buffer.from(x.hex.slice(0,2),'hex').readInt8(0),width:parseInt(x.hex.slice(2,4),16),rest:x.candidate.f32le[1]}});
   const rows=evalGroup(stream,p.bones[i].groups[g],desc,rec.frameValue)||[];
   const at=[0,Math.floor((rows.length-1)/4),Math.floor((rows.length-1)/2),Math.floor(3*(rows.length-1)/4),rows.length-1].map(n=>({frame:n,v:rows[n]}));
   console.log(' group'+g+' '+JSON.stringify(at));
  }
 }
}
