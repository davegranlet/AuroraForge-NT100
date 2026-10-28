'use strict';
// Source-side semantic bridge test: correlate source YMAM morph curves (Jaw_Dn, Eye_L_Blink, etc.)
// against the source facial bone tracks (J_Jaw rotation, J_Eye_L/R) decoded by the canonical decoder.
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
const { decodeEntrance, halfLog } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');

const entrance = decodeEntrance(SRC);
console.log('phases:', entrance.phases.map((p) => `${p.phase ?? '?'}:${p.frames}`).join(' '));

// parse YMAM curves (association A = f2[k]/f3[k])
function parseBank(p) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const recs = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    recs.push({ k, nameOff: b.readUInt32BE(o), f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8), name: '' });
    recs[k].name = b.subarray(recs[k].nameOff, recs[k].nameOff + 16).toString('latin1').replace(/\0+$/, '');
  }
  const starts2 = [...new Set(recs.map((r) => r.f2))].sort((a, c) => a - c);
  const starts3 = [...new Set(recs.map((r) => r.f3))].sort((a, c) => a - c);
  const end2 = starts3[0];
  function curves(starts, end, valueBytes) {
    const map = new Map();
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      const e = i + 1 < starts.length ? starts[i + 1] : end;
      if (valueBytes) { const v = []; for (let o = s; o < e; o++) v.push(b[o]); map.set(s, { start: s, end: e, values: v }); }
      else { const fr = []; for (let o = s; o + 2 <= e; o += 2) fr.push(b.readUInt16BE(o)); map.set(s, { start: s, end: e, frames: fr }); }
    }
    return map;
  }
  const f2map = curves(starts2, end2, false);
  const f3map = curves(starts3, b.length, true);
  return { recs, f2map, f3map };
}

function interp(values, frames) {
  // linear interp of sparse keyframes at integer frame positions including endpoints
  const out = new Array(frames).fill(values[0] ?? 0);
  if (values.length === 0) return out;
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    const f0 = frames[i - 1], f1 = frames[i];
    const v0 = values[i - 1], v1 = values[i];
    if (f1 < f0) continue;
    for (let f = f0; f <= Math.min(f1, frames - 1); f++) {
      const t = f1 === f0 ? 0 : (f - f0) / (f1 - f0);
      out[f] = v0 + (v1 - v0) * t;
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
const results = { schema: 'worker13-source-semantic-bridge/v1', phases: [] };

for (let i = 0; i < entrance.phases.length; i++) {
  const ph = entrance.phases[i];
  const frameCount = ph.frames;
  const bank = parseBank([100, 110, 120, 130, 140][i]);
  // source bone series: jaw rotation magnitude (deg), eye rotation magnitude
  const boneSeries = {};
  ph.facial.forEach((track, bi) => {
    const name = NAMES[bi];
    const rot = track.q.map((q) => {
      const w = Math.min(1, Math.abs(q[0]));
      return 2 * Math.acos(w) * 180 / Math.PI;
    });
    boneSeries[name] = rot;
  });
  const corr = [];
  for (const r of bank.recs) {
    const f2 = bank.f2map.get(r.f2), f3 = bank.f3map.get(r.f3);
    if (!f2 || !f3) continue;
    const vals = f3.values;
    const distinct = new Set(vals).size;
    if (distinct < 3) continue; // only animated channels
    const series = interp(vals, frameCount);
    for (const [bname, bs] of Object.entries(boneSeries)) {
      const rr = pearson(series, bs);
      if (Math.abs(rr) > 0.5) corr.push({ name: r.name, bone: bname, r: +rr.toFixed(4), keyframes: vals.length });
    }
  }
  corr.sort((a, c) => Math.abs(c.r) - Math.abs(a.r));
  results.phases.push({ phase: [100, 110, 120, 130, 140][i], frames: frameCount, topCorrelations: corr.slice(0, 25) });
  console.log(`\n=== phase ${[100, 110, 120, 130, 140][i]} (F=${frameCount}) top morph↔bone correlations:`);
  for (const c of corr.slice(0, 12)) console.log(`  ${c.name.padEnd(16)} vs ${c.bone.padEnd(10)} r=${c.r} kf=${c.keyframes}`);
}
fs.writeFileSync(path.join(__dirname, 'source-semantic-bridge.json'), JSON.stringify(results, null, 1), 'utf8');
