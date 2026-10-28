'use strict';
// Lane-local: global spread between interpolation-law readings on ALL 9-word rotation
// segments of the original 2K19 273 body, so the unresolved surface is bounded exactly.
//   R1 = current law (2t(1-t) blend toward the control path)
//   R2 = de Casteljau quadratic through the two stored handles
//   chord = plain slerp between key values (controls ignored)
// R3 (handle as midpoint pose) only applies to exact-shared d=2 segments; those are
// reported separately as a midpoint ambiguity list.
// usage: node law-spread-census.js [source.bin] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OUT = process.argv[3] || path.join(__dirname, 'law-spread-census.json');
const s = decode(fs.readFileSync(SRC));
const q = k => eulerWordsToQuaternion(k);
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((sum, v, c) => sum + v * b[c], 0)))) * 180 / Math.PI;
const slerp = (a, b, t) => {
  let d = a.reduce((sum, v, c) => sum + v * b[c], 0);
  const bb = d < 0 ? b.map(v => -v) : b; d = Math.abs(d);
  if (d > 0.9995) { const r = a.map((v, c) => v * (1 - t) + bb[c] * t); const n = Math.hypot(...r); return r.map(v => v / n); }
  const th = Math.acos(Math.max(-1, Math.min(1, d))), sn = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / sn, wb = Math.sin(t * th) / sn;
  const r = a.map((v, c) => wa * v + wb * bb[c]); const n = Math.hypot(...r); return r.map(v => v / n);
};

const top = { R1vsR2: [], R1vsChord: [] };
let r1r2max = 0, r1chordmax = 0, segments = 0;
let r3count = 0, r3max = 0, r3sum = 0;
const r3list = [];
for (let si = 0; si < 10; si += 2) {
  const phase = 100 + (si / 2) * 10;
  for (const track of s[si].tracks) {
    const tl = track.type === 0x304 ? track.secondary : track.primary;
    if (!tl) continue;
    const keys = tl.keys.filter(k => k.packed.length === 9);
    for (let i = 0; i + 1 < keys.length; i++) {
      const A = keys[i], B = keys[i + 1];
      const d = B.frame - A.frame;
      if (d < 2) continue;
      segments++;
      const Va = q(A.packed.slice(0, 3)), Vb = q(B.packed.slice(0, 3));
      const outA = q(A.packed.slice(6, 9)), inB = q(B.packed.slice(3, 6));
      const rawOut = A.packed.slice(6, 9), rawIn = B.packed.slice(3, 6);
      const shared = d === 2 && rawOut.every((v, c) => v === rawIn[c]);
      for (let f = A.frame + 1; f < B.frame; f++) {
        const t = (f - A.frame) / d;
        const base = slerp(Va, Vb, t);
        const r1 = slerp(base, slerp(outA, inB, t), 2 * t * (1 - t));
        const r2 = slerp(slerp(Va, outA, t), slerp(inB, Vb, t), t);
        const a12 = ang(r1, r2);
        const a1c = ang(r1, base);
        if (a12 > r1r2max) r1r2max = a12;
        if (a1c > r1chordmax) r1chordmax = a1c;
        if (a12 > 0.5) top.R1vsR2.push({ phase, track: track.index, frame: f, deg: +a12.toFixed(3) });
        if (a1c > 2) top.R1vsChord.push({ phase, track: track.index, frame: f, deg: +a1c.toFixed(3) });
        if (shared) {
          const a1c2 = ang(r1, outA);
          r3count++; r3sum += a1c2; if (a1c2 > r3max) r3max = a1c2;
          if (a1c2 > 3) r3list.push({ phase, track: track.index, frame: f, deg: +a1c2.toFixed(3) });
        }
      }
    }
  }
}
top.R1vsR2.sort((a, b) => b.deg - a.deg); top.R1vsChord.sort((a, b) => b.deg - a.deg);
r3list.sort((a, b) => b.deg - a.deg);
const report = {
  schema: 'parallel-body/law-spread-census/v1', source: SRC,
  segments, r1vsR2: { max: r1r2max, over05: top.R1vsR2.length, top: top.R1vsR2.slice(0, 10) },
  r1vsChord: { max: r1chordmax, over2: top.R1vsChord.length, top: top.R1vsChord.slice(0, 10) },
  sharedMidpoints: { count: r3count, meanDeg: r3count ? r3sum / r3count : 0, maxDeg: r3max, over3: r3list.length, top: r3list.slice(0, 10) },
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`segments=${segments}`);
console.log(`R1 vs R2: max=${r1r2max.toFixed(3)}deg, frames>0.5deg=${top.R1vsR2.length}`);
console.log(`R1 vs chord(no-controls): max=${r1chordmax.toFixed(3)}deg, frames>2deg=${top.R1vsChord.length}`);
console.log(`exact-shared d=2 midpoints: n=${r3count}, mean=${(r3sum / Math.max(r3count,1)).toFixed(3)}deg, max=${r3max.toFixed(3)}deg, >3deg=${r3list.length}`);
console.log('wrote', OUT);
