'use strict';
// Decode the native extra-area stream with the descriptor-driven triple groups.
// Variants: header 2 bits per group vs 0 bits; mode byte present/absent. Checks exact end alignment.
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

function bitsToStr(buf, from, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const p = from + i;
    s += String((buf[p >> 3] >> (p & 7)) & 1);
  }
  return s;
}
function readBits(buf, from, n) {
  let v = 0;
  for (let i = 0; i < n; i++) {
    const p = from + i;
    if ((buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i);
  }
  return v >>> 0;
}

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

  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => {
      const at = descOff + (48 + t * 3 + c) * 8;
      return { scale: payload.readInt8(at), width: payload[at + 1], rest: payload.readFloatLE(at + 4) };
    });
    if (ds.some((d) => d.width > 0)) active.push({ t, ds, sum: ds.reduce((a, d) => a + d.width, 0) });
  }
  const totalBits = stream.length * 8;
  console.log(`\n===== ${pf} F=${F} x9c=${x9c} streamBits=${totalBits} available=${totalBits - x9c}`);
  console.log(`  first 32 bits after x9c: ${bitsToStr(stream, x9c, 32)}`);
  console.log(`  trailing 32 bits of stream: ${bitsToStr(stream, totalBits - 32, 32)}`);

  for (const headerBits of [2, 0, 1]) {
    let pos = x9c;
    const groups = [];
    let fail = null;
    for (const g of active) {
      const start = pos;
      pos += headerBits;
      if (pos + F * g.sum > totalBits) { fail = `overrun in triple ${g.t}: need ${F * g.sum} at ${pos}, end ${totalBits}`; break; }
      // read values frame by frame, component interleaved with fixed widths
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
      groups.push({ t: g.t, start, end: pos, vals });
    }
    const leftover = totalBits - pos;
    console.log(`  header=${headerBits}bits -> end=${pos} leftoverBits=${leftover}${fail ? ' FAIL ' + fail : ''}`);
    if (!fail && leftover >= 0 && leftover <= 16) {
      // print first rows of first two groups + last leftovers bits
      for (const g of groups.slice(0, 2)) {
        console.log(`    t=${g.t} first rows: ${g.vals.slice(0, 5).map((v) => v.map((x) => x.toFixed(4)).join('/')).join(' | ')}`);
      }
      console.log(`    last 24 bits: ${bitsToStr(stream, pos - 24, 24)}`);
    }
  }
}
