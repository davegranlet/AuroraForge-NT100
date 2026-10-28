'use strict';
// Lane-local (parallel-body/final-root-review): native 2K26 273 camera (c0) carrier geometry
// against the same body-root reference used by the aimfix. Measures, per phase, sampled:
//   - angle(+Y of exp(halfLog)) -> the camera's OWN paired target
//   - angle(+Y) -> body root62 ; angle(+Z) -> own target (axis probes)
//   - target - root62 (dy and horizontal), camera-root distance
// Companion to camera-body-space-check.js (source side). Data-only; no consumer claim.
// usage: node native-camera-space-check.js [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decodeEntrance } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };
const OUT = process.argv[2] || path.join(__dirname, 'native-camera-space-check.json');

const f = n => +n.toFixed(3);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const ang = (a, b) => { const la = Math.hypot(...a), lb = Math.hypot(...b); if (!la || !lb) return NaN; return Math.acos(Math.max(-1, Math.min(1, a.reduce((s, x, i) => s + x * b[i], 0) / (la * lb)))) * 180 / Math.PI; };
const qrot = (q, v) => { const m = (a, b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]]; const inv = a => [a[0], -a[1], -a[2], -a[3]]; return m(m(q, [0, ...v]), inv(q)).slice(1); };
const hl2q = v => { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map(x => x / s); return [Math.cos(s), ax[0]*Math.sin(s), ax[1]*Math.sin(s), ax[2]*Math.sin(s)]; };
const sum = a => ({ min: f(Math.min(...a)), max: f(Math.max(...a)), mean: f(a.reduce((x, y) => x + y, 0) / a.length) });

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const report = { schema: 'parallel-body/final-root-review/native-camera-space-check/v1', phases: [] };
for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, i) => [h[0], vec[i][1], h[2]]);
  const r = parseClipsRecord(path.join(NAT, `${phase}0273.clips`), CAMREC[phase]);
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, g, gi) => { const d = [0, 1, 2].map(c => { const e = r.rec.raw.group78[t * perTrack + g * 3 + c]; return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }; }); return evalGroup(stream, r.bones[t].groups[gi], d, r.rec.frameValue) || Array.from({ length: r.rec.frameValue }, () => d.map(x => x.rest)); };
  const pos = get(0, 0, 0), rotHalf = get(0, 0, 1), tgt = get(1, 0, 0);
  const d = r.rec.frameValue - 1;
  const cols = { aimYtoTarget: [], aimYtoRoot: [], aimZtoTarget: [], aimNegYtoTarget: [], dyTargetMinusRoot: [], horizTargetToRoot: [], camRootDist: [] };
  for (let fr = 0; fr <= d; fr += Math.max(1, Math.floor(d / 12))) {
    const q = hl2q(rotHalf[fr]);
    const y = qrot(q, [0, 1, 0]), z = qrot(q, [0, 0, 1]);
    const toTgt = sub(tgt[fr], pos[fr]);
    const dr = sub(tgt[fr], root[fr]);
    cols.aimYtoTarget.push(ang(y, toTgt));
    cols.aimYtoRoot.push(ang(y, sub(root[fr], pos[fr])));
    cols.aimZtoTarget.push(ang(z, toTgt));
    cols.aimNegYtoTarget.push(ang(y.map(x => -x), toTgt));
    cols.dyTargetMinusRoot.push(dr[1]);
    cols.horizTargetToRoot.push(Math.hypot(dr[0], dr[2]));
    cols.camRootDist.push(Math.hypot(...sub(root[fr], pos[fr])));
  }
  const stats = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, sum(v)]));
  report.phases.push({ phase, frames: d, stats });
  console.log(`phase ${phase}: native aim +Y->ownTarget ${stats.aimYtoTarget.mean}deg | +Y->root ${stats.aimYtoRoot.mean} | +Z->target ${stats.aimZtoTarget.mean} | target-root dy ${stats.dyTargetMinusRoot.mean} horiz ${stats.horizTargetToRoot.mean} | cam-root ${stats.camRootDist.mean}`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
