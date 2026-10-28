'use strict';
// Lane-local: test whether stored 9-word rotation controls are C1 Hermite-style
// value-space handles at segment thirds, i.e.
//   log(V^-1 * out_i) / (d_next/3)  ~= -log(V^-1 * in_i) / (d_prev/3)   (one tangent per key)
// Pure source-file test; no target/native data is used.
// usage: node test-hermite-tangents.js <sectionPrefix> <trackIndex> [source.bin] [maxRows]
const fs = require('node:fs');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SRC = process.argv[4] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const prefix = process.argv[2] || '13';
const trackIndex = Number(process.argv[3] || 56);
const maxRows = Number(process.argv[5] || 400);
const sections = decode(fs.readFileSync(SRC));
const body = sections[Number(prefix[1]) * 2];
const track = body.tracks[trackIndex];
const rot = track.type === 0x304 ? track.secondary : track.primary;
const keys = rot.keys.filter(k => k.packed.length === 9);

const mul = (a, b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const inv = a => [a[0], -a[1], -a[2], -a[3]];
const dotv = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function logMap(qq) {
  const v = qq.slice(1); let n = Math.hypot(...v);
  if (n < 1e-12) return [0, 0, 0];
  const short = qq[0] < 0 ? qq.map(x => -x) : qq;
  const w = short[0]; const vv = short.slice(1); n = Math.hypot(...vv);
  const a = 2 * Math.atan2(n, w);
  return vv.map(x => x * a / n);
}
const deg = v => Math.hypot(...v) * 180 / Math.PI;
const angleBetween = (a, b) => {
  const na = Math.hypot(...a), nb = Math.hypot(...b);
  if (na < 1e-12 || nb < 1e-12) return NaN;
  return Math.acos(Math.max(-1, Math.min(1, dotv(a, b) / (na * nb)))) * 180 / Math.PI;
};

console.log(`section ${prefix} track ${trackIndex} rotKeys=${keys.length}`);
console.log('frame | ToutDegPerFrame TinDegPerFrame | angleBetween | ratio | offsets in/out deg');
let agree = 0, total = 0, big = 0;
for (let i = 0; i < keys.length && i < maxRows; i++) {
  const k = keys[i];
  const V = eulerWordsToQuaternion(k.packed.slice(0, 3));
  const I = eulerWordsToQuaternion(k.packed.slice(3, 6));
  const O = eulerWordsToQuaternion(k.packed.slice(6, 9));
  const dPrev = k.delta; // delta into this key == previous gap
  const dNext = i + 1 < keys.length ? keys[i + 1].delta : 0; // delta into next key == next gap
  if (!dPrev || !dNext) { console.log(`${k.frame} | - | - | - | - | dPrev=${dPrev} dNext=${dNext}`); continue; }
  const tin = logMap(mul(inv(V), I));
  const tout = logMap(mul(inv(V), O));
  const Tin = tin.map(x => -x * 3 / dPrev);
  const Tout = tout.map(x => x * 3 / dNext);
  const a = angleBetween(Tin, Tout);
  const ratio = deg(Tin) / (deg(Tout) || 1e-9);
  total++;
  if (a < 15) agree++;
  if (deg(Tin) > 30 || deg(Tout) > 30) big++;
  const flag = (a < 15 ? 'ok' : 'DIFF') + (deg(Tin) > 30 || deg(Tout) > 30 ? ' BIG' : '');
  console.log(`${k.frame} | ${deg(Tout).toFixed(2)} ${deg(Tin).toFixed(2)} | ${isNaN(a) ? '-' : a.toFixed(2)} | ${ratio.toFixed(2)} | ${deg(tin).toFixed(2)}/${deg(tout).toFixed(2)} ${flag}`);
}
console.log(`tangent-direction agreement (<15deg): ${agree}/${total}; keys with |T|>30deg/frame: ${big}`);
