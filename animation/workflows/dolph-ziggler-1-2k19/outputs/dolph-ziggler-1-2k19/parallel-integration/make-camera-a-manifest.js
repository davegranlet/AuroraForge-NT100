const fs=require('fs'),path=require('path');
const dir=__dirname, src=path.join(dir,'camera-integration','components.camera.json');
const m=JSON.parse(fs.readFileSync(src,'utf8'));
for(const p of m.phases){
  const tag={100:'00',110:'05',120:'10',130:'15',140:'20'}[p.phase];
  const ov=p.overlays.find(x=>x.component==='camera');
  ov.path=path.join(dir,'..','parallel-companions','final-camera',`A-${tag}-camera.clips`).replaceAll('\\','/');
  ov.status='diagnostic-A-orientation-only';
  ov.provenance='A discriminator: orientation channel replaced; target, position, third camera channel, body, facial, and all other records preserved.';
  delete ov.sha256;
}
m.generated=new Date().toISOString();
fs.writeFileSync(path.join(dir,'camera-integration','components.camera-A.json'),JSON.stringify(m,null,2)+'\n');
console.log('wrote components.camera-A.json');
