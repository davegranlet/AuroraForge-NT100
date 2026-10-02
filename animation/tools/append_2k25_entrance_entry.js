#!/usr/bin/env node
'use strict';

// Clean-room FlatBuffer writer for WWE 2K25 EntranceListData.jsfb (identifier: Entr).
// It rebuilds the nine current-game vectors from parsed scalar values, preserving
// every existing record and appending one template record to section 8.  It does
// not use, copy, or require TRIBUTE/PWM code or files.

const fs = require('fs');
const path = require('path');
function die(message) { console.error(message); process.exit(2); }
function value(flag, required = false) {
  const index = process.argv.indexOf(flag);
  const result = index < 0 ? undefined : process.argv[index + 1];
  if (required && (result === undefined || result.startsWith('--'))) die(`Missing ${flag}`);
  return result;
}
function integer(flag, required = false, maximum = 0xffffffff) {
  const text = value(flag, required);
  if (text === undefined) return undefined;
  if (!/^\d+$/.test(text)) die(`${flag} must be an unsigned integer`);
  const result = Number(text);
  if (!Number.isSafeInteger(result) || result > maximum) die(`${flag} is out of range`);
  return result;
}
const source = process.argv[2], output = process.argv[3];
if (!source || !output) die('Usage: node append_2k25_entrance_entry.js <input.jsfb> <output.jsfb> --entry-id N --name-string N --type N --field4 N --field5 N --field6 N --field7 N --field8 N --field9 N');
const input = fs.readFileSync(source);
if (input.subarray(4, 8).toString('ascii') !== 'Entr') die('Input is not EntranceListData.jsfb (missing Entr identifier)');
const u8 = (at) => input.readUInt8(at);
const u16 = (at) => input.readUInt16LE(at);
const u32 = (at) => input.readUInt32LE(at);
const u64 = (at) => input.readBigUInt64LE(at);
const i32 = (at) => input.readInt32LE(at);
function fieldAt(table, field) {
  const vtable = table - i32(table), slot = vtable + 4 + field * 2;
  if (slot + 2 > vtable + u16(vtable)) return null;
  const relative = u16(slot);
  return relative ? table + relative : null;
}
function offsetAt(table, field) { const at = fieldAt(table, field); return at === null ? null : at + u32(at); }
function scalar(table, field, reader, fallback = 0) { const at = fieldAt(table, field); return at === null ? fallback : reader(at); }
const root = u32(0);
const sections = [];
for (let section = 0; section < 9; section++) {
  const wrapper = offsetAt(root, section);
  if (wrapper === null) die(`Missing root section ${section}`);
  const vector = offsetAt(wrapper, 0);
  if (vector === null) die(`Missing vector for root section ${section}`);
  const count = u32(vector), records = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4, table = slot + u32(slot);
    records.push({
      present: Array.from({ length: 10 }, (_, field) => fieldAt(table, field) !== null),
      id: scalar(table, 0, u16), nameString: scalar(table, 1, u32), type: scalar(table, 2, u8), hideId: scalar(table, 3, u64),
      field4: scalar(table, 4, u32), field5: scalar(table, 5, u32), field6: scalar(table, 6, u32), field7: scalar(table, 7, u32), field8: scalar(table, 8, u32), field9: scalar(table, 9, u16),
    });
  }
  sections.push(records);
}
const entryId = integer('--entry-id', true, 0xffff);
if (sections.flat().some((record) => record.id === entryId)) die(`Entry ${entryId} already exists; refusing to create a duplicate.`);
const appended = {
  id: entryId, nameString: integer('--name-string', true), type: integer('--type', true, 0xff), hideId: 0n,
  field4: integer('--field4', true), field5: integer('--field5', true), field6: integer('--field6', true), field7: integer('--field7', true), field8: integer('--field8', true), field9: integer('--field9', true, 0xffff),
  present: [true, true, true, false, true, true, true, true, true, true],
};
sections[8].push(appended);

// Root has nine wrapper fields.  Entrance records use packed u8/u16 scalars
// at offsets 7/8/10 and optional u64 field 3 at offset 36.
const header = 8, rootVtable = 8, rootTable = 32, rootObjectBytes = 40, wrapperVtableBytes = 6, wrapperTableBytes = 8, recordVtableBytes = 24, recordTableBytes = 44;
let cursor = rootTable + rootObjectBytes;
const layouts = sections.map((records) => {
  cursor = (cursor + 3) & ~3;
  const wrapperVtable = cursor, wrapperTable = wrapperVtable + 8, vector = wrapperTable + wrapperTableBytes;
  cursor = vector + 4 + records.length * 4;
  return { wrapperVtable, wrapperTable, vector, records };
});
cursor = (cursor + 3) & ~3;
const recordStart = cursor;
cursor += sections.reduce((sum, records) => sum + records.length * (recordVtableBytes + recordTableBytes), 0);
const out = Buffer.alloc(cursor);
out.writeUInt32LE(rootTable, 0); out.write('Entr', 4, 4, 'ascii');
out.writeUInt16LE(22, rootVtable); out.writeUInt16LE(40, rootVtable + 2);
for (let field = 0; field < 9; field++) out.writeUInt16LE(4 + field * 4, rootVtable + 4 + field * 2);
out.writeInt32LE(rootTable - rootVtable, rootTable);
layouts.forEach((layout, section) => {
  out.writeUInt32LE(layout.wrapperTable - (rootTable + 4 + section * 4), rootTable + 4 + section * 4);
  out.writeUInt16LE(6, layout.wrapperVtable); out.writeUInt16LE(8, layout.wrapperVtable + 2); out.writeUInt16LE(4, layout.wrapperVtable + 4);
  out.writeInt32LE(layout.wrapperTable - layout.wrapperVtable, layout.wrapperTable);
  out.writeUInt32LE(layout.vector - (layout.wrapperTable + 4), layout.wrapperTable + 4);
  out.writeUInt32LE(layout.records.length, layout.vector);
});
const fieldOffsets = [8, 12, 7, 36, 16, 20, 24, 28, 32, 10];
cursor = recordStart;
layouts.forEach((layout) => layout.records.forEach((record, index) => {
  const vtable = cursor, table = vtable + recordVtableBytes;
  out.writeUInt16LE(24, vtable); out.writeUInt16LE(44, vtable + 2);
  fieldOffsets.forEach((offset, field) => out.writeUInt16LE(record.present[field] ? offset : 0, vtable + 4 + field * 2));
  out.writeInt32LE(table - vtable, table);
  out.writeUInt8(record.type, table + 7); out.writeUInt16LE(record.id, table + 8); out.writeUInt16LE(record.field9, table + 10);
  out.writeUInt32LE(record.nameString, table + 12); out.writeUInt32LE(record.field4, table + 16); out.writeUInt32LE(record.field5, table + 20); out.writeUInt32LE(record.field6, table + 24); out.writeUInt32LE(record.field7, table + 28); out.writeUInt32LE(record.field8, table + 32); out.writeBigUInt64LE(BigInt(record.hideId), table + 36);
  const slot = layout.vector + 4 + index * 4;
  out.writeUInt32LE(table - slot, slot);
  cursor += recordVtableBytes + recordTableBytes;
}));
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, out);
console.log(JSON.stringify({ output: path.resolve(output), bytes: out.length, sectionCounts: sections.map((records) => records.length), appended: { ...appended, hideId: appended.hideId.toString() } }, null, 2));
