'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root='C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19';
const src=path.join(root,'parallel-integration/build-inputs/p14002-cam-C-ringmat-rope-v1-20261019/components.camera-C-ringmat-rope.json');
const outdir=path.join(root,'parallel-integration/build-inputs/p14002-camera-b4c0-relative-273-root-v1-20261020');
const out=path.join(outdir,'components.camera-b4c0-relative-273-root.json');
const overlayDir=path.join(root,'parallel-integration/camera-retarget-b4c0/camera-overlays');
const phases=[100,110,120,130,140];
const m=JSON.parse(fs.readFileSync(src,'utf8'));
for(let i=0;i<phases.length;i++){
 const p=m.phases[i]; if(p.phase!==phases[i]) throw new Error('phase order mismatch');
 const o=p.overlays.find(x=>x.component==='camera'); if(!o) throw new Error(`p${p.phase}: missing camera overlay`);
 const file=path.join(overlayDir,`p${p.phase}-camera-b4c0-relative-273-root.clips`);
 if(!fs.existsSync(file)) throw new Error(`missing overlay ${file}`);
 o.path=file; o.sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 o.status='adapted-known-good-donor-camera-relative-to-source273-root';
 o.provenance='B4C0 owner-played donor camera motion retimed to 273 phase; donor camera position and target translated together by (source273 root - donor root), orientation/FOV retained from donor; source 273 body/facial/ringmat/RingIn ropes unchanged. Camera choreography is adapted donor presentation, not source 273 camera.';
}
m.generated=new Date().toISOString();
fs.mkdirSync(outdir,{recursive:true}); fs.writeFileSync(out,JSON.stringify(m,null,2)+'\n');
console.log(JSON.stringify({manifest:out,phases:m.phases.map(p=>({phase:p.phase,camera:p.overlays.find(x=>x.component==='camera')}))},null,2));