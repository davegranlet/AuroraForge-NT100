'use strict';
// Debug: print sampled series of source Jaw_Dn morph vs J_Jaw bone rotation per phase;
// scan lags for the best correlation.
const fs = require('node:fs');
const path = require('node:path');
function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const entrance = decodeEntrance(SRC);

function parseBank(p) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const recs = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    const rec = { k, f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8) };
    rec.name = b.subarray(b.readUInt32BE(o), b.readUInt32BE(o) + 16).toString('latin1').replace(/\0+$/, '');
    recs.push(rec);
  }
  return { b, recs };
}
function channel(p, name) {
  const { b, recs } = parseBank(p);
  const k = recs.findIndex((r) => r.name === name);
  const f2s = [...new Set(recs.map((r) => r.f2))].sort((a, c) => a - c);
  const i = f2s.indexOf(recs[k].f2);
  const e2 = i + 1 < f2s.length ? f2s[i + 1] : Math.min(...recs.map((r) => r.f3));
  const frames = [];
  for (let o = recs[k].f2; o + 2 <= e2; o += 2) frames.push(b.readUInt16BE(o));
  const f3s = [...new Set(recs.map((r) => r.f3))].sort((a, c) => a - c);
  const j = f3s.indexOf(recs[k].f3);
  const e3 = j + 1 < f3s.length ? f3s[j + 1] : b.length;
  const values = [];
  for (let o = recs[k].f3; o < e3; o++) values.push(b[o]);
  return { frames, values };
}
function interp(frames, values, F) {
  const out = new Array(F).fill(values[0] ?? 0);
  for (let i = 1; i < frames.length; i++) {
    const f0 = frames[i - 1], f1 = frames[i];
    for (let f = f0; f <= Math.min(f1, F - 1); f++) {
      const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      out[f] = values[i - 1] + (values[i] - values[i - 1]) * t;
    }
  }
  return out;
}
function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}
const NAMES = ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4'];
for (let i = 0; i < 5; i++) {
  const ph = entrance.phases[i];
  const F = ph.frames;
  console.log(`\n===== phase ${[100, 110, 120, 130, 140][i]} frames=${F} facialTracks=${ph.facial.length}`);
  for (const name of ['Jaw_Dn', 'Jaw_Up', 'Mouth_Up', 'Eye_L_Blink']) {
    const { frames, values } = channel([100, 110, 120, 130, 140][i], name);
    const s = interp(frames, values, F);
    const jaw = ph.facial[2].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI);
    const eyes = ph.facial[0].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI);
    const src = name.startsWith('Eye') ? eyes : jaw;
    let best = { r: 0, lag: 0 };
    for (let lag = -30; lag <= 30; lag++) {
      const a = [], b = [];
      for (let f = 0; f < F; f++) {
        const g = f + lag;
        if (g >= 0 && g < F) { a.push(s[f]); b.push(src[g]); }
      }
      const rr = pearson(a, b);
      if (Math.abs(rr) > Math.abs(best.r)) best = { r: +rr.toFixed(3), lag };
    }
    const range = (arr) => `${Math.min(...arr).toFixed(1)}..${Math.max(...arr).toFixed(1)}`;
    console.log(`  ${name.padEnd(12)} morphRange=${range(s)} boneRange=${range(src)} bestR=${best.r} lag=${best.lag}`);
    // print a few samples
    const samp = [0, Math.floor(F / 4), Math.floor(F / 2), Math.floor(3 * F / 4), F - 1];
    console.log(`    morph@${samp.join(',')}=${samp.map((f) => s[f].toFixed(1)).join(',')}`);
    console.log(`    bone @${samp.join(',')}=${samp.map((f) => src[f].toFixed(2)).join(',')}`);
  }
}
