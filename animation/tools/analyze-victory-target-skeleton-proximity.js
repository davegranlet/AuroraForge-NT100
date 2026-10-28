'use strict';

// Diagnostic only: compare the absolute c0 tgt.Camera curve with animated
// skeleton joints after composing possible skeleton rest transforms. Skel
// nested fields 2/3 are treated as translation/Euler candidates, not as a
// proven runtime schema. This tool never writes game assets.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { inspect: inspectSkeleton, tableAt } = require('./inspect-wwe-skeleton-jsfb');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
const CAMERA_ID = '0x54D1B2A64667E32E';
const TARGET_ID = '0x5A3744A0D6E080B1';
const JOINTS = ['J_Hips', 'J_Spine1', 'J_Spine2', 'J_Chest', 'J_Neck', 'J_Head'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const idKey = s => String(s).toUpperCase().replace(/^0X/, '').padStart(16, '0');

function add(a,b) { return a.map((v,i) => v+b[i]); }
function sub(a,b) { return a.map((v,i) => v-b[i]); }
function mul(a,b) { return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]; }
function inv(q) { return [q[0],-q[1],-q[2],-q[3]]; }
function rot(q,v) { return mul(mul(q,[0,...v]),inv(q)).slice(1); }
function rotVec(v) { const a=Math.hypot(...v); if(a<1e-12)return [1,0,0,0]; const s=Math.sin(a)/a; return [Math.cos(a),v[0]*s,v[1]*s,v[2]*s]; }
function axisQ(axis,angle) { const q=[Math.cos(angle/2),0,0,0]; q[axis+1]=Math.sin(angle/2); return q; }
function eulerQ(v,unit,order) { const factor=unit==='degrees'?Math.PI/180:1; let q=[1,0,0,0]; for(const c of order) q=mul(q,axisQ('XYZ'.indexOf(c),v['XYZ'.indexOf(c)]*factor)); return q; }
function dist(a,b) { return Math.hypot(...sub(a,b)); }
function summarize(values) { const sorted=[...values].sort((a,b)=>a-b); return {mean:values.reduce((s,x)=>s+x,0)/values.length,median:sorted[Math.floor((sorted.length-1)/2)],p95:sorted[Math.floor((sorted.length-1)*0.95)],max:sorted.at(-1)}; }

function nestedVector(bytes,bone,fieldId) {
  const field=bone.fields[fieldId];
  if(!field)return [0,0,0];
  const table=tableAt(bytes,field.at+field.u32);
  if(!table)return [0,0,0];
  return [0,1,2].map(i=>table.fields[i]?.f32 ?? 0);
}

function decodeRecord(file,recordIndex,layout) {
  const bytes=fs.readFileSync(file), record=layout.records[recordIndex];
  if(!record)throw new Error(`${file}: no record at index ${recordIndex}`);
  const parsed=parseClipsRecordBuffer(bytes,recordIndex),stream=bytes.subarray(parsed.base,parsed.base+parsed.group.bytes);
  const tracks=new Map();
  for(let i=0;i<record.trackIdentifiers.length;i++){
    const descriptors=readTrackDescriptors(parsed,i);
    const groups=[0,1].map(g=>{
      const ds=descriptors.slice(g*3,g*3+3);
      const decoded=evalGroup(stream,parsed.bones[i].groups[g],ds,record.frameValue);
      return decoded||Array.from({length:record.frameValue},()=>ds.map(d=>d.rest));
    });
    tracks.set(idKey(record.trackIdentifiers[i]),groups);
  }
  return {bytes,record,tracks,sha256:sha(bytes),recordIndex};
}

function decodeUnique(file,trackId,layout) {
  const bytes=fs.readFileSync(file);
  const matches=layout.records.flatMap((r,i)=>r.trackIdentifiers.some(id=>idKey(id)===idKey(trackId))?[i]:[]);
  if(matches.length!==1)throw new Error(`${file}: expected one ${trackId} record; found ${matches.length}`);
  const decoded=decodeRecord(file,matches[0],layout);
  return {record:decoded.record,values:decoded.tracks.get(idKey(trackId))[0],sha256:decoded.sha256};
}

function buildPose(skeleton,record,frame,config) {
  const byName=new Map(skeleton.bones.map(b=>[b.name,b]));
  const cache=new Map(),active=new Set();
  function visit(name){
    if(cache.has(name))return cache.get(name);
    if(active.has(name))throw new Error(`skeleton parent cycle at ${name}`);
    const b=byName.get(name); if(!b)throw new Error(`missing skeleton bone ${name}`);
    active.add(name);
    const channel=record.tracks.get(idKey(b.boneId64));
    const animP=channel?.[0]?.[frame]||[0,0,0],animR=channel?.[1]?.[frame]||[0,0,0];
    const restP=nestedVector(skeleton.bytes,b,2),restE=nestedVector(skeleton.bytes,b,3);
    const localP=config.positionMode==='rest-plus-curve'?add(restP,animP):(channel?animP:restP);
    const restQ=eulerQ(restE,config.eulerUnit,config.eulerOrder),animQ=rotVec(animR);
    const localQ=config.rotationOrder==='rest-then-curve'?mul(restQ,animQ):mul(animQ,restQ);
    let out;
    if(!b.parentName)out={p:localP,q:localQ};
    else {const parent=visit(b.parentName);out={p:add(parent.p,rot(parent.q,localP)),q:mul(parent.q,localQ)};}
    active.delete(name);cache.set(name,out);return out;
  }
  const all={}; for(const name of JOINTS){try{all[name]=visit(name);}catch(e){all[name]={error:e.message};}}
  const root=visit('J_Root');
  return {root,joints:all};
}

function analyzeOne(label,clipsPath,bodyIndex,cameraIndex,skeleton,config) {
  const layout=parseFile(clipsPath,{includeRaw:false});
  const body=decodeRecord(clipsPath,bodyIndex,layout), camera=decodeUnique(clipsPath,CAMERA_ID,layout), target=decodeUnique(clipsPath,TARGET_ID,layout);
  if(body.record.frameValue!==camera.record.frameValue || body.record.frameValue!==target.record.frameValue)throw new Error(`${label}: body/camera frame counts differ`);
  const errors=Object.fromEntries(JOINTS.map(name=>[name,[]]));
  for(let f=0;f<body.record.frameValue;f++){
    const pose=buildPose(skeleton,body,f,config),focus=sub(target.values[f],pose.root.p);
    for(const name of JOINTS){const joint=pose.joints[name];if(joint&&!joint.error)errors[name].push(dist(focus,sub(joint.p,pose.root.p)));}
  }
  const ranked=JOINTS.map(name=>({bone:name,...summarize(errors[name])})).sort((a,b)=>a.mean-b.mean);
  return {label,clipsPath,sha256:body.sha256,bodyRecordIndex:bodyIndex,bodyRecordId:body.record.id,frames:body.record.frameValue,cameraRecordIndex:camera.record.index,targetRecordIndex:target.record.index,config,bestFocusBoneHypotheses:ranked};
}

function run({skeletonPath,nativePath,nativeBodyIndex=2,candidatePath,candidateBodyIndex=0,out}) {
  for(const [k,v] of Object.entries({skeletonPath,nativePath,candidatePath,out}))if(!v)throw new Error(`${k} is required`);
  const skeletonBytes=fs.readFileSync(skeletonPath),skeletonReport=inspectSkeleton(skeletonPath);
  if(skeletonReport.identifier!=='Skel'||!skeletonReport.bones.some(b=>b.name==='J_Root'))throw new Error('unsupported skeleton or missing J_Root');
  const skeleton={...skeletonReport,bytes:skeletonBytes};
  const configs=[];
  for(const eulerUnit of ['degrees','radians'])for(const eulerOrder of ['XYZ','XZY','YXZ','YZX','ZXY','ZYX'])for(const rotationOrder of ['rest-then-curve','curve-then-rest'])for(const positionMode of ['rest-plus-curve','curve-replace'])configs.push({eulerUnit,eulerOrder,rotationOrder,positionMode});
  const rows=[];
  for(const config of configs){
    const native=analyzeOne('native 2K26 Victory 6100',nativePath,nativeBodyIndex,4,skeleton,config);
    const candidate=analyzeOne('converted 2K19 Rock Victory 6100',candidatePath,candidateBodyIndex,2,skeleton,config);
    rows.push({config,nativeBest:native.bestFocusBoneHypotheses.slice(0,3),candidateBest:candidate.bestFocusBoneHypotheses.slice(0,3),native,candidate});
  }
  rows.sort((a,b)=>a.native.bestFocusBoneHypotheses[0].mean-b.native.bestFocusBoneHypotheses[0].mean);
  const result={schema:'aurora-forge/victory-target-skeleton-proximity/v1',method:'For each hypothesis, compose Skel nested fields 2/3 as rest translation/Euler candidates with decoded CLIPS local bone curves, then compare c0 absolute tgt.Camera minus J_Root against each named joint relative to J_Root. Enumerates Euler units/orders, rest/curve quaternion order, and position add/replace. No runtime camera binding is inferred.',inputs:{skeleton:{path:skeletonPath,sha256:skeletonReport.sha256,bones:skeletonReport.boneCount},native:{path:nativePath,sha256:sha(fs.readFileSync(nativePath)),bodyRecordIndex:nativeBodyIndex},candidate:{path:candidatePath,sha256:sha(fs.readFileSync(candidatePath)),bodyRecordIndex:candidateBodyIndex}},hypotheses:rows,limits:['Skel nested field 2 as translation and field 3 as Euler angles are unverified schema hypotheses.','The clip-to-skeleton local transform composition is not confirmed by a renderer trace.','A low numeric residual is diagnostic evidence only; it does not prove that the game binds tgt.Camera to that joint.','The candidate is evaluated in clip space; scene/place transforms are excluded.']};
  const resolved=require('node:path').resolve(out);if(fs.existsSync(resolved))throw new Error(`refusing to overwrite ${resolved}`);fs.mkdirSync(require('node:path').dirname(resolved),{recursive:true});fs.writeFileSync(resolved,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}

if(require.main===module){try{const a=process.argv.slice(2),get=(n,d=null)=>{const i=a.indexOf(n);return i<0?d:a[i+1];};const r=run({skeletonPath:get('--skeleton'),nativePath:get('--native'),nativeBodyIndex:Number(get('--native-body-index','2')),candidatePath:get('--candidate'),candidateBodyIndex:Number(get('--candidate-body-index','0')),out:get('--out')});console.log(JSON.stringify({out:get('--out'),hypotheses:r.hypotheses.length,top:r.hypotheses.slice(0,4).map(x=>({config:x.config,native:x.nativeBest,candidate:x.candidateBest}))},null,2));}catch(e){console.error(`Victory target/skeleton proximity analysis failed: ${e.message}`);process.exitCode=1;}}
module.exports={run,buildPose,nestedVector,eulerQ};
