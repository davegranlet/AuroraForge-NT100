#!/usr/bin/env node
'use strict';
// Append N writer-shaped (pointer-free) section-8 rows to a live EntranceListData.jsfb
// while preserving the entire original object graph byte-for-byte.
// Row layout matches the proven 14000/Tribute recipe:
//   vtable 24 / table 36, fields [id u16 @+8, name u32 @+12, type u8 @+7,
//   f9 u16 @+10, f4..f8 u32 @+16..32] (field 3 absent).
const fs = require('fs');
const path = require('path');

function die(message) { console.error(message); process.exit(2); }
const [source, output] = process.argv.slice(2, 4);
function option(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
if (!source || !output) die('Usage: node append_2k25_entrance_scalar_rows.js <in> <out> --entries <entries.json> | --entry-id N --name-string N');
const entriesPath = option('--entries');
let entries;
if (entriesPath) {
  if (!fs.existsSync(entriesPath)) die('Missing --entries <entries.json>');
  entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
} else {
  const idRaw = option('--entry-id');
  const nameRaw = option('--name-string');
  if (idRaw === undefined || nameRaw === undefined || !/^\d+$/.test(idRaw) || !/^\d+$/.test(nameRaw)) die('Provide --entries <entries.json> or both --entry-id N --name-string N');
  entries = [{ id: Number(idRaw), nameString: Number(nameRaw) }];
}
if (!Array.isArray(entries) || !entries.length) die('entries.json must be a non-empty array');

const b = fs.readFileSync(source);
if (b.toString('ascii', 4, 8) !== 'Entr') die('Input is not Entr');

function field(buf, t, id) {
  const vt = t - buf.readInt32LE(t), slot = vt + 4 + id * 2;
  if (slot + 2 > vt + buf.readUInt16LE(vt)) return null;
  const rel = buf.readUInt16LE(slot);
  return rel ? t + rel : null;
}
function target(buf, t, id) { const p = field(buf, t, id); if (p === null) die(`Missing section field ${id}`); return p + buf.readUInt32LE(p); }

const oldRoot = b.readUInt32LE(0);
const oldVector = target(b, target(b, oldRoot, 8), 0);
const oldCount = b.readUInt32LE(oldVector);
const oldTables = Array.from({ length: oldCount }, (_, i) => {
  const slot = oldVector + 4 + i * 4;
  return slot + b.readUInt32LE(slot);
});
const existingIds = new Set();
for (const t of oldTables) { const at = field(b, t, 0); if (at !== null) existingIds.add(b.readUInt16LE(at)); }
for (const e of entries) {
  if (!Number.isInteger(e.id) || e.id < 0 || e.id > 0xffff) die(`entry id out of range: ${JSON.stringify(e)}`);
  if (!Number.isInteger(e.nameString) || e.nameString < 0 || e.nameString > 0xffffffff) die(`entry nameString out of range: ${JSON.stringify(e)}`);
  if (existingIds.has(e.id)) die(`entry ${e.id} already exists`);
}

const N = entries.length;
const total = oldCount + N;
const rootVtable = 8, root = 32, wrapperVtable = 72, wrapper = 80, vector = 88;
const vtablesStart = vector + 4 + total * 4;
const recordsStart = vtablesStart + N * 24;
const shift = Math.ceil((recordsStart + N * 36) / 8) * 8;
const out = Buffer.alloc(shift + b.length);
b.copy(out, shift);

out.writeUInt32LE(root, 0);
out.write('Entr', 4, 4, 'ascii');
out.writeUInt16LE(22, rootVtable); out.writeUInt16LE(40, rootVtable + 2);
out.writeInt32LE(root - rootVtable, root);
for (let i = 0; i < 9; i += 1) {
  out.writeUInt16LE(4 + i * 4, rootVtable + 4 + i * 2);
  const at = root + 4 + i * 4;
  const to = i === 8 ? wrapper : target(b, oldRoot, i) + shift;
  out.writeUInt32LE(to - at, at);
}
out.writeUInt16LE(6, wrapperVtable); out.writeUInt16LE(8, wrapperVtable + 2); out.writeUInt16LE(4, wrapperVtable + 4);
out.writeInt32LE(wrapper - wrapperVtable, wrapper);
out.writeUInt32LE(vector - (wrapper + 4), wrapper + 4);
out.writeUInt32LE(total, vector);
oldTables.forEach((t, i) => {
  const slot = vector + 4 + i * 4;
  out.writeUInt32LE(t + shift - slot, slot);
});
entries.forEach((e, i) => {
  const vt = vtablesStart + i * 24;
  const rec = recordsStart + i * 36;
  const slot = vector + 4 + (oldCount + i) * 4;
  out.writeUInt32LE(rec - slot, slot);
  out.writeUInt16LE(24, vt); out.writeUInt16LE(36, vt + 2);
  [8, 12, 7, 0, 16, 20, 24, 28, 32, 10].forEach((off, n) => out.writeUInt16LE(off, vt + 4 + n * 2));
  out.writeInt32LE(rec - vt, rec);
  out.writeUInt8(1, rec + 7);
  out.writeUInt16LE(e.id, rec + 8);
  out.writeUInt16LE(e.field9 !== undefined ? e.field9 : 10226, rec + 10);
  out.writeUInt32LE(e.nameString >>> 0, rec + 12);
  out.writeUInt32LE(e.field4 !== undefined ? e.field4 : 852, rec + 16);
  out.writeUInt32LE(e.field5 !== undefined ? e.field5 : 852, rec + 20);
  out.writeUInt32LE(e.field6 !== undefined ? e.field6 : 1161, rec + 24);
  out.writeUInt32LE(e.field7 !== undefined ? e.field7 : 26008, rec + 28);
  out.writeUInt32LE(e.field8 !== undefined ? e.field8 : 2236, rec + 32);
});

if (!out.subarray(shift).equals(b)) die('Original graph failed byte-preservation check');
for (let i = 0; i < 8; i += 1) if (target(out, root, i) !== target(b, oldRoot, i) + shift) die(`Root section ${i} pointer mismatch`);
const newVector = target(out, target(out, root, 8), 0);
if (out.readUInt32LE(newVector) !== total) die('Vector count mismatch');
oldTables.forEach((t, i) => { const slot = newVector + 4 + i * 4; if (slot + out.readUInt32LE(slot) !== t + shift) die(`Original slot ${i} mismatch`); });
entries.forEach((e, i) => {
  const slot = newVector + 4 + (oldCount + i) * 4;
  const rec = slot + out.readUInt32LE(slot);
  const vt = rec - out.readInt32LE(rec);
  if (out.readUInt16LE(vt) !== 24 || out.readUInt16LE(vt + 2) !== 36) die(`New row ${i} vtable mismatch`);
  if (out.readUInt16LE(rec + 8) !== e.id || out.readUInt32LE(rec + 12) !== (e.nameString >>> 0)) die(`New row ${i} patch mismatch`);
});

fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), sourceBytes: b.length, bytes: out.length, shift, originalTemplates: oldCount, templates: total, appended: N, validated: true }, null, 2));
