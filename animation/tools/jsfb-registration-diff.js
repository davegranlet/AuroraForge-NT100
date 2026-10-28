'use strict';

// Summarize and diff a stock vs modded (oracle) .jsfb registration file.
// Reports identifier, root/vector layout, and record counts so we can see the
// exact number of records a new entry adds.
//
// Usage: node tools/jsfb-registration-diff.js <stock.jsfb> <oracle.jsfb>

const fs = require('fs');

function u16(b, o) { return b.readUInt16LE(o); }
function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }

function tableAt(b, off) {
  if (off < 0 || off + 4 > b.length) return null;
  const vt = off - i32(b, off);
  if (vt < 0 || vt >= b.length) return null;
  const vbs = u16(b, vt);
  const obs = u16(b, vt + 2);
  if (vbs < 4 || vbs > 65535 || obs < 4 || obs > 65535) return null;
  const fields = [];
  for (let i = 0; i < (vbs - 4) / 2; i++) {
    const r = u16(b, vt + 4 + i * 2);
    fields.push(r === 0 ? null : off + r);
  }
  return { off, vt, vbs, obs, fields };
}

function isTable(b, off) { return tableAt(b, off) !== null; }

// Resolve a field offset to a vector length. Follows: root -> field0 (uoffset)
// -> maybe a wrapper table -> field0 -> vector length.
function rootVectorLength(b) {
  const root = u32(b, 0);
  const t = tableAt(b, root);
  if (!t) return null;
  let vec = null;
  for (const fo of t.fields) {
    if (fo === null) continue;
    const target = fo + u32(b, fo);
    if (isTable(b, target)) {
      const w = tableAt(b, target);
      for (const wfo of w.fields) {
        if (wfo === null) continue;
        const wtgt = wfo + u32(b, wfo);
        const len = u32(b, wtgt);
        if (len > 0 && len < 1000000 && wtgt + 4 + len * 4 <= b.length) return { root, vector: wtgt, count: len };
      }
    } else {
      const len = u32(b, target);
      if (len > 0 && len < 1000000 && target + 4 + len * 4 <= b.length) return { root, vector: target, count: len };
    }
  }
  return null;
}

function summarize(file) {
  const b = fs.readFileSync(file);
  const ident = b.toString('latin1', 4, 8);
  const info = rootVectorLength(b);
  return { file, size: b.length, ident, ...(info || { root: null, vector: null, count: null }) };
}

const stock = process.argv[2];
const oracle = process.argv[3];
if (!stock || !oracle) { console.error('Usage: node tools/jsfb-registration-diff.js <stock.jsfb> <oracle.jsfb>'); process.exit(2); }

const s = summarize(stock);
const o = summarize(oracle);
const delta = (s.count != null && o.count != null) ? o.count - s.count : null;
console.log(JSON.stringify({ ident: s.ident, stock: { size: s.size, root: s.root, vector: s.vector, count: s.count }, oracle: { size: o.size, root: o.root, vector: o.vector, count: o.count }, delta }, null, 2));
