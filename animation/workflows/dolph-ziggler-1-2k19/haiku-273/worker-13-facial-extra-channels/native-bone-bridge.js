'use strict';
// Decode the native facial record bone pass canonically (parseTimingGroup/evalGroup per bone group)
// and correlate jaw/eye bone deviation against decoded native extra channels (h=0 vs h=2).
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
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}
function qAngleDev(qs) {
  const q0 = qs[0];
  return qs.map((q) => {
    const d = Math.min(1, Math.abs(q[0] * q0[0] + q[1] * q0[1] + q[2] * q0[2] + q[3] * q0[3]));
    return 2 * Math.acos(d) * 180 / Math.PI;
  });
}
function rotVecToQuat(v) {
  const th = Math.hypot(v[0], v[1], v[2]);
  if (th < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(th) / th;
  return [Math.cos(th), v[0] * s, v[1] * s, v[2] * s];
}
function readBits(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }

const report = { schema: 'worker13-native-bone-bridge/v1', phases: [] };
for (const pf of ['1100273', '1200273', '1300273', '1400273']) {
  const buf = fs.readFileSync(path.join(NAT, pf + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g90 = r.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;

  // canonical bone pass
  const rd = new BitReader(stream);
  const desc = (i) => ({ scale: payload.readInt8(descOff + i * 8), width: payload[descOff + i * 8 + 1], rest: payload.readFloatLE(descOff + i * 8 + 4) });
  const bones = [];
  for (let b = 0; b < 8; b++) {
    const posD = [0, 1, 2].map((c) => desc(b * 6 + c));
    const rotD = [0, 1, 2].map((c) => desc(b * 6 + 3 + c));
    const posG = parseTimingGroup(rd, F, posD.map((d) => d.width));
    let posv = null;
    if (!posG.skipped) { posv = evalGroup(stream, posG, posD, F); rd.pos = posG.end; }
    const rotG = parseTimingGroup(rd, F, rotD.map((d) => d.width));
    let rotv = null;
    if (!rotG.skipped) { rotv = evalGroup(stream, rotG, rotD, F); rd.pos = rotG.end; }
    const qs = [];
    for (let f = 0; f < F; f++) qs.push(rotv ? rotVecToQuat(rotv[f]) : rotVecToQuat(rotD.map((d) => d.rest)));
    bones.push({ b, posStatic: posG.skipped, rotStatic: rotG.skipped, qs });
  }
  const walkEnd = rd.pos;

  // decode extra channels under h=0 and h=2 (dense, no mode byte)
  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => desc(48 + t * 3 + c));
    if (ds.some((d) => d.width > 0)) active.push({ t, ds, sum: ds.reduce((a, d) => a + d.width, 0) });
  }
  function decodeExtra(h) {
    let pos = x9c;
    const chans = [];
    for (const g of active) {
      pos += h;
      const comps = [[], [], []];
      for (let f = 0; f < F; f++) {
        for (let c = 0; c < 3; c++) {
          const w = g.ds[c].width;
          if (w === 0) { comps[c].push(g.ds[c].rest); continue; }
          comps[c].push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
          pos += w;
        }
      }
      comps.forEach((vals, c) => { if (g.ds[c].width > 0) chans.push({ id: `t${g.t}c${c}`, vals }); });
    }
    return { chans, end: pos };
  }
  const h0 = decodeExtra(0), h2 = decodeExtra(2);
  const jawDev = qAngleDev(bones[3].qs), eyeLDev = qAngleDev(bones[1].qs), eyeRDev = qAngleDev(bones[2].qs);
  const teeth = { jaw: jawDev, eyeL: eyeLDev, eyeR: eyeRDev };
  const rows = [];
  for (const [hn, hd] of [['h0', h0], ['h2', h2]]) {
    for (const ch of hd.chans) {
      const distinct = new Set(ch.vals.map((x) => x.toFixed(4))).size;
      if (distinct < 4) continue;
      const best = { tooth: '', r: 0 };
      for (const [tn, ts] of Object.entries(teeth)) {
        const rr = pearson(ch.vals, ts);
        if (Math.abs(rr) > Math.abs(best.r)) { best.tooth = tn; best.r = +rr.toFixed(4); }
      }
      rows.push({ h: hn, ch: ch.id, distinct, bestTooth: best.tooth, r: best.r });
    }
  }
  rows.sort((a, c) => Math.abs(c.r) - Math.abs(a.r));
  console.log(`\n===== ${pf} F=${F} x9c=${x9c} walkEnd=${walkEnd} (should equal x9c) h0end=${h0.end} h2end=${h2.end} streamBits=${stream.length * 8}`);
  console.log('  jawDev range', Math.min(...jawDev).toFixed(3), Math.max(...jawDev).toFixed(3));
  for (const row of rows.slice(0, 14)) console.log(`  ${row.h} ${row.ch.padEnd(8)} distinct=${String(row.distinct).padStart(4)} best=${row.bestTooth.padEnd(5)} r=${row.r}`);
  report.phases.push({ phaseFile: pf, F, x9c, walkEnd, h0end: h0.end, h2end: h2.end, streamBits: stream.length * 8, jawDevRange: [Math.min(...jawDev), Math.max(...jawDev)], rows });
}
fs.writeFileSync(path.join(__dirname, 'native-bone-bridge.json'), JSON.stringify(report, null, 1), 'utf8');
