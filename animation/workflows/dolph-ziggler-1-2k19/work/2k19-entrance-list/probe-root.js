'use strict';
const fs=require('node:fs');
const {decode}=require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const {parseFile}=require('C:/AFnt100b3/animation/tools/clips-layout.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const ss=decode(fs.readFileSync('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin'));
const {sample,rv,angle}=require('./probe-interpolation.js');
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const report=[];
for(const [pi,phase]of [100,110,120,130,140].entries()){
 const file=`D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/${phase*10000+273}.clips`,l=parseFile(file,{includeRaw:false}),bi=l.records.reduce((best,x,i)=>x.trackIdentifiers.length>l.records[best].trackIdentifiers.length?i:best,0),r=parseClipsRecord(file,bi),stream=r.file.subarray(r.base,r.base+r.group.bytes);
 const bs={};for(const bone of [0,1,61,62,63]){const d=readTrackDescriptors(r,bone);bs[bone]={p:evalGroup(stream,r.bones[bone].groups[0],d.slice(0,3),r.rec.frameValue)||Array.from({length:r.rec.frameValue},()=>d.slice(0,3).map(x=>x.rest)),r:evalGroup(stream,r.bones[bone].groups[1],d.slice(3,6),r.rec.frameValue)||Array.from({length:r.rec.frameValue},()=>d.slice(3,6).map(x=>x.rest))};}
 const ts=ss[pi*2].tracks;
 const rows=[];
 for(const f of [0,Math.floor((r.rec.frameValue-1)/2),r.rec.frameValue-1]){
 const src=sample(ts[1].secondary.keys,f,'quat'),vec=sample(ts[61].primary.keys,f,'quat'),hip=rv(bs[1].r[f]),root=rv(bs[62].r[f]),origin=rv(bs[63].r[f]);
 rows.push({f,srcHipQ:src,srcVectorQ:vec,native:Object.fromEntries(Object.entries(bs).map(([i,b])=>[i,{p:b.p?.[f],r:b.r?.[f]}])),
 errors:{hip:angle(src,hip),rootHip:angle(src,mul(root,hip)),originHip:angle(src,mul(origin,hip)),vectorHip:angle(src,mul(vec,hip)),vectorRoot:angle(vec,root),vectorOrigin:angle(vec,origin)}});
 }
 report.push({phase,sourceHipsQuant:ts[1].quantizationCandidates,sourceVectorQuant:ts[61].quantizationCandidates,rows});
}
fs.writeFileSync(__dirname+'/root-probe.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
