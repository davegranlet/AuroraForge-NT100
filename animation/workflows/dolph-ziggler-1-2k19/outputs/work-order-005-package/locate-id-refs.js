'use strict';
// locate-id-refs.js - classify every occurrence of a record id inside native clips files:
// table entry / payload head / which payload section. (order 005: constrain the sweep)
const fs = require('fs');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const MASK = (1n << 64n) - 1n;
function fnv(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');

const phases = [
  ['p0', 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1000273.clips',
    ['273_a_00_m', '273_a_00_m_facial', '273_00_c0', '273_00_o5009', '273_00_o2755_gen_ringmat_1']],
  ['p3', 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1300273.clips',
    ['273_a_15_m', '273_a_15_m_facial', '273_15_c0', '273_15_o5009', '273_15_o2755_gen_ringmat_1', '273_15_r14', '273_15_r15']],
];
for (const [tag, file, names] of phases) {
  const buf = fs.readFileSync(file);
  const p = parse(buf, { includeRaw: true });
  console.log('════ ' + tag + ' ' + file);
  for (const nm of names) {
    const id = fnv(nm); const needle = Buffer.alloc(8); needle.writeBigUInt64LE(id);
    let i = 0, hits = [];
    while ((i = buf.indexOf(needle, i)) !== -1) {
      let where = 'table+payloadHead';
      const rec = p.records.find((r) => i >= r.offset && i < r.offset + r.length);
      if (rec) {
        if (i === rec.offset) where = 'payload-rel0(recordID)';
        else {
          where = null;
          for (const s of rec.sections) {
            const sOff = rec.offset + parseInt(s.relativeOffset, 16);
            if (i >= sOff && i < sOff + s.bytes) { where = 'sec[' + s.name + '] rel' + (i - sOff) + ' of ' + s.bytes + 'B kind'; break; }
          }
          if (!where) where = 'payload-rel' + (i - rec.offset) + '-other';
          where = 'rec' + rec.index + '(' + rec.trackIdentifiers.length + 'tr) ' + where;
        }
      } else if (i >= 0x18 && i < 0x18 + p.records.length * 16) {
        where = 'table entry rec' + ((i - 0x18) / 16);
      }
      hits.push(i + ':' + where);
      i++;
    }
    console.log('  ' + nm.padEnd(30), H(id), hits.join(' | '));
  }
}
