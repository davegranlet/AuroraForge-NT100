'use strict';
// Decide the extra-area per-group header size by smoothness: correct alignment yields low roughness
// in decoded per-channel curves. Tests header sizes {0,1,2} and reports total variation per variant.
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
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';

function readBits(buf, from, n) { let v = 0; for (let i = 0; i < n; i++) { const p = from + i; if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i); } return v >>> 0; }
function bitsAt(buf, from, n) { let s = ''; for (let i = 0; i < n; i++) { const p = from + i; s += String((buf[p >> 3] >> (p & 7)) & 1); } return s; }

for (const pf of ['1000273', '1100273', '1200273', '1300273', '1400273']) {
  const buf = fs.readFileSync(path.join(NAT, pf + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g90 = r.sections.find((s) => s.name === 'group90');
  const g90Off = parseInt(g90.relativeOffset, 16);
  const stream = payload.subarray(g90Off, g90Off + g90.bytes);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;
  const totalBits = stream.length * 8;

  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => {
      const at = descOff + (48 + t * 3 + c) * 8;
      return { scale: payload.readInt8(at), width: payload[at + 1], rest: payload.readFloatLE(at + 4) };
    });
    if (ds.some((d) => d.width > 0)) active.push({ t, ds, sum: ds.reduce((a, d) => a + d.width, 0) });
  }

  console.log(`\n===== ${pf} F=${F} x9c=${x9c} total=${totalBits}`);
  for (const h of [0, 1, 2]) {
    let pos = x9c;
    let overflow = false;
    let roughness = 0;
    const groupHeads = [];
    for (const g of active) {
      groupHeads.push(bitsAt(stream, pos, Math.min(h, 8)));
      pos += h;
      let prev = null;
      for (let f = 0; f < F; f++) {
        for (let c = 0; c < 3; c++) {
          const w = g.ds[c].width;
          if (w === 0) { pos += 0; continue; }
          if (pos + w > totalBits) { overflow = true; break; }
          const v = readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest;
          pos += w;
          const key = g.t * 3 + c;
          if (prev && prev.key === key) {
            const d = Math.abs(v - prev.v) / Math.pow(2, g.ds[c].scale);
            if (d > 64) roughness += 64; else roughness += d;
          }
          prev = { key, v };
        }
        if (overflow) break;
      }
      if (overflow) break;
    }
    console.log(`  h=${h}: ${overflow ? 'OVERFLOW' : 'end=' + pos} leftover=${totalBits - pos} roughness=${roughness.toFixed(1)} heads=${groupHeads.slice(0, 8).join(',')}`);
  }
}
