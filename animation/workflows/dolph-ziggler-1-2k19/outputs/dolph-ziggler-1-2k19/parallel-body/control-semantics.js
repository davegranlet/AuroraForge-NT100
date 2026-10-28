'use strict';
// Lane-local: test source 2K19 9-word rotation key control semantics.
// For each key: V (value), stored in/out controls; compare against
// (a) neighbor key values, (b) canonical SQUAD intermediate controls derived from VALUES only,
// (c) exact shared-control identities out(i)==in(i+1).
// usage: node control-semantics.js <sectionPrefix> <trackIndex> [source.bin]
const fs = require('node:fs');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion, multiply, inverse, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SRC = process.argv[4] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const prefix = process.argv[2] || '13';
const trackIndex = Number(process.argv[3] || 56);
const sections = decode(fs.readFileSync(SRC));
const body = sections[Number(prefix[1]) * 2];
const track = body.tracks[trackIndex];
const rot = track.type === 0x304 ? track.secondary : track.primary;
const keys = rot.keys.filter(k => k.packed.length === 9);

const q = k => eulerWordsToQuaternion(k.slice(0, 3));
const qOf = p => eulerWordsToQuaternion(p);
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((s, v, c) => s + v * b[c], 0)))) * 180 / Math.PI;
const rvDeg = v => Math.hypot(...v) * 180 / Math.PI;
function expMap(v) {
  const a = Math.hypot(...v);
  if (a < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(a) / a;
  return [Math.cos(a), s * v[0], s * v[1], s * v[2]];
}
function logMap(qq) {
  const v = qq.slice(1); const n = Math.hypot(...v);
  if (n < 1e-12) return [0, 0, 0];
  const a = 2 * Math.atan2(n, qq[0]);
  return v.map(x => x * a / n);
}
const mul = (a, b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const inv = a => [a[0], -a[1], -a[2], -a[3]];
const align = (a, b) => a.reduce((s, v, c) => s + v * b[c], 0) < 0 ? a.map(v => -v) : a;

const Vs = keys.map(k => q(k.packed));
console.log(`section ${prefix} track ${trackIndex} type=0x${track.type.toString(16)} rotKeys=${keys.length}`);
console.log('frame delta | ang(V,prev) ang(next,V) | in:ang(in,V) in:ang(in,prev) out:ang(out,V) out:ang(out,next) | squadS:ang(s,V) | shared out==in(next)?');
let sharedCount = 0, totalPairs = 0;
for (let i = 0; i < keys.length; i++) {
  const k = keys[i];
  const V = Vs[i];
  const I = q(k.packed.slice(3, 6));
  const O = q(k.packed.slice(6, 9));
  const prevV = i > 0 ? Vs[i - 1] : null;
  const nextV = i < Vs.length - 1 ? Vs[i + 1] : null;
  // squad control for key i from neighbor values
  let squad = null;
  if (prevV && nextV) {
    const dNext = logMap(mul(inv(V), align(nextV, V)));
    const dPrev = logMap(mul(inv(V), align(prevV, V)));
    const t = dNext.map((x, c) => -(x + dPrev[c]) / 4);
    squad = mul(V, expMap(t));
  }
  let shared = '';
  if (i < keys.length - 1 && keys[i + 1].packed.length === 9) {
    const nI = keys[i + 1].packed.slice(3, 6);
    const curO = k.packed.slice(6, 9);
    totalPairs++;
    if (curO.every((v, c) => v === nI[c])) { shared = 'SHARED'; sharedCount++; }
  }
  const f2 = x => x.toFixed(2);
  console.log([
    k.frame, k.delta,
    '|', ang(V, prevV || V).toFixed(2), ang(nextV || V, V).toFixed(2),
    '|', f2(ang(I, V)), f2(prevV ? ang(I, prevV) : 0), f2(ang(O, V)), f2(nextV ? ang(O, nextV) : 0),
    '|', squad ? f2(ang(squad, V)) : '-',
    shared,
  ].join(' '));
}
console.log(`shared out(i)==in(i+1): ${sharedCount}/${totalPairs} adjacent pairs`);
