'use strict';
// Lane-local (parallel-body/final-root-review): exact geometry between the source camera
// carrier tracks and the body-space references used by the aimfix, per phase, sampled.
// References compared against the source camera's paired target track:
//   root62  = [hips.x, vector.y, hips.z]      (converted/native J_Root; used by aimfix)
//   hipsAbs = [hips.x, hips.y, hips.z]        (absolute hips translation)
// Outputs exact deltas so the target's body-space meaning is measured, not assumed.
// usage: node camera-body-space-check.js [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const OUT = process.argv[2] || path.join(__dirname, 'camera-body-space-check.json');
const PHASES = [100, 110, 120, 130, 140];

const f = n => +n.toFixed(3);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const ang = (a, b) => { const la = Math.hypot(...a), lb = Math.hypot(...b); if (!la || !lb) return NaN; return Math.acos(Math.max(-1, Math.min(1, a.reduce((s, x, i) => s + x * b[i], 0) / (la * lb)))) * 180 / Math.PI; };
const qrot = (q, v) => { const m = (a, b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]; const inv = a => [a[0], -a[1], -a[2], -a[3]]; return m(m(q, [0, ...v]), inv(q)).slice(1); };

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const camBytes = fs.readFileSync(path.join(SHDC, fs.readdirSync(SHDC).filter(x => x.endsWith('.bin')).sort()[2]));
const sections = decode(camBytes);
const report = { schema: 'parallel-body/final-root-review/camera-body-space-check/v1', phases: [] };

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, fidx) => [h[0], vec[fidx][1], h[2]]);
  const s = sections[pi * 2];
  const d = s.tracks[0].frameCount;
  const camPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d);
  const camRot = rotationFrames(s.tracks[0].primary, d);
  const tgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d);

  const rows = [];
  const stats = { dy_target_root: [], dy_target_hips: [], dxz_target_root: [], aimY_target: [], aimY_root: [], aimY_hips: [] };
  for (let fidx = 0; fidx <= d; fidx += Math.max(1, Math.floor(d / 12))) {
    const dr = sub(tgt[fidx], root[fidx]);
    const dh = sub(tgt[fidx], hips[fidx]);
    const yAxis = qrot(camRot[fidx], [0, 1, 0]);
    rows.push({
      frame: fidx,
      root: root[fidx].map(f), hipsAbs: hips[fidx].map(f), camPos: camPos[fidx].map(f), target: tgt[fidx].map(f),
      dyTargetMinusRoot: f(dr[1]), horizTargetToRoot: f(Math.hypot(dr[0], dr[2])),
      dyTargetMinusHips: f(dh[1]), horizTargetToHips: f(Math.hypot(dh[0], dh[2])),
      aimYtoTargetDeg: f(ang(yAxis, sub(tgt[fidx], camPos[fidx]))),
      aimYtoRootDeg: f(ang(yAxis, sub(root[fidx], camPos[fidx]))),
      aimYtoHipsDeg: f(ang(yAxis, sub(hips[fidx], camPos[fidx]))),
      camToRootDist: f(Math.hypot(...sub(root[fidx], camPos[fidx]))),
    });
    stats.dy_target_root.push(dr[1]); stats.dy_target_hips.push(dh[1]);
    stats.dxz_target_root.push(Math.hypot(dr[0], dr[2]));
    stats.aimY_target.push(rows[rows.length - 1].aimYtoTargetDeg);
    stats.aimY_root.push(rows[rows.length - 1].aimYtoRootDeg);
    stats.aimY_hips.push(rows[rows.length - 1].aimYtoHipsDeg);
  }
  const sum = a => ({ min: f(Math.min(...a)), max: f(Math.max(...a)), mean: f(a.reduce((x, y) => x + y, 0) / a.length) });
  report.phases.push({ phase, frames: d, stats: { dyTargetMinusRoot: sum(stats.dy_target_root), dyTargetMinusHips: sum(stats.dy_target_hips), horizTargetToRoot: sum(stats.dxz_target_root), aimYtoTargetDeg: sum(stats.aimY_target), aimYtoRootDeg: sum(stats.aimY_root), aimYtoHipsDeg: sum(stats.aimY_hips) }, rows });
  console.log(`phase ${phase}: target-root dy ${JSON.stringify(report.phases[pi].stats.dyTargetMinusRoot)} horiz ${report.phases[pi].stats.horizTargetToRoot.mean}`);
  console.log(`   target-hipsAbs dy ${JSON.stringify(report.phases[pi].stats.dyTargetMinusHips)} | aim(+Y) to target/root/hips mean ${report.phases[pi].stats.aimYtoTargetDeg.mean}/${report.phases[pi].stats.aimYtoRootDeg.mean}/${report.phases[pi].stats.aimYtoHipsDeg.mean} deg`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
