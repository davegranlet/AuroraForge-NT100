#!/usr/bin/env node
'use strict';
// Append a new victory record by cloning one complete existing "Vict" record and
// retaining every original object in the flattened original layout.  Existing
// records are never rebuilt; only the root/wrapper/vector pointer chain and the
// cloned record's id/name (plus requested optional fields) are written fresh.
const fs = require('fs');
const path = require('path');
function die(message) { console.error(message); process.exit(2); }
const [source, output] = process.argv.slice(2, 4);
function option(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
function int(name, max) { const value = option(name); if (!value || !/^\d+$/.test(value)) die(`Missing or invalid ${name}`); const n = Number(value); if (!Number.isSafeInteger(n) || n > max) die(`${name} out of range`); return n; }
if (!source || !output) die('Usage: node append_2k25_victory_clone_graph.js input output --entry-id N --clone-id N --name-string N [--some-id N] [--face N] [--heel N] [--title-face N] [--title-heel N] [--double-title-face N] [--type N] [--hide-id N]');
const b = fs.readFileSync(source);
if (b.toString('ascii', 4, 8) !== 'Vict') die('Input is not VictoryListData.jsfb');
const u8 = (o) => b.readUInt8(o), u16 = (o) => b.readUInt16LE(o), u32 = (o) => b.readUInt32LE(o), i32 = (o) => b.readInt32LE(o);
function field(table, id) { const vtable = table - i32(table), slot = vtable + 4 + id * 2; if (slot + 2 > vtable + u16(vtable)) return null; const relative = u16(slot); return relative ? table + relative : null; }
function target(table, id) { const at = field(table, id); if (at === null) die(`Missing required offset field ${id}`); return at + u32(at); }
const root = u32(0);
const rootVtable = root - i32(root);
if ((u16(rootVtable) - 4) / 2 !== 1) die('Unexpected victory root layout');
const wrapper = target(root, 0);
const wrapperVtable = wrapper - i32(wrapper);
if ((u16(wrapperVtable) - 4) / 2 !== 1) die('Unexpected victory wrapper layout');
const vector = target(wrapper, 0);
const count = u32(vector);
const tables = Array.from({ length: count }, (_, index) => { const slot = vector + 4 + index * 4; return slot + u32(slot); });
const entryId = int('--entry-id', 0xffff), cloneId = int('--clone-id', 0xffff), nameString = int('--name-string', 0xffffffff);
if (tables.some((table) => u16(field(table, 0)) === entryId)) die(`Entry ${entryId} already exists`);
const clone = tables.find((table) => u16(field(table, 0)) === cloneId);
if (!clone) die(`Clone ${cloneId} not found in the victory list`);
const cloneVtable = clone - i32(clone), cloneVtableBytes = u16(cloneVtable), cloneTableBytes = u16(cloneVtable + 2);
const cloneIdAt = field(clone, 0), cloneNameAt = field(clone, 1);
if (cloneIdAt === null || cloneNameAt === null) die('Clone record is missing its id/name fields');
const patches = [{ at: cloneIdAt, value: BigInt(entryId), width: 2 }, { at: cloneNameAt, value: BigInt(nameString), width: 4 }];
const patchFlags = [['--type', 2, 1], ['--hide-id', 3, 8], ['--some-id', 4, 4], ['--face', 5, 4], ['--heel', 6, 4], ['--title-face', 7, 4], ['--title-heel', 8, 4], ['--double-title-face', 9, 4]];
for (const [flag, id, width] of patchFlags) {
  const text = option(flag);
  if (text === undefined) continue;
  if (!/^\d+$/.test(text)) die(`${flag} must be an unsigned integer`);
  const at = field(clone, id);
  if (at === null) die(`Clone record has no field ${id} to patch for ${flag}`);
  patches.push({ at, value: BigInt(text), width });
  if (width === 8 && BigInt(text) > 0xffffffffffffffffn) die(`${flag} is out of range`);
}
const rootVtableBytes = u16(rootVtable), rootTableBytes = u16(rootVtable + 2);
const wrapperVtableBytes = u16(wrapperVtable), wrapperTableBytes = u16(wrapperVtable + 2);
const newRootVtable = 8, newRoot = (newRootVtable + rootVtableBytes + 7) & ~7;
const newWrapperVtable = newRoot + rootTableBytes, newWrapper = (newWrapperVtable + wrapperVtableBytes + 7) & ~7;
const newVector = newWrapper + wrapperTableBytes;
const recordVtable = newVector + 4 + (count + 1) * 4;
const record = (recordVtable + cloneVtableBytes + 7) & ~7;
const shift = (record + cloneTableBytes + 7) & ~7;
const out = Buffer.alloc(shift + b.length);
b.copy(out, shift);
out.writeUInt32LE(newRoot, 0);
out.write('Vict', 4, 4, 'ascii');
b.copy(out, newRootVtable, rootVtable, rootVtable + rootVtableBytes);
b.copy(out, newRoot, root, root + rootTableBytes);
out.writeInt32LE(newRoot - newRootVtable, newRoot);
const rootFieldAt = u16(newRootVtable + 4), newRootFieldPos = newRoot + rootFieldAt;
out.writeUInt32LE(newWrapper - newRootFieldPos, newRootFieldPos);
b.copy(out, newWrapperVtable, wrapperVtable, wrapperVtable + wrapperVtableBytes);
b.copy(out, newWrapper, wrapper, wrapper + wrapperTableBytes);
out.writeInt32LE(newWrapper - newWrapperVtable, newWrapper);
const wrapperFieldAt = u16(newWrapperVtable + 4), newWrapperFieldPos = newWrapper + wrapperFieldAt;
out.writeUInt32LE(newVector - newWrapperFieldPos, newWrapperFieldPos);
out.writeUInt32LE(count + 1, newVector);
for (let index = 0; index < count; index++) { const at = newVector + 4 + index * 4; out.writeUInt32LE(tables[index] + shift - at, at); }
const appendedSlot = newVector + 4 + count * 4;
out.writeUInt32LE(record - appendedSlot, appendedSlot);
b.copy(out, recordVtable, cloneVtable, cloneVtable + cloneVtableBytes);
b.copy(out, record, clone, clone + cloneTableBytes);
out.writeInt32LE(record - recordVtable, record);
for (const patch of patches) {
  const at = record + (patch.at - clone);
  if (patch.width === 2) out.writeUInt16LE(Number(patch.value), at);
  else if (patch.width === 1) out.writeUInt8(Number(patch.value), at);
  else if (patch.width === 4) out.writeUInt32LE(Number(patch.value), at);
  else out.writeBigUInt64LE(patch.value, at);
}
if (!out.subarray(shift).equals(b)) die('Original graph failed byte-preservation check');
for (let index = 0; index < count; index++) { const at = newVector + 4 + index * 4; if (at + out.readUInt32LE(at) !== tables[index] + shift) die('Existing record pointer changed'); }
if (appendedSlot + out.readUInt32LE(appendedSlot) !== record) die('Appended record pointer invalid');
if (out.readUInt32LE(0) !== newRoot) die('Root offset header invalid');
if (out.toString('ascii', 4, 8) !== 'Vict') die('Identifier header invalid');
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), sourceBytes: b.length, bytes: out.length, shift, recordCount: count + 1, cloneId, entryId, cloneVtableBytes, cloneTableBytes, preserved: true }, null, 2));
