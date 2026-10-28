'use strict';
// Lane-local source-internal test: under the current source decode, the five phases are
// windows of one continuous performance, so the last frame of phase i and the first frame
// of phase i+1 must agree (rotation and position) for every track.
// A large mismatch is a demonstrable decode defect; small values bound the decode error.
// usage: node test-phase-boundary-continuity.js [source.bin] [out.json] [phasePair e.g. 100-110]
const fs = require('node:fs');
const path = require('node:path');
const { decodeEntrance } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OUT = process.argv[3] || path.join(__dirname, 'phase-boundary-continuity.json');
const onlyPair = process.argv[4] || null;

const src = decodeEntrance(SRC);
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((s, v, c) => s + v * b[c], 0)))) * 180 / Math.PI;
const report = { schema: 'parallel-body/phase-boundary-continuity/v1', source: SRC, sourceSha256: src.sourceSha256, pairs: [] };

for (let i = 0; i + 1 < src.phases.length; i++) {
  const a = src.phases[i], b = src.phases[i + 1];
  const pairKey = `${a.phase}-${b.phase}`;
  if (onlyPair && onlyPair !== pairKey) continue;
  const rows = [];
  for (let t = 0; t < 64; t++) {
    const qa = a.body[t].q[a.body[t].q.length - 1], qb = b.body[t].q[0];
    const pa = a.body[t].p[a.body[t].p.length - 1], pb = b.body[t].p[0];
    rows.push({
      track: t,
      rotDeg: angle(qa, qb),
      pos: Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]),
      rotDegPrevFrame: angle(a.body[t].q[a.body[t].q.length - 2], qa),
      rotDegNextFrame: angle(qb, b.body[t].q[1]),
    });
  }
  const worst = [...rows].sort((x, y) => y.rotDeg - x.rotDeg).slice(0, 6);
  const worstPos = [...rows].sort((x, y) => y.pos - x.pos).slice(0, 4);
  const maxRot = Math.max(...rows.map(r => r.rotDeg));
  const maxPos = Math.max(...rows.map(r => r.pos));
  report.pairs.push({ pair: pairKey, frames: `${a.frames}/${b.frames}`, maxRotDeg: maxRot, maxPos, worstRot: worst, worstPos });
  console.log(`boundary ${pairKey}: maxRotJump=${maxRot.toFixed(3)}deg maxPosJump=${maxPos.toFixed(4)}`);
  for (const w of worst) console.log(`   track ${w.track}: rotJump=${w.rotDeg.toFixed(3)}deg (endVel=${w.rotDegPrevFrame.toFixed(3)}, startVel=${w.rotDegNextFrame.toFixed(3)})`);
  for (const w of worstPos) console.log(`   track ${w.track}: posJump=${w.pos.toExponential(3)}`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('wrote', OUT);
