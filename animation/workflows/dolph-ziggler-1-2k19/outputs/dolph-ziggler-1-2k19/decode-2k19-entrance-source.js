'use strict';
// Source-only decoding for the measured classic 2K19 entrance skeleton.
// No target animation curves, calibration fits, or donor timing are inputs.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { decode } = require('./yanm-keyframes');
const HALF_EULER_SCALE = Math.PI / 65536;

function multiply(a, b) {
  return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
}
const inverse = q => [q[0], -q[1], -q[2], -q[3]];
const dot = (a, b) => a.reduce((sum, value, c) => sum + value*b[c], 0);
const normalized = q => { const len = Math.hypot(...q); return q.map(v => v / len); };
const align = (q, reference) => dot(q, reference) < 0 ? q.map(v => -v) : q;

function eulerWordsToQuaternion(words) {
  if (words.length < 3) throw new Error('Rotation requires three Euler words');
  let q = [1,0,0,0];
  for (const c of [2,1,0]) {
    const halfAngle = words[c] * HALF_EULER_SCALE;
    const axis = [Math.cos(halfAngle),0,0,0];
    axis[c+1] = Math.sin(halfAngle);
    q = multiply(q, axis);
  }
  return normalized(q);
}

function slerp(a, b, t) {
  b = align(b, a);
  const d = Math.max(-1, Math.min(1, dot(a,b)));
  if (d > 0.9995) return normalized(a.map((v,c) => v*(1-t)+b[c]*t));
  const angle = Math.acos(d), denominator = Math.sin(angle);
  const wa = Math.sin((1-t)*angle)/denominator, wb = Math.sin(t*angle)/denominator;
  return normalized(a.map((v,c) => wa*v+wb*b[c]));
}

function rotationFrames(timeline, frameCount) {
  if (!timeline?.keys.length) throw new Error('Missing source rotation keys');
  const keys = timeline.keys.map(key => ({ ...key, q: eulerWordsToQuaternion(key.packed.slice(0,3)) }));
  for (let i=1; i<keys.length; i++) keys[i].q = align(keys[i].q, keys[i-1].q);
  const out = [];
  let i=0;
  for (let frame=0; frame<=frameCount; frame++) {
    while (i+1<keys.length && keys[i+1].frame<=frame) i++;
    const a=keys[i], b=keys[Math.min(i+1,keys.length-1)];
    const t=a.frame===b.frame?0:Math.max(0,Math.min(1,(frame-a.frame)/(b.frame-a.frame)));
    let q = slerp(a.q,b.q,t);
    if (a.packed.length===9 && b.packed.length===9 && t>0 && t<1) {
      const outgoing = align(eulerWordsToQuaternion(a.packed.slice(6,9)), a.q);
      const incoming = align(eulerWordsToQuaternion(b.packed.slice(3,6)), b.q);
      q = slerp(q,slerp(outgoing,incoming,t),2*t*(1-t));
    }
    if (out.length) q=align(q,out[out.length-1]);
    out.push(q);
  }
  return out;
}

// 2K19 translation words are displacement increments between keys, unlike
// the dense 2K20 rate stream. Accumulate each increment once and apply the
// source's scale and absolute anchor. The phase-end sums reproduce the next
// phase's source anchor; multiplying by frame delta introduces large drift.
function positionFrames(timeline, quantization, frameCount) {
  if (!timeline?.keys.length || quantization?.length!==4) throw new Error('Missing source position keys/quantization');
  const [scale,...anchor]=quantization;
  let value=[...anchor];
  const keys=timeline.keys.map((key,i)=>{
    if (i>0) value=value.map((v,c)=>v+key.packed[c]*scale);
    return {frame:key.frame,p:[...value]};
  });
  const out=[];
  let i=0;
  for(let f=0;f<=frameCount;f++){
    while(i+1<keys.length&&keys[i+1].frame<=f)i++;
    const a=keys[i],b=keys[Math.min(i+1,keys.length-1)];
    const t=a.frame===b.frame?0:Math.max(0,Math.min(1,(f-a.frame)/(b.frame-a.frame)));
    out.push(a.p.map((v,c)=>v*(1-t)+b.p[c]*t));
  }
  return out;
}

function rotate(q,v) { return multiply(multiply(q,[0,...v]),inverse(q)).slice(1); }
function halfLog(q) {
  const s=Math.hypot(q[1],q[2],q[3]);
  if(s<1e-12) return [0,0,0];
  const halfAngle=Math.atan2(s,q[0]);
  return q.slice(1).map(v=>v*halfAngle/s);
}

function decodeEntrance(sourcePath) {
  const bytes=fs.readFileSync(sourcePath), sections=decode(bytes);
  if(sections.length!==10) throw new Error('Expected five interleaved body/facial sections');
  const phases=[];
  for(let pi=0;pi<5;pi++){
    const body=sections[pi*2], face=sections[pi*2+1];
    if(body.tracks.length!==62||face.tracks.length!==7) throw new Error('Unsupported classic entrance track layout');
    const duration=body.tracks[0].frameCount;
    if([...body.tracks,...face.tracks].some(t=>!t.supported||!t.timelineMatches||t.frameCount!==duration)) {
      throw new Error('Unsupported or inconsistent source timeline');
    }
    const motion=body.tracks.map(track=>{
      if(![0x204,0x304,0x2200,0x2300].includes(track.type))throw new Error(`Unsupported source track type ${track.type}`);
      const rotation=track.type===0x304?track.secondary:track.primary;
      const translation=track.type===0x304?track.primary:track.type===0x2300?track.secondary:null;
      return {index:track.index,hash32:track.hash,q:rotationFrames(rotation,duration),
        p:translation?positionFrames(translation,track.quantizationCandidates,duration):Array.from({length:duration+1},()=>[0,0,0])};
    });
    const vector=motion[61],hips=motion[1];
    const targetBody=[];
    for(let tr=0;tr<64;tr++){
      const p=[],q=[];
      for(let f=0;f<=duration;f++){
        const rootPosition=[hips.p[f][0],vector.p[f][1],hips.p[f][2]];
        let qp,pp;
        if(tr===0){pp=[0,0,0];qp=[1,0,0,0];}
        else if(tr===1){pp=[0,hips.p[f][1]-vector.p[f][1],0];qp=multiply(inverse(vector.q[f]),hips.q[f]);}
        else if(tr===62){pp=rootPosition;qp=vector.q[f];}
        else if(tr===63){pp=rotate(inverse(vector.q[f]),rootPosition.map(v=>-v));qp=inverse(vector.q[f]);}
        else {pp=motion[tr].p[f];qp=motion[tr].q[f];}
        if(q.length)qp=align(qp,q[q.length-1]);
        p.push(pp);q.push(qp);
      }
      targetBody.push({index:tr,p,q,rotation:q.map(halfLog),provenance:tr===0?'neutral scene root':tr===62||tr===63?'source hips/vector derived':tr===1?'source hips relative to source vector':`source track ${tr}`});
    }
    phases.push({phase:100+pi*10,durationFrames:duration,frames:duration+1,body:targetBody,
      sourceTracks:motion,facial:face.tracks.map(track=>({index:track.index,hash32:track.hash,
        q:rotationFrames(track.primary,duration),p:positionFrames(track.secondary,track.quantizationCandidates,duration)}))});
  }
  return {schema:'aurora-forge-source19-entrance-decoded/v1',sourcePath,
    sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),phases};
}

module.exports={decodeEntrance,eulerWordsToQuaternion,rotationFrames,positionFrames,slerp,multiply,inverse,rotate,halfLog};
