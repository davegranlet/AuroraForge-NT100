'use strict';
// Side-by-side per-frame decode of native 140 triple 4 channels under h=0 vs h=2 to pick the true alignment.
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

const pf = '1400273';
const buf = fs.readFileSync(path.join(NAT, pf + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const payload = buf.subarray(r.offset, r.offset + r.length);
const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
const g90 = r.sections.find((s) => s.name === 'group90');
const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
const x9c = payload.readUInt32LE(0x9c);
const F = r.frameValue;
const active = [];
for (let t = 0; t < 240; t++) {
  const ds = [0, 1, 2].map((c) => { const at = descOff + (48 + t * 3 + c) * 8; return { scale: payload.readInt8(at), width: payload[at + 1], rest: payload.readFloatLE(at + 4) }; });
  if (ds.some((d) => d.width > 0)) active.push({ t, ds, sum: ds.reduce((a, d) => a + d.width, 0) });
}

function decode(h) {
  let pos = x9c;
  const out = new Map();
  for (const g of active) {
    pos += h;
    const vals = [];
    for (let f = 0; f < F; f++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const w = g.ds[c].width;
        if (w === 0) { row.push(g.ds[c].rest); continue; }
        row.push(readBits(stream, pos, w) * Math.pow(2, g.ds[c].scale) + g.ds[c].rest);
        pos += w;
      }
      vals.push(row);
    }
    out.set(g.t, vals);
  }
  return { out, end: pos };
}

const d0 = decode(0), d2 = decode(2);
for (const t of [4, 6, 7, 38]) {
  const a = d0.out.get(t), b = d2.out.get(t);
  if (!a || !b) continue;
  console.log(`\n=== triple ${t}`);
  for (let f = 0; f < 24; f++) {
    console.log(`f${String(f).padStart(3)}  h0: ${a[f].map((x) => x.toFixed(4)).join(' ')}   h2: ${b[f].map((x) => x.toFixed(4)).join(' ')}`);
  }
}
console.log('\nend h0', d0.end, 'end h2', d2.end);
