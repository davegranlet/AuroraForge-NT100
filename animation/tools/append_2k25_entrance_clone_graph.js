#!/usr/bin/env node
'use strict';
// Append a full section-8 clone while retaining every original object at its
// original relative layout. Intended for visibility controls, not asset import.
const fs = require('fs');
const path = require('path');
function die(message) { console.error(message); process.exit(2); }
const [source, output] = process.argv.slice(2, 4);
function option(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
function int(name, max) { const value = option(name); if (!value || !/^\d+$/.test(value)) die(`Missing or invalid ${name}`); const n = Number(value); if (!Number.isSafeInteger(n) || n > max) die(`${name} out of range`); return n; }
if (!source || !output) die('Usage: node append_2k25_entrance_clone_graph.js input output --entry-id N --clone-id N --name-string N');
const b = fs.readFileSync(source);
if (b.toString('ascii', 4, 8) !== 'Entr') die('Input is not EntranceListData.jsfb');
const u16 = (o) => b.readUInt16LE(o), u32 = (o) => b.readUInt32LE(o), i32 = (o) => b.readInt32LE(o);
function field(table, id) { const vtable = table - i32(table), slot = vtable + 4 + id * 2; if (slot + 2 > vtable + u16(vtable)) return null; const relative = u16(slot); return relative ? table + relative : null; }
function target(table, id) { const at = field(table, id); if (at === null) die(`Missing required offset field ${id}`); return at + u32(at); }
const root = u32(0), oldVector = target(target(root, 8), 0), count = u32(oldVector);
const entryId = int('--entry-id', 0xffff), cloneId = int('--clone-id', 0xffff), nameString = int('--name-string', 0xffffffff);
const tables = Array.from({ length: count }, (_, index) => { const slot = oldVector + 4 + index * 4; return slot + u32(slot); });
if (tables.some((table) => u16(field(table, 0)) === entryId)) die(`Entry ${entryId} already exists`);
const clone = tables.find((table) => u16(field(table, 0)) === cloneId);
if (!clone) die(`Clone ${cloneId} not found in section 8`);
const cloneVtable = clone - i32(clone), cloneVtableBytes = u16(cloneVtable), cloneTableBytes = u16(cloneVtable + 2);
const rootVtable = 8, newRoot = 32, wrapperVtable = 72, wrapper = 80, vector = 88;
const recordVtable = vector + 4 + (count + 1) * 4;
const record = (recordVtable + cloneVtableBytes + 7) & ~7;
const shift = (record + cloneTableBytes + 7) & ~7;
const out = Buffer.alloc(shift + b.length);
b.copy(out, shift);
out.writeUInt32LE(newRoot, 0); out.write('Entr', 4, 4, 'ascii');
out.writeUInt16LE(22, rootVtable); out.writeUInt16LE(40, rootVtable + 2); out.writeInt32LE(newRoot - rootVtable, newRoot);
for (let id = 0; id < 9; id++) { out.writeUInt16LE(4 + id * 4, rootVtable + 4 + id * 2); const at = newRoot + 4 + id * 4; const to = id === 8 ? wrapper : target(root, id) + shift; out.writeUInt32LE(to - at, at); }
out.writeUInt16LE(6, wrapperVtable); out.writeUInt16LE(8, wrapperVtable + 2); out.writeUInt16LE(4, wrapperVtable + 4); out.writeInt32LE(wrapper - wrapperVtable, wrapper); out.writeUInt32LE(vector - (wrapper + 4), wrapper + 4); out.writeUInt32LE(count + 1, vector);
tables.concat([null]).forEach((table, index) => { const at = vector + 4 + index * 4; out.writeUInt32LE((table === null ? record : table + shift) - at, at); });
b.copy(out, recordVtable, cloneVtable, cloneVtable + cloneVtableBytes);
b.copy(out, record, clone, clone + cloneTableBytes);
out.writeInt32LE(record - recordVtable, record);
out.writeUInt16LE(entryId, record + (field(clone, 0) - clone));
out.writeUInt32LE(nameString, record + (field(clone, 1) - clone));
if (!out.subarray(shift).equals(b)) die('Original graph failed byte-preservation check');
const cloneFields = Array.from({ length: (cloneVtableBytes - 4) / 2 }, (_, id) => field(clone, id) === null ? null : field(clone, id) - clone);
const newVtable = record - out.readInt32LE(record);
const newFields = Array.from({ length: (out.readUInt16LE(newVtable) - 4) / 2 }, (_, id) => { const slot = newVtable + 4 + id * 2, rel = out.readUInt16LE(slot); return rel ? record + rel : null; });
if (JSON.stringify(cloneFields) !== JSON.stringify(newFields.map((at) => at === null ? null : at - record))) die('Clone vtable shape changed');
for (let index = 0; index < tables.length; index++) { const at = vector + 4 + index * 4; if (at + out.readUInt32LE(at) !== tables[index] + shift) die('Existing template pointer changed'); }
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true }); fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), sourceBytes: b.length, bytes: out.length, shift, templateCount: count + 1, cloneId, entryId, cloneVtableBytes, cloneTableBytes, preserved: true }, null, 2));
