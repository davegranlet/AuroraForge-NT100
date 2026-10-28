'use strict';
// Source 273 facial tracks: per phase, per track motion statistics using the canonical decoder.
// Track order = source facial index 0..6. Name hypotheses are carried from the structural analysis
// (see facial-mapping-evidence.json) and are NOT asserted by this script.
const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'decode-2k19-entrance-source.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));

const src = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const dst = process.argv[3];
const source = decodeEntrance(src);
const deg = (q0, q) => {
  const d = Math.abs(q0.reduce((s, v, c) => s + v * q[c], 0));
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
};
const report = { sourceSha256: source.sourceSha256, phases: [] };
for (const phase of source.phases) {
  const rows = phase.facial.map((t, i) => {
    const q0 = t.q[0], p0 = t.p[0];
    let maxAng = 0, maxAngFrame = 0;
    t.q.forEach((q, f) => { const a = deg(q0, q); if (a > maxAng) { maxAng = a; maxAngFrame = f; } });
    const pmin = [0, 1, 2].map((c) => Math.min(...t.p.map((p) => p[c])));
    const pmax = [0, 1, 2].map((c) => Math.max(...t.p.map((p) => p[c])));
    const pRange = [0, 1, 2].map((c) => +(pmax[c] - pmin[c]).toFixed(5));
    const changes = t.q.reduce((n, q, f) => n + (f > 0 && deg(t.q[f - 1], q) > 1e-6 ? 1 : 0), 0);
    return {
      sourceIndex: i, hash32: t.hash32, frames: t.q.length,
      rotationMaxDeviationDeg: +maxAng.toFixed(3), rotationMaxDeviationFrame: maxAngFrame,
      rotationFrameChanges: changes,
      rotationFirst: q0.map((v) => +v.toFixed(5)), rotationLast: t.q.at(-1).map((v) => +v.toFixed(5)),
      translationFirst: p0.map((v) => +v.toFixed(5)), translationRange: pRange,
    };
  });
  report.phases.push({ phase: phase.phase, frames: phase.durationFrames, tracks: rows });
  const summary = rows.map((r) => `#${r.sourceIndex}:h${r.hash32}:rot${r.rotationMaxDeviationDeg}deg(chg${r.rotationFrameChanges}):trans${r.translationRange.join('/')}`);
  process.stdout.write(`phase ${phase.phase} (${phase.durationFrames}f): ${summary.join('  ')}\n`);
}
if (dst) fs.writeFileSync(dst, JSON.stringify(report, null, 1), 'utf8');
