'use strict';
// Canonical source YMAM parser (offset-keyed) + source semantic bridge test.
// Association A proven by semantics: record k -> blocks at f2[k]/f3[k]; block extent to next sorted start.
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
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');

function parseBank(phase) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${phase}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const records = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    const rec = { k, nameOff: b.readUInt32BE(o), f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8) };
    rec.name = b.subarray(rec.nameOff, rec.nameOff + 16).toString('latin1').replace(/\0+$/, '');
    records.push(rec);
  }
  const starts2 = [...new Set(records.map((r) => r.f2))].sort((a, c) => a - c);
  const starts3 = [...new Set(records.map((r) => r.f3))].sort((a, c) => a - c);
  const region2End = starts3[0];
  const blocks2 = new Map(), blocks3 = new Map();
  starts2.forEach((s, i) => blocks2.set(s, { start: s, end: i + 1 < starts2.length ? starts2[i + 1] : region2End }));
  starts3.forEach((s, i) => blocks3.set(s, { start: s, end: i + 1 < starts3.length ? starts3[i + 1] : b.length }));
  const curves = new Map();
  let activeCount = 0;
  for (const rec of records) {
    const b2 = blocks2.get(rec.f2), b3 = blocks3.get(rec.f3);
    const frames = [];
    for (let o = b2.start; o + 2 <= b2.end; o += 2) frames.push(b.readUInt16BE(o));
    const values = [];
    for (let o = b3.start; o < b3.end; o++) values.push(b[o]);
    const curve = { name: rec.name, k: rec.k, frames, values, framesMatchValues: frames.length === values.length };
    if (frames.length !== values.length) curve.warning = `frames ${frames.length} != values ${values.length}`;
    curves.set(rec.name, curve);
    if (new Set(values).size > 1) activeCount++;
  }
  return { phase, bytes: b.length, count, records, blocks2, blocks3, curves, activeCount };
}

function interp(curve, F) {
  const { frames, values } = curve;
  const out = new Array(F).fill(values[0] ?? 0);
  for (let i = 1; i < frames.length; i++) {
    const f0 = frames[i - 1], f1 = frames[i];
    const hi = Math.min(f1, F - 1);
    for (let f = f0; f <= hi; f++) {
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

if (require.main === module) {
  const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
  const SRC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
  const entrance = decodeEntrance(SRC);
  const PHASES = [100, 110, 120, 130, 140];
  const report = { schema: 'worker13-source-bridge-v2/v1', phases: [] };
  for (let i = 0; i < 5; i++) {
    const bank = parseBank(PHASES[i]);
    const ph = entrance.phases[i];
    const F = ph.frames;
    const jaw = ph.facial[2].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI);
    const eyeL = ph.facial[0].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI);
    const eyeR = ph.facial[1].q.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0]))) * 180 / Math.PI);
    const items = [];
    for (const name of ['Jaw_Dn', 'Jaw_Up', 'Jaw_Fwd', 'Jaw_L', 'Jaw_R', 'Mouth_Up', 'Mouth_Dn', 'Eye_L_Blink', 'Eye_R_Blink', 'Eye_L_Open', 'Eye_R_Open']) {
      const c = bank.curves.get(name);
      if (!c) continue;
      const s = interp(c, F);
      const teeth = { jaw, eyeL, eyeR };
      const row = { name, kf: c.values.length, warning: c.warning || null, distinct: new Set(c.values).size };
      for (const [bn, bs] of Object.entries(teeth)) row[bn] = +pearson(s, bs).toFixed(4);
      items.push(row);
    }
    report.phases.push({ phase: PHASES[i], frames: F, activeChannels: bank.activeCount, items });
    console.log(`\n=== phase ${PHASES[i]} F=${F} activeCurves=${bank.activeCount}`);
    for (const it of items) console.log(`  ${it.name.padEnd(13)} kf=${String(it.kf).padStart(4)} distinct=${String(it.distinct).padStart(3)} r(jaw)=${it.jaw} r(eyeL)=${it.eyeL} r(eyeR)=${it.eyeR}${it.warning ? ' WARN ' + it.warning : ''}`);
    // sanity print of Jaw_Dn curve head
    const jd = bank.curves.get('Jaw_Dn');
    if (jd) console.log(`  Jaw_Dn frames=${jd.frames.length} firstframes=${jd.frames.slice(0, 12).join(',')} firstvals=${jd.values.slice(0, 12).join(',')}`);
  }
  fs.writeFileSync(path.join(__dirname, 'source-bridge-v2.json'), JSON.stringify(report, null, 1), 'utf8');
}
module.exports = { parseBank, interp, pearson };
