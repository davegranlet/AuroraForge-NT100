#!/usr/bin/env node
'use strict';

// Clean-room FlatBuffer writer for WWE 2K25 VictoryListData.jsfb (identifier: Vict).
// It reads a current-game list, clones a complete existing entry, and appends a new
// entry.  It deliberately does not use, copy, or require Tribute/PWM code or files.

const fs = require('fs');
const path = require('path');

function die(message) { console.error(message); process.exit(2); }
function option(name, required = false) {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (required && (value === undefined || value.startsWith('--'))) die(`Missing ${name}`);
  return value;
}
function numberOption(name, required = false) {
  const value = option(name, required);
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) die(`${name} must be an unsigned integer`);
  return Number(value);
}

const source = process.argv[2];
const output = process.argv[3];
if (!source || !output) {
  die('Usage: node append_2k25_victory_entry.js <input.jsfb> <output.jsfb> --entry-id N --clone-id N [--name-string N] [--type N] [--hide-id N] [--some-id N] [--face N] [--heel N] [--title-face N] [--title-heel N] [--double-title-face N]');
}
const sourceBuffer = fs.readFileSync(source);
if (sourceBuffer.subarray(4, 8).toString('ascii') !== 'Vict') die('Input is not VictoryListData.jsfb (missing Vict identifier)');
const u8 = (o) => sourceBuffer.readUInt8(o);
const u16 = (o) => sourceBuffer.readUInt16LE(o);
const u32 = (o) => sourceBuffer.readUInt32LE(o);
const u64 = (o) => sourceBuffer.readBigUInt64LE(o);
const i32 = (o) => sourceBuffer.readInt32LE(o);
function fieldAt(table, id) {
  const vtable = table - i32(table);
  const slot = vtable + 4 + id * 2;
  if (slot + 2 > vtable + u16(vtable)) return null;
  const relative = u16(slot);
  return relative ? table + relative : null;
}
function offsetField(table, id) { const at = fieldAt(table, id); return at === null ? null : at + u32(at); }
function scalar(table, id, reader, fallback = 0) { const at = fieldAt(table, id); return at === null ? fallback : reader(at); }
function readRecords() {
  const root = u32(0);
  const wrapper = offsetField(root, 0);
  const vector = offsetField(wrapper, 0);
  const count = u32(vector);
  const records = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4;
    const table = slot + u32(slot);
    const present = Array.from({ length: 10 }, (_, field) => fieldAt(table, field) !== null);
    records.push({
      wrestlerId: scalar(table, 0, u16), nameString: scalar(table, 1, u32), type1: scalar(table, 2, u8),
      hideId: scalar(table, 3, u64), someId: scalar(table, 4, u32), victoryFace: scalar(table, 5, u32),
      victoryHeel: scalar(table, 6, u32), titleVictoryFace: scalar(table, 7, u32), titleVictoryHeel: scalar(table, 8, u32),
      doubleTitleVictoryFace: scalar(table, 9, u32), present,
    });
  }
  return records;
}

const entryId = numberOption('--entry-id', true);
const cloneId = numberOption('--clone-id', true);
if (entryId > 65535 || cloneId > 65535) die('Entry IDs must fit unsigned 16-bit values');
const records = readRecords();
if (records.some((record) => record.wrestlerId === entryId)) die(`Entry ${entryId} already exists; refusing to create a duplicate.`);
const clone = records.find((record) => record.wrestlerId === cloneId);
if (!clone) die(`Clone entry ${cloneId} was not found in the current-game list.`);
const appended = { ...clone, present: [...clone.present], wrestlerId: entryId };
appended.present[0] = true;
const typeValue = numberOption('--type');
if (typeValue !== undefined) {
  if (typeValue > 0xff) die('--type must fit an unsigned byte');
  appended.type1 = typeValue;
  appended.present[2] = true;
}
const hideText = option('--hide-id');
if (hideText !== undefined) {
  if (!/^\d+$/.test(hideText)) die('--hide-id must be an unsigned 64-bit integer');
  const hideValue = BigInt(hideText);
  if (hideValue > 0xffffffffffffffffn) die('--hide-id must fit an unsigned 64-bit integer');
  appended.hideId = hideValue;
  appended.present[3] = true;
}
const overrides = [
  ['--name-string', 'nameString', 1], ['--some-id', 'someId', 4], ['--face', 'victoryFace', 5], ['--heel', 'victoryHeel', 6],
  ['--title-face', 'titleVictoryFace', 7], ['--title-heel', 'titleVictoryHeel', 8], ['--double-title-face', 'doubleTitleVictoryFace', 9],
];
for (const [flag, property, field] of overrides) {
  const value = numberOption(flag);
  if (value !== undefined) { appended[property] = value; appended.present[field] = true; }
}
records.push(appended);

// The schema is a root table -> wrapper table -> vector of 10-field record tables.
// Records are written fresh from parsed scalar values, retaining every supported field.
const headerSize = 8;
const rootVtableOffset = 8;
const rootTableOffset = 16;
const wrapperVtableOffset = 26;
const wrapperTableOffset = 32;
const vectorOffset = 40;
const vectorBytes = 4 + records.length * 4;
const recordVtableBytes = 24;
const recordTableBytes = 44;
const total = vectorOffset + vectorBytes + records.length * (recordVtableBytes + recordTableBytes);
const out = Buffer.alloc(total);
out.writeUInt32LE(rootTableOffset, 0);
out.write('Vict', 4, 4, 'ascii');
// Root and wrapper each have only field 0, pointing forward.
out.writeUInt16LE(6, rootVtableOffset); out.writeUInt16LE(10, rootVtableOffset + 2); out.writeUInt16LE(4, rootVtableOffset + 4);
out.writeInt32LE(rootTableOffset - rootVtableOffset, rootTableOffset); out.writeUInt32LE(wrapperTableOffset - (rootTableOffset + 4), rootTableOffset + 4);
out.writeUInt16LE(6, wrapperVtableOffset); out.writeUInt16LE(8, wrapperVtableOffset + 2); out.writeUInt16LE(4, wrapperVtableOffset + 4);
out.writeInt32LE(wrapperTableOffset - wrapperVtableOffset, wrapperTableOffset); out.writeUInt32LE(vectorOffset - (wrapperTableOffset + 4), wrapperTableOffset + 4);
out.writeUInt32LE(records.length, vectorOffset);
const fieldOffsets = [6, 8, 5, 36, 12, 16, 20, 24, 28, 32];
let cursor = vectorOffset + vectorBytes;
records.forEach((record, index) => {
  const vtable = cursor;
  const table = vtable + recordVtableBytes;
  out.writeUInt16LE(24, vtable); out.writeUInt16LE(44, vtable + 2);
  fieldOffsets.forEach((offset, field) => out.writeUInt16LE(record.present[field] ? offset : 0, vtable + 4 + field * 2));
  out.writeInt32LE(table - vtable, table);
  out.writeUInt8(record.type1, table + 5);
  out.writeUInt16LE(record.wrestlerId, table + 6);
  out.writeUInt32LE(record.nameString, table + 8);
  out.writeUInt32LE(record.someId, table + 12);
  out.writeUInt32LE(record.victoryFace, table + 16);
  out.writeUInt32LE(record.victoryHeel, table + 20);
  out.writeUInt32LE(record.titleVictoryFace, table + 24);
  out.writeUInt32LE(record.titleVictoryHeel, table + 28);
  out.writeUInt32LE(record.doubleTitleVictoryFace, table + 32);
  out.writeBigUInt64LE(BigInt(record.hideId), table + 36);
  const slot = vectorOffset + 4 + index * 4;
  out.writeUInt32LE(table - slot, slot);
  cursor += recordVtableBytes + recordTableBytes;
});
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), bytes: out.length, sourceRecords: records.length - 1, recordCount: records.length, appended: { ...appended, hideId: appended.hideId.toString() } }, null, 2));
