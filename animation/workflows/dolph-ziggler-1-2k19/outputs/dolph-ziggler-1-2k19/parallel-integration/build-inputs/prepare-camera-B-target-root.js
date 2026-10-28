'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19';
const sourceManifest = path.join(root, 'parallel-integration/build-inputs/p14002-cam-C-ringmat-rope-v1-20261019/components.camera-C-ringmat-rope.json');
const outDir = path.join(root, 'parallel-integration/build-inputs/p14002-cam-B-target-root-v1-20261020');
const manifestPath = path.join(outDir, 'components.camera-B-target-root.json');
const cameraDir = path.join(root, 'parallel-companions/final-camera');
const tags = ['00', '05', '10', '15', '20'];
const manifest = JSON.parse(fs.readFileSync(sourceManifest, 'utf8'));
for (let i = 0; i < manifest.phases.length; i++) {
  const phase = manifest.phases[i];
  const camera = phase.overlays.find(x => x.component === 'camera');
  if (!camera) throw new Error(`phase ${phase.phase}: no camera overlay`);
  const cell = path.join(cameraDir, `B-${tags[i]}-camera.clips`);
  if (!fs.existsSync(cell)) throw new Error(`missing B cell: ${cell}`);
  camera.path = cell;
  camera.sha256 = crypto.createHash('sha256').update(fs.readFileSync(cell)).digest('hex');
  camera.status = 'diagnostic-B-target-only-root-aim';
  camera.provenance = 'B discriminator: target track replaced with 273 body root; source 9D94 rotation, camera position, third channel and all non-camera records retained.';
}
manifest.generated = new Date().toISOString();
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const replacements = [
  [path.join('C:/nt100-codebasemain/.local/test557-stage-camera-C-ringmat-rope-20261020', 'STAGING-REPORT.md'), 'The video `2026-10-20_02-24-03.mp4` was captured before this build and shows the performer off-screen, so it does not report this candidate\'s result and does not establish that the body itself is reversed.', 'The video `2026-10-20_02-24-03.mp4` was recorded after this build was staged (installed archive mtime 2026-10-19 21:47; video 2026-10-20 02:24). Sampled frames show the arena upside down and the performer absent. This confirms C\'s conjugate camera orientation is unusable; it does not establish body inversion.'],
  [path.join('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19', 'FINAL-STATUS.md'), 'Runtime is unverified. The 02:24 video predates this candidate and shows no performer, so it is evidence of camera/framing failure only.', 'Runtime failed: the 02:24 video was recorded after this candidate was staged (installed archive mtime 2026-10-19 21:47; video 2026-10-20 02:24). Sampled frames show an upside-down arena and no performer. This confirms C\'s conjugate camera orientation is unusable; it does not establish body inversion.']
];
for (const [file, oldText, newText] of replacements) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(oldText)) throw new Error(`expected text not found in ${file}`);
  fs.writeFileSync(file, text.replace(oldText, newText));
}
console.log(JSON.stringify({manifestPath, phases: manifest.phases.map(p => ({phase:p.phase, camera:p.overlays.find(x=>x.component==='camera')}))}, null, 2));