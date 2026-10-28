'use strict';
// Decisive alignment test: print native t37c2 (eye-blink candidate) under h=0/h=2 for phases 110 and 140,
// alongside the native eyeL bone deviation series, frame by frame, and compute per-frame roughness.
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

function qAngleDev(qs) {
  const q0 = qs[0];
  return qs.map((q) => 2 * Math.acos(Math.min(1, Math.abs(q[0] * q0[0] + q[1] * q0[1] + q[2] * q0[2] + q[3] * q0[3]))) * 180 / Math.PI);
}
function rotVecToQuat(v) {
  const th = Math.hypot(v[0], v[1], v[2]);
  if (th < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(th) / th;
  return [Math.cos(th), v[0] * s, v[1] * s, v[2] * s];
}
function readBits(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }

for (const pf of ['1100273', '1400273']) {
  const buf = fs.readFileSync(path.join(NAT, pf + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g90 = r.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;
  const desc = (i) => ({ scale: payload.readInt8(descOff + i * 8), width: payload[descOff + i * 8 + 1], rest: payload.readFloatLE(descOff + i * 8 + 4) });

  // native eye bone (track 1)
  const rd = new BitReader(stream);
  for (let b = 0; b < 8; b++) {
    const posD = [0, 1, 2].map((c) => desc(b * 6 + c));
    const rotD = [0, 1, 2].map((c) => desc(b * 6 + 3 + c));
    const posG = parseTimingGroup(rd, F, posD.map((d) => d.width)); if (!posG.skipped) rd.pos = posG.end;
    const rotG = parseTimingGroup(rd, F, rotD.map((d) => d.width));
    let rotv = null;
    if (!rotG.skipped) { rotv = evalGroup(stream, rotG, rotD, F); rd.pos = rotG.end; }
    if (b === 1) {
      const qs = [];
      for (let f = 0; f < F; f++) qs.push(rotv ? rotVecToQuat(rotv[f]) : rotVecToQuat(rotD.map((d) => d.rest)));
      var eyeL = qAngleDev(qs);
    }
  }
  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => desc(48 + t * 3 + c));
    if (ds.some((d) => d.width > 0)) active.push({ t, ds });
  }
  function decodeChannel(tIndex, cIndex, h) {
    let pos = x9c;
    for (const g of active) {
      pos += h;
      for (let f = 0; f < F; f++) {
        for (let c = 0; c < 3; c++) {
          const w = g.ds[c].width;
          if (w === 0) continue;
          const v = readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest;
          pos += w;
          if (g.t === tIndex && c === cIndex) {
            // need to store — use closure trick
          }
        }
      }
    }
    return null;
  }
  // simpler: full decode then pick
  function decodeAll(h) {
    let pos = x9c;
    const map = new Map();
    for (const g of active) {
      pos += h;
      const comps = [[], [], []];
      for (let f = 0; f < F; f++) for (let c = 0; c < 3; c++) {
        const w = g.ds[c].width;
        if (w === 0) { comps[c].push(g.ds[c].rest); continue; }
        comps[c].push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
        pos += w;
      }
      map.set(g.t, comps);
    }
    return map;
  }
  const d0 = decodeAll(0), d2 = decodeAll(2);
  const t37 = 37;
  const printRow = (label, frames) => {
    console.log(`\n${label} (${frames.join(',')}):`);
    console.log('  eyeLbone : ' + frames.map((f) => eyeL[f].toFixed(2).padStart(7)).join(' '));
    console.log('  h0 t37c2 : ' + frames.map((f) => (d0.get(t37) ? d0.get(t37)[2][f].toFixed(4) : 'n/a').padStart(7)).join(' '));
    console.log('  h2 t37c2 : ' + frames.map((f) => (d2.get(t37) ? d2.get(t37)[2][f].toFixed(4) : 'n/a').padStart(7)).join(' '));
  };
  console.log(`\n########## ${pf} F=${F}`);
  const mid = Math.floor(F / 2);
  printRow('around middle', [mid - 6, mid - 5, mid - 4, mid - 3, mid - 2, mid - 1, mid, mid + 1, mid + 2, mid + 3, mid + 4, mid + 5, mid + 6]);
  printRow('near start', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  if (d0.get(t37) && d2.get(t37)) {
    let r0 = 0, r2 = 0;
    for (let f = 1; f < F; f++) {
      r0 += Math.abs(d0.get(t37)[2][f] - d0.get(t37)[2][f - 1]);
      r2 += Math.abs(d2.get(t37)[2][f] - d2.get(t37)[2][f - 1]);
    }
    console.log(`t37c2 total variation: h0=${r0.toFixed(3)} h2=${r2.toFixed(3)}`);
  }
}
