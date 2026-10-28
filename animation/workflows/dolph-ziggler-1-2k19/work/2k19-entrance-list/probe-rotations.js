'use strict';
const fs=require('node:fs');
const {decode}=require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const ss=decode(fs.readFileSync('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin'));
const k=Math.PI/65536;
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
function rv(v,factor=1){const a=Math.hypot(...v)*factor,s=a?Math.sin(a/2)/(a/factor):0;return [Math.cos(a/2),...v.map(x=>x*s)];}
function euler(v,order,factor=1){let q=[1,0,0,0];for(const c of order){const a=[Math.cos(v[c]*factor/2),0,0,0];a[c+1]=Math.sin(v[c]*factor/2);q=mul(q,a);}return q;}
function norm(v){const l=Math.hypot(...v);return v.map(x=>x/l);}
function angle(a,b){return 2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,c)=>s+x*b[c],0))))*180/Math.PI;}
const candidates={rv:v=>rv(v),rv2:v=>rv(v,2),tan:v=>norm([1,...v.map(x=>Math.tan(x))]),tanHalf:v=>norm([1,...v.map(x=>Math.tan(x/2))])};
for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(const factor of [1,2])candidates[`euler${order.join('')}:${factor}`]=v=>euler(v,order,factor);
const result=[];
for(const phase of [100,110]){
 const pi=(phase-100)/10,r=parseClipsRecord(`D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/${phase*10000+273}.clips`,0),stream=r.file.subarray(r.base,r.base+r.group.bytes);
 for(const tr of [1,7,8,9,30,31,53,57]){
  const t=ss[pi*2].tracks[tr],keys=(t.type===0x304?t.secondary:t.primary).keys;
  const d=readTrackDescriptors(r,tr),rows=evalGroup(stream,r.bones[tr].groups[1],d.slice(3,6),r.rec.frameValue),scores={};
  for(const key of keys){let words=key.packed.slice(0,3);if(words[0]===-32768&&words[2]===-32768)continue;const v=words.map(x=>x*k),target=rows[key.frame];if(!target)continue;
   for(const targetFactor of [1,2])for(const [name,fn]of Object.entries(candidates)){const label=`${name}/target${targetFactor}`;(scores[label]??=[]).push(angle(fn(v),rv(target,targetFactor)));}}
  const ranked=Object.entries(scores).map(([model,values])=>{values.sort((a,b)=>a-b);return {model,med:values[Math.floor(values.length/2)],p95:values[Math.floor(values.length*.95)],max:values.at(-1)};}).sort((a,b)=>a.med-b.med);
  result.push({phase,track:tr,keys:keys.length,sample:keys[0].packed.slice(0,3),native:rows[0],best:ranked.slice(0,4)});
 }
}
fs.writeFileSync(__dirname+'/rotation-candidates.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
