'use strict';
// Lane-local: quantify the spread between candidate interpolation-law readings on the
// RingIn toe window (phase 130, J_Toe_L) so the unresolved surface is stated exactly.
// R1 = current law (squad-form blend with stored controls, 2t(1-t)).
// R2 = de Casteljau quadratic through the two stored handles.
// R3 = piecewise slerp treating an exact-shared handle as a pose at the segment midpoint.
// chord = plain slerp between key values (controls ignored).
const fs = require('node:fs');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const s = decode(fs.readFileSync(SRC));
const track = s[6].tracks[56];
const keys = track.primary.keys.filter(k => k.packed.length === 9);
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
console.log('frame | R1 degFromId | R2 degFromId | chord degFromId | R1vsR2 | R1vsR3-mid | shared?');
for (let i = 0; i + 1 < keys.length; i++) {
  const A = keys[i], B = keys[i + 1];
  if (A.frame < 442 || A.frame > 456) continue;
  const Va = q(A.packed.slice(0, 3)), Vb = q(B.packed.slice(0, 3));
  const outA = A.packed.slice(6, 9), inB = B.packed.slice(3, 6);
  const shared = B.delta === 2 && outA.every((v, c) => v === inB[c]);
  for (let f = A.frame; f < B.frame; f++) {
    const tt = (f - A.frame) / (B.frame - A.frame);
    let r1 = slerp(Va, Vb, tt);
    if (tt > 0 && tt < 1) r1 = slerp(r1, slerp(q(outA), q(inB), tt), 2 * tt * (1 - tt));
    const r2 = slerp(slerp(Va, q(outA), tt), slerp(q(inB), Vb, tt), tt);
    const chord = slerp(Va, Vb, tt);
    let r3diff = '-';
    if (shared) r3diff = ang(r1, q(outA)).toFixed(3);
    console.log(`${f} | ${ang(r1, [1,0,0,0]).toFixed(2)} | ${ang(r2, [1,0,0,0]).toFixed(2)} | ${ang(chord, [1,0,0,0]).toFixed(2)} | ${ang(r1, r2).toFixed(3)} | ${r3diff} | ${shared ? 'SHARED' : ''}`);
  }
}
