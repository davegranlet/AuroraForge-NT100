'use strict';
const fs=require('node:fs'),path=require('node:path');
const {decode}=require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const {parseFile}=require('C:/AFnt100b3/animation/tools/clips-layout.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const dir='D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const report={source:[],native:[]};
for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.bin'))){const ss=decode(fs.readFileSync(path.join(dir,file)));report.source.push({file,sections:ss.map((s,i)=>({i,frames:s.tracks[0].frameCount,tracks:s.tracks.map(t=>({i:t.index,hash:t.hash,type:t.type.toString(16),quant:t.quantizationCandidates,first:t.primary?.keys[0],first2:t.secondary?.keys[0],first3:t.tertiary?.keys[0]}))}))});}
const file='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1000273.clips';
const layout=parseFile(file,{includeRaw:false});
for(const rec of layout.records){const r=parseClipsRecord(file,rec.index),stream=r.file.subarray(r.base,r.base+r.group.bytes),bones=[];
for(let bone=0;bone<r.bones.length;bone++){const count=r.rec.raw.group78.length/r.bones.length;const d=r.rec.raw.group78.slice(bone*count,(bone+1)*count).map(e=>({scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]}));bones.push({bone,id:r.bones[bone].id,descs:d,groups:r.bones[bone].groups.map((g,i)=>{const rows=evalGroup(stream,g,d.slice(i*3,i*3+3),r.rec.frameValue);return {skipped:g.skipped,first:rows?.[0],mid:rows?.[180],last:rows?.at(-1)};})});}
report.native.push({record:rec.index,bones});}
fs.writeFileSync(__dirname+'/records-probe.json',JSON.stringify(report,null,2));
for(const s of report.source)console.log(JSON.stringify({file:s.file,first:s.sections[0].tracks.slice(0,3)}));
for(const n of report.native)console.log(JSON.stringify({record:n.record,first:n.bones.slice(0,5)}));
