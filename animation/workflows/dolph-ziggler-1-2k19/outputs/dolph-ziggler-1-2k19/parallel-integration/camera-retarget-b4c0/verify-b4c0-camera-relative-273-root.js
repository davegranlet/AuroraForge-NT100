'use strict';
const fs=require('fs'),path=require('path');
const {parseFile}=require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const {parseClipsRecord}=require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const {evalGroup}=require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const PHASES=[
 {phase:100,donor:'1000144.clips',candidate:'1014002.clips',reference:'1014002.clips'},
 {phase:110,donor:'1100142.clips',candidate:'1114002.clips',reference:'1114002.clips'},
 {phase:120,donor:'1200708.clips',candidate:'1214002.clips',reference:'1214002.clips'},
 {phase:130,donor:'1300494.clips',candidate:'1314002.clips',reference:'1314002.clips'},
 {phase:140,donor:'1400174.clips',candidate:'1414002.clips',reference:'1414002.clips'},
];
const donorRoot='D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const base='C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration';
const candDir=path.join(base,'builds/p14002-camera-b4c0-relative-273-root-v1-20261020/staging/Animation/CaeAdvanced');
const refDir=path.join(base,'builds/p14002-cam-C-ringmat-rope-v1-20261019/staging/Animation/CaeAdvanced');
const ROOT=0x1F4DA262FC146772n;
function recordIndex(p,pred,label){const a=p.records.map((r,i)=>pred(r)?i:-1).filter(i=>i>=0);if(a.length!==1)throw Error(`${label}: ${a.length}`);return a[0];}
function dec(file,idx,t,g){const p=parseClipsRecord(file,idx),ds=[];for(let c=0;c<3;c++){const e=p.rec.raw.group78[t*6+g*3+c];ds.push({scale:Buffer.from(e.hex.slice(0,2),'hex').readInt8(0),width:parseInt(e.hex.slice(2,4),16),rest:e.candidate.f32le[1]});}const stream=p.file.subarray(p.base,p.base+p.group.bytes);return evalGroup(stream,p.bones[t].groups[g],ds,p.rec.frameValue)||Array.from({length:p.rec.frameValue},()=>ds.map(d=>d.rest));}
function lerp(a,b,t){return a.map((x,i)=>x+(b[i]-x)*t);}
function sample(rows,x){const lo=Math.floor(x),hi=Math.min(rows.length-1,lo+1);return lerp(rows[lo],rows[hi],x-lo);}
function qFrom(v){const s=Math.hypot(...v);if(s<1e-12)return[1,0,0,0];const k=Math.sin(s)/s;return[Math.cos(s),v[0]*k,v[1]*k,v[2]*k];}
function vFrom(q){const n=Math.hypot(...q);q=q.map(x=>x/n);if(q[0]<0)q=q.map(x=>-x);const s=Math.hypot(q[1],q[2],q[3]);return s<1e-12?[0,0,0]:q.slice(1).map(x=>x*Math.atan2(s,q[0])/s);}
function slerp(a,b,t){let d=a.reduce((s,x,i)=>s+x*b[i],0);if(d<0){b=b.map(x=>-x);d=-d;}if(d>.9995){const q=a.map((x,i)=>x+t*(b[i]-x)),n=Math.hypot(...q);return q.map(x=>x/n);}const th=Math.acos(Math.max(-1,Math.min(1,d))),st=Math.sin(th);return a.map((x,i)=>Math.sin((1-t)*th)/st*x+Math.sin(t*th)/st*b[i]);}
function sampleRot(rows,x){const lo=Math.floor(x),hi=Math.min(rows.length-1,lo+1);return vFrom(slerp(qFrom(rows[lo]),qFrom(rows[hi]),x-lo));}
function maxAbs(a,b){let m=0;for(let i=0;i<a.length;i++)for(let c=0;c<3;c++)m=Math.max(m,Math.abs(a[i][c]-b[i][c]));return m;}
function rotErr(a,b){let m=0;for(let i=0;i<a.length;i++){const q1=qFrom(a[i]),q2=qFrom(b[i]);const d=Math.min(1,Math.abs(q1.reduce((s,x,j)=>s+x*q2[j],0)));m=Math.max(m,2*Math.acos(d)*180/Math.PI);}return m;}
const results=[];
for(const p of PHASES){
 const dfile=path.join(donorRoot,p.donor),cfile=path.join(candDir,p.candidate),rfile=path.join(refDir,p.reference);
 const dp=parseFile(dfile,{includeRaw:false}),cp=parseFile(cfile,{includeRaw:false}),rp=parseFile(rfile,{includeRaw:false});
 const db=recordIndex(dp,r=>r.trackIdentifiers.length===73,'donor body'),dc=recordIndex(dp,r=>r.trackIdentifiers.length===3,'donor camera');
 const cb=recordIndex(cp,r=>r.trackIdentifiers.length===64,'candidate body'),cc=recordIndex(cp,r=>r.trackIdentifiers.length===3,'candidate camera');
 const rc=recordIndex(rp,r=>r.trackIdentifiers.length===3,'reference camera');
 const rootIdx=cp.records[cb].trackIdentifiers.findIndex(x=>BigInt(x)===ROOT);if(rootIdx<0)throw Error(`p${p.phase}: target root id missing`);
 const dRootIdx=dp.records[db].trackIdentifiers.findIndex(x=>BigInt(x)===ROOT);if(dRootIdx<0)throw Error(`p${p.phase}: donor root id missing`);
 const dn=dp.records[dc].frameValue,n=cp.records[cc].frameValue;if(cp.records[cb].frameValue!==n)throw Error(`p${p.phase}: body/camera frame mismatch`);
 if(JSON.stringify(cp.records[cc].trackIdentifiers.map(String))!==JSON.stringify(dp.records[dc].trackIdentifiers.map(String)))throw Error(`p${p.phase}: camera track IDs differ from donor`);
 const dR=dec(dfile,db,dRootIdx,0),tR=dec(cfile,cb,rootIdx,0),dP=dec(dfile,dc,0,0),dQ=dec(dfile,dc,0,1),dT=dec(dfile,dc,1,0),dF=dec(dfile,dc,2,0);
 const aP=dec(cfile,cc,0,0),aQ=dec(cfile,cc,0,1),aT=dec(cfile,cc,1,0),aF=dec(cfile,cc,2,0);
 const ep=[],et=[],eq=[],ef=[];
 for(let f=0;f<n;f++){const x=n===1?0:f*(dn-1)/(n-1),dr=sample(dR,x),tr=tR[f],dp0=sample(dP,x),dt0=sample(dT,x);ep.push(dp0.map((v,c)=>v-dr[c]));et.push(dt0.map((v,c)=>v-dr[c]));eq.push(sampleRot(dQ,x));ef.push(sample(dF,x));}
 const ap=aP.map((v,f)=>v.map((x,c)=>x-tR[f][c]));const at=aT.map((v,f)=>v.map((x,c)=>x-tR[f][c]));
 const posError=Math.max(maxAbs(ap,ep),maxAbs(at,et)),rotationError=rotErr(aQ,eq),fovError=maxAbs(aF,ef);
 const sameNonCamera=cp.records.filter((_,i)=>i!==cc).every((r)=>{const x=rp.records.find(y=>String(y.id)===String(r.id));return x&&Buffer.from(fs.readFileSync(cfile).subarray(r.offset,r.offset+r.length)).equals(Buffer.from(fs.readFileSync(rfile).subarray(x.offset,x.offset+x.length)));});
 const pass=posError<0.003&&rotationError<0.002&&fovError<0.00005&&sameNonCamera;
 results.push({phase:p.phase,frames:n,donorFrames:dn,donorRootTrackIndex:dRootIdx,targetRootTrackIndex:rootIdx,relativePositionAndTargetMaxAbsError:posError,rotationMaxAngularErrorDeg:rotationError,fovMaxAbsError:fovError,nonCameraRecordsByteIdentical:sameNonCamera,pass});
 console.log(`p${p.phase}: pos/target ${posError.toExponential(2)} rot ${rotationError.toExponential(2)}deg fov ${fovError.toExponential(2)} noncamera=${sameNonCamera} ${pass?'PASS':'FAIL'}`);
}
const report={schema:'aurora-forge-camera-retarget-b4c0-relative-root-verification/v1',generated:new Date().toISOString(),method:'independent decode of final package and donor templates; compare all frames to donor camera/root-relative path translated onto source-273 root',phases:results,pass:results.length===5&&results.every(x=>x.pass)};
const out=path.join(__dirname,'camera-retarget-verification.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(`SEMANTIC CAMERA RETARGET ${report.pass?'PASS':'FAIL'}: ${out}`);if(!report.pass)process.exit(1);