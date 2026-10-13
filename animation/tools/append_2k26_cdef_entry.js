#!/usr/bin/env node
'use strict';
// Append cutscene-definition entries to a WWE 2K26 Cutscene/CdefDatabase.jsfb.
//
// CdefDatabase.jsfb = FlatBuffer "Cont" with a root vector of per-PAIR tables:
//   slot0 u32  pair id (phase * 10000 + motion id)
//   slot1 u32  definition size (source-motion value; copied from the clip donor)
//   slot2 u32  1 (constant in stock)
//
// Usage: node append_2k26_cdef_entry.js <in.jsfb> <out.jsfb> --entries <entries.json>
// entries.json: [{ "pairId": 1016181, "size": 242 }]
const fs = require('fs');
const path = require('path');
const {
  readHeader, tableAt, fieldByIndex, followChain, readVector,
  collectSlots, collectSoffs, collectRootSoff, applyShiftRepair,
} = require('./jsfb-append-lib');

function die(m) { console.error(m); process.exit(2); }
const [input, output] = process.argv.slice(2, 4);
const entriesPathIdx = process.argv.indexOf('--entries');
if (!input || !output || entriesPathIdx < 0) die('Usage: node append_2k26_cdef_entry.js <in> <out> --entries <entries.json>');
const entries = JSON.parse(fs.readFileSync(process.argv[entriesPathIdx + 1], 'utf8'));
if (!Array.isArray(entries) || !entries.length) die('entries.json must be a non-empty array');

function buildRecord(pairId, size, one) {
  const rec = Buffer.alloc(28);
  rec.writeUInt16LE(10, 0);
  rec.writeUInt16LE(16, 2);
  rec.writeUInt16LE(4, 4); rec.writeUInt16LE(8, 6); rec.writeUInt16LE(12, 8);
  rec.writeInt32LE(12, 12);
  rec.writeUInt32LE(pairId >>> 0, 16);
  rec.writeUInt32LE(size >>> 0, 20);
  rec.writeUInt32LE(one >>> 0, 24);
  return rec;
}

function readEntry(buf, table) {
  const r = tableAt(buf, table);
  if (!r) return null;
  const f0 = fieldByIndex(r, 0), f1 = fieldByIndex(r, 1), f2 = fieldByIndex(r, 2);
  return {
    pairId: f0 ? buf.readUInt32LE(f0.at) : null,
    size: f1 ? buf.readUInt32LE(f1.at) : null,
    one: f2 ? buf.readUInt32LE(f2.at) : null,
  };
}

const buf = fs.readFileSync(input);
const { root } = readHeader(buf, 'Cont');
const vec = followChain(buf, root, [0]);
const vecInfo = readVector(buf, vec);
const before = new Map();
const existingPairs = new Set();
for (let i = 0; i < vecInfo.count; i++) {
  const t = vecInfo.tables[i];
  if (t === null) continue;
  const e = readEntry(buf, t);
  if (e) { before.set(i, e); if (e.pairId !== null) existingPairs.add(e.pairId >>> 0); }
}

const skipExisting = process.argv.includes('--skip-existing-pair');
const records = [];
const prepared = [];
for (const e of entries) {
  const pairId = Number(e.pairId);
  const size = Number(e.size);
  if (!Number.isInteger(pairId) || !Number.isInteger(size)) die(`bad entry ${JSON.stringify(e)}`);
  if (skipExisting && existingPairs.has(pairId >>> 0)) { console.error(`skip pair ${pairId}: already present`); continue; }
  prepared.push({ pairId, size });
  records.push(buildRecord(pairId, size, e.one === undefined ? 1 : Number(e.one)));
}

const refs = [];
refs.push(...collectSlots(buf, vecInfo));
refs.push(...collectRootSoff(buf, root));
const rootResolved = tableAt(buf, root);
if (rootResolved) {
  const f0 = fieldByIndex(rootResolved, 0);
  if (f0 && f0.size >= 4) refs.push({ pos: f0.at, target: f0.at + buf.readUInt32LE(f0.at), kind: 'uoffset' });
}
const tables = vecInfo.tables.filter((t) => t !== null);
refs.push(...collectSoffs(buf, tables));

const insertAt = vecInfo.slotsOff + vecInfo.count * 4;
const recordsSize = records.reduce((a, r) => a + r.length, 0);
const delta = entries.length * 4 + recordsSize;
const out = Buffer.alloc(buf.length + delta);
buf.copy(out, 0, 0, insertAt);
out.writeUInt32LE(vecInfo.count + entries.length, vecInfo.countOff);
buf.copy(out, insertAt + delta, insertAt, buf.length);
applyShiftRepair(out, refs, insertAt, delta);
let cursor = insertAt + entries.length * 4;
prepared.forEach((p, i) => {
  const slotPos = insertAt + i * 4;
  const tablePos = cursor + 12;
  out.writeUInt32LE(tablePos - slotPos, slotPos);
  records[i].copy(out, cursor);
  cursor += records[i].length;
});

const afterInfo = readVector(out, vec);
if (afterInfo.count !== vecInfo.count + entries.length) die('count mismatch after splice');
let checked = 0;
for (const [i, e] of before) {
  const a = readEntry(out, afterInfo.tables[i]);
  if (JSON.stringify(a) !== JSON.stringify(e)) die(`existing entry ${i} changed: ${JSON.stringify(a)} != ${JSON.stringify(e)}`);
  checked++;
}
for (let i = 0; i < entries.length; i++) {
  const t = afterInfo.tables[vecInfo.count + i];
  const e = readEntry(out, t);
  const want = prepared[i];
  if (!e || e.pairId !== want.pairId || e.size !== want.size) die(`new entry ${i} bad: ${JSON.stringify(e)}`);
}

// Stock CdefDatabase is sorted by pairId and the game resolves pairs by that
// order, so reorder the vector slots into merged sorted position. Slot rels
// are recomputed for their new positions; table bytes stay untouched.
if (process.argv.indexOf('--no-sort') < 0) {
  const all = [];
  for (let i = 0; i < afterInfo.count; i++) {
    const t = afterInfo.tables[i];
    const e = readEntry(out, t);
    if (!e) die('bad entry while sorting at index ' + i);
    all.push({ target: t, pairId: e.pairId, size: e.size });
  }
  const sorted = all.slice().sort((a, b) => a.pairId - b.pairId);
  const seen = new Set();
  for (let i = 0; i < sorted.length; i++) {
    const slotPos = afterInfo.slotsOff + i * 4;
    out.writeUInt32LE(sorted[i].target - slotPos, slotPos);
    if (seen.has(sorted[i].pairId)) die('duplicate pairId after sort: ' + sorted[i].pairId);
    seen.add(sorted[i].pairId);
    if (i > 0 && sorted[i].pairId < sorted[i - 1].pairId) die('sort failed');
  }
  for (const p of prepared) if (!seen.has(p.pairId)) die('new pair missing after sort: ' + p.pairId);
}

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({
  output: path.resolve(output),
  sourceBytes: buf.length,
  bytes: out.length,
  entriesBefore: vecInfo.count,
  appended: entries.length,
  entriesAfter: afterInfo.count,
  existingVerified: checked,
}, null, 2));
