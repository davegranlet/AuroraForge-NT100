#!/usr/bin/env node
'use strict';

// Field-preserving editor for WWE 2K25 EntranceListData.jsfb ("Entr") rows.
// Edits scalar fields of an EXISTING row in place; every other byte (all other
// rows, vtables, vectors, offset fields, hide data) is preserved exactly.
// It cannot add or remove fields: only fields already present in the row's
// shape can be overwritten (FlatBuffer structure is never rebuilt).
//
// Modes:
//   node edit-2k25-entrance-entry.js <input.jsfb> --list [--section N] [--json]
//   node edit-2k25-entrance-entry.js <input.jsfb> <output.jsfb> --id <N> [setters]
//
// Setters (numeric, unsigned):
//   --name-string N  --type N  --hide-id N  --field4 N .. --field9 N
// Named aliases (Tribute-style / owner-confirmed semantics):
//   --motion N         -> field4  (MOTION / Entrance ID)
//   --title-motion N   -> field5  (TITLE MOTION / Title Entrance)
//   --mitb-motion N    -> field6  (MITB MOTION)
//   --double-title N   -> field7  (DOUBLE TITLE MOTION)
//   --music N          -> field8  (ENTRANCE MUSIC / Music ID)
//   --gfx N            -> field9  (TITANTRON-BANNER MOVIE / GFX Template ID)

const fs = require('node:fs');
const path = require('node:path');

const LIMITS = {
  nameString: 0xffffffff,
  type: 0xff,
  hideId: 0xffffffffffffffffn,
  field4: 0xffffffff,
  field5: 0xffffffff,
  field6: 0xffffffff,
  field7: 0xffffffff,
  field8: 0xffffffff,
  field9: 0xffff,
  field10: 0xffffffff,
};
const ALIASES = {
  'motion': 'field4',
  'title-motion': 'field5',
  'mitb-motion': 'field6',
  'double-title': 'field7',
  'music': 'field8',
  'gfx': 'field9',
};
const WRITERS = {
  nameString: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  type: (buffer, at, value) => buffer.writeUInt8(value, at),
  hideId: (buffer, at, value) => buffer.writeBigUInt64LE(value, at),
  field4: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  field5: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  field6: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  field7: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  field8: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  field9: (buffer, at, value) => buffer.writeUInt16LE(value, at),
  field10: (buffer, at, value) => buffer.writeUInt32LE(value, at),
};

function die(message) { console.error(message); process.exit(2); }

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) die(`Missing value for ${name}`);
  return value;
}

function unsigned(text, label, maximum) {
  if (!/^\d+$/.test(text)) die(`${label} must be an unsigned integer`);
  const value = BigInt(text);
  if (value > maximum) die(`${label} is out of range`);
  return value;
}

function readRows(buffer) {
  if (buffer.subarray(4, 8).toString('ascii') !== 'Entr') die('Input is not EntranceListData.jsfb (missing Entr identifier)');
  const u16 = (at) => buffer.readUInt16LE(at);
  const u32 = (at) => buffer.readUInt32LE(at);
  const u64 = (at) => buffer.readBigUInt64LE(at);
  const i32 = (at) => buffer.readInt32LE(at);
  function fieldAt(table, field) {
    const vtable = table - i32(table);
    const slot = vtable + 4 + field * 2;
    if (slot + 2 > vtable + u16(vtable)) return null;
    const relative = u16(slot);
    return relative ? table + relative : null;
  }
  function offsetAt(table, field) {
    const at = fieldAt(table, field);
    return at === null ? null : at + u32(at);
  }
  const root = u32(0);
  const sections = [];
  for (let section = 0; section < 9; section++) {
    const wrapper = offsetAt(root, section);
    if (wrapper === null) die(`Missing root section ${section}`);
    const vector = offsetAt(wrapper, 0);
    if (vector === null) die(`Missing vector for root section ${section}`);
    const count = u32(vector);
    const rows = [];
    for (let index = 0; index < count; index++) {
      const slot = vector + 4 + index * 4;
      const table = slot + u32(slot);
      const at = (field) => fieldAt(table, field);
      const scalar = (field, read) => (at(field) === null ? null : read(at(field)));
      rows.push({
        section,
        index,
        table,
        id: scalar(0, u16),
        nameString: scalar(1, u32),
        type: scalar(2, (value) => buffer.readUInt8(value)),
        hideId: scalar(3, u64),
        field4: scalar(4, u32),
        field5: scalar(5, u32),
        field6: scalar(6, u32),
        field7: scalar(7, u32),
        field8: scalar(8, u32),
        field9: scalar(9, u16),
        field10: scalar(10, u32),
        offsets: {
          nameString: at(1),
          type: at(2),
          hideId: at(3),
          field4: at(4),
          field5: at(5),
          field6: at(6),
          field7: at(7),
          field8: at(8),
          field9: at(9),
          field10: at(10),
        },
      });
    }
    sections.push(rows);
  }
  return sections;
}

function serializeRow(row) {
  return {
    section: row.section,
    index: row.index,
    id: row.id,
    nameString: row.nameString,
    type: row.type,
    hideId: row.hideId === null ? null : row.hideId.toString(),
    field4: row.field4,
    field5: row.field5,
    field6: row.field6,
    field7: row.field7,
    field8: row.field8,
    field9: row.field9,
    field10: row.field10,
  };
}

function editEntranceEntry(options) {
  const { inputPath, outputPath, entryId, setters } = options;
  const buffer = Buffer.from(fs.readFileSync(inputPath));
  const sections = readRows(buffer);
  const sectionFilter = options.section ?? null;
  let target = null;
  for (const rows of sections) {
    for (const row of rows) {
      if (row.id === entryId && (sectionFilter === null || row.section === sectionFilter)) {
        if (target !== null) die(`Entry ${entryId} exists in more than one section; use --section`);
        target = row;
      }
    }
  }
  if (target === null) die(`Entry ${entryId} not found${sectionFilter === null ? '' : ` in section ${sectionFilter}`}`);
  const before = serializeRow(target);
  const applied = [];
  for (const [field, value] of Object.entries(setters)) {
    const at = target.offsets[field];
    if (at === null) die(`Entry ${entryId} has no field ${field} present; cannot add fields in place`);
    WRITERS[field](buffer, at, value);
    applied.push({ field, value: String(value) });
  }
  const afterBuffer = Buffer.from(buffer);
  const afterSections = readRows(afterBuffer);
  const after = serializeRow(afterSections[target.section][target.index]);
  for (const [field, value] of Object.entries(setters)) {
    const expected = field === 'hideId' ? value.toString() : Number(value);
    if (after[field] !== expected) die(`Verification failed for ${field}: wrote ${value} read ${after[field]}`);
  }
  const otherBytesEqual = buffer.length === afterBuffer.length;
  if (!otherBytesEqual) die('Byte length changed unexpectedly');
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return {
    schema: 'aurora-forge-2k25-entrance-entry-edit/v1',
    input: path.resolve(inputPath),
    output: path.resolve(outputPath),
    bytes: buffer.length,
    entryId,
    section: target.section,
    index: target.index,
    before,
    after,
    applied,
    preserved: 'all other bytes unchanged (scalar in-place writes only)',
  };
}

if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) die('Usage: node edit-2k25-entrance-entry.js <input.jsfb> [--list] | <input.jsfb> <output.jsfb> --id <N> [setters]');
  const buffer = fs.readFileSync(inputPath);
  if (process.argv.includes('--list')) {
    const sections = readRows(buffer);
    const sectionFilter = option('--section');
    const rows = sections.flat().filter((row) => sectionFilter === undefined || row.section === Number(sectionFilter));
    const report = {
      input: path.resolve(inputPath),
      bytes: buffer.length,
      sectionCounts: sections.map((rows) => rows.length),
      rowCount: rows.length,
      rows: rows.map(serializeRow),
    };
    if (process.argv.includes('--json')) {
      const jsonAt = process.argv.indexOf('--json');
      const jsonPath = process.argv[jsonAt + 1];
      if (jsonPath && !jsonPath.startsWith('--')) fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }
  const outputPath = process.argv[3];
  if (!outputPath || outputPath.startsWith('--')) die('Output path is required for edit mode');
  const idText = option('--id');
  if (idText === undefined) die('--id is required for edit mode');
  const entryId = Number(unsigned(idText, '--id', 0xffffn));
  const setters = {};
  for (const [flag, field] of Object.entries(ALIASES)) {
    const text = option(`--${flag}`);
    if (text !== undefined) setters[field] = Number(unsigned(text, `--${flag}`, LIMITS[field]));
  }
  for (const field of Object.keys(LIMITS)) {
    const text = option(`--${field}`);
    if (text !== undefined) setters[field] = field === 'hideId' ? unsigned(text, `--${field}`, LIMITS[field]) : Number(unsigned(text, `--${field}`, LIMITS[field]));
  }
  if (!Object.keys(setters).length) die('No setters given (e.g. --motion 852 --music 8)');
  const result = editEntranceEntry({ inputPath, outputPath, entryId, setters, section: option('--section') === undefined ? null : Number(option('--section')) });
  console.log(JSON.stringify(result, (key, value) => (typeof value === 'bigint' ? value.toString() : value), null, 2));
}

module.exports = { editEntranceEntry };
