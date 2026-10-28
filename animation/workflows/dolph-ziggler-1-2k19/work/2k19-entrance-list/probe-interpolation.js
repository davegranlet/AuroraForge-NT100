'use strict';
const fs=require('node:fs');
const {decode}=require('C:/AFnt100b3/animation/tools/yanm-keyframes.js');
const {parseFile}=require('C:/AFnt100b3/animation/tools/clips-layout.js');
const {parseClipsRecord}=require('C:/AFnt100b3/animation/tools/clips-codec/parse-clips-record.js');
const {readTrackDescriptors}=require('C:/AFnt100b3/animation/tools/clips-codec/read-track-descriptors.js');
const {evalGroup}=require('C:/AFnt100b3/animation/tools/clips-codec/eval-group.js');
const ss=decode(fs.readFileSync('D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin'));
const k=Math.PI/65536;
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
function rv(v){const a=Math.hypot(...v),s=a?Math.sin(a)/a:0;return [Math.cos(a),...v.map(x=>x*s)];}
function euler(v){let q=[1,0,0,0];for(const c of [2,1,0]){const a=[Math.cos(v[c]*k),0,0,0];a[c+1]=Math.sin(v[c]*k);q=mul(q,a);}return q;}
function norm(v){const l=Math.hypot(...v);return v.map(x=>x/l);}
function angle(a,b){return 2*Math.acos(Math.min(1,Math.abs(a.reduce((s,x,c)=>s+x*b[c],0))))*180/Math.PI;}
const near=(v,r)=>v+Math.round((r-v)/65536)*65536;
function sample(keys,f,mode){
 let i=0;while(i+1<keys.length && keys[i+1].frame<=f)i++;
 const a=keys[i],b=keys[Math.min(i+1,keys.length-1)],t=a.frame===b.frame?0:(f-a.frame)/(b.frame-a.frame);
 const lerp=(q0,q1,t)=>{if(q0.reduce((s,x,c)=>s+x*q1[c],0)<0)q1=q1.map(x=>-x);return norm(q0.map((x,c)=>x*(1-t)+q1[c]*t));};
 if(mode==='quat'||mode==='quatBezier'||mode==='squad'){
  const q0=euler(a.packed.slice(0,3)),q3=euler(b.packed.slice(0,3));
  if(mode==='quat'||a.packed.length!==9)return lerp(q0,q3,t);
  const q1=euler(a.packed.slice(6,9)),q2=euler(b.packed.slice(3,6));
  if(mode==='squad')return lerp(lerp(q0,q3,t),lerp(q1,q2,t),2*t*(1-t));
  return lerp(lerp(lerp(q0,q1,t),lerp(q1,q2,t),t),lerp(lerp(q1,q2,t),lerp(q2,q3,t),t),t);
 }
 const v=[0,1,2].map(c=>{
  const p0=a.packed[c],p3=near(b.packed[c],p0);
  if(mode==='linear'||a.packed.length!==9)return p0*(1-t)+p3*t;
  const p1=near(a.packed[(mode==='bezier'?6:3)+c],p0),p2=near(b.packed[(mode==='bezier'?3:6)+c],p3);
  return p0*(1-t)**3+3*p1*(1-t)**2*t+3*p2*(1-t)*t*t+p3*t**3;
 });return euler(v);
}
const report=[];
for(const [pi,phase]of [100,110,120,130,140].entries()){
 const file=`D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/${phase*10000+273}.clips`,l=parseFile(file,{includeRaw:false}),bi=l.records.reduce((best,x,i)=>x.trackIdentifiers.length>l.records[best].trackIdentifiers.length?i:best,0);
 const r=parseClipsRecord(file,bi),stream=r.file.subarray(r.base,r.base+r.group.bytes),ts=ss[pi*2].tracks;
 const prs=[];
 for(const tr of [1,2,7,8,9,13,30,31,32,53,54,58,61]){
  const st=ts[tr],keys=(st.type===0x304?st.secondary:st.primary).keys,d=readTrackDescriptors(r,tr),rows=evalGroup(stream,r.bones[tr].groups[1],d.slice(3,6),r.rec.frameValue),scores={};
  if(!keys.length||!rows)continue;
  for(const mode of ['linear','bezier','quat','quatBezier','squad']){
   const errors=[];for(let f=0;f<r.rec.frameValue;f++){if(rows[f])errors.push(angle(sample(keys,f,mode),rv(rows[f])));}errors.sort((a,b)=>a-b);
   scores[mode]={med:errors[Math.floor(errors.length/2)],p95:errors[Math.floor(errors.length*.95)],max:errors.at(-1)};
  }prs.push({track:tr,type:st.type.toString(16),scores});
 }report.push({phase,tracks:prs});
}
fs.writeFileSync(__dirname+'/interpolation-candidates.json',JSON.stringify(report,null,2));
for(const p of report){console.log('phase',p.phase);for(const t of p.tracks)console.log(t.track,t.type,Object.entries(t.scores).map(([m,s])=>`${m} med=${s.med.toFixed(3)} p95=${s.p95.toFixed(3)} max=${s.max.toFixed(3)}`).join(' | '));}
module.exports={sample,euler,rv,angle};
