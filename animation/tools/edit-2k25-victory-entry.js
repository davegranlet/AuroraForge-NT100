#!/usr/bin/env node
'use strict';

// Field-preserving editor for WWE 2K25 VictoryListData.jsfb ("Vict") rows.
// Edits scalar fields of an EXISTING row in place; every other byte (all other
// rows, vtables, vectors, offset fields) is preserved exactly. It cannot add
// or remove fields: only fields already present in the row's shape can be
// overwritten (FlatBuffer structure is never rebuilt).
//
// Modes:
//   node edit-2k25-victory-entry.js <input.jsfb> --list [--json]
//   node edit-2k25-victory-entry.js <input.jsfb> <output.jsfb> --id <N> [setters]
//
// Setters (numeric, unsigned):
//   --wrestler-id N  --name-string N  --type N  --hide-id N
//   --some-id N  --victory-face N  --victory-heel N
//   --title-face N  --title-heel N  --double-title-face N  --double-title-heel N
//
// Field map (proven by parse_2k25_victory_list.js / append_2k25_victory_entry.js):
//   f0 wrestlerId (u16)   f1 nameString (u32)   f2 type1 (u8)   f3 hideId (u64)
//   f4 someId (u32)       f5 victoryFace (u32)  f6 victoryHeel (u32)
//   f7 titleVictoryFace   f8 titleVictoryHeel   f9/f10 doubleTitleVictoryFace/Heel

const fs = require('node:fs');
const path = require('node:path');

const LIMITS = {
  wrestlerId: 0xffff,
  nameString: 0xffffffff,
  type: 0xff,
  hideId: 0xffffffffffffffffn,
  someId: 0xffffffff,
  victoryFace: 0xffffffff,
  victoryHeel: 0xffffffff,
  titleFace: 0xffffffff,
  titleHeel: 0xffffffff,
  doubleTitleFace: 0xffffffff,
  doubleTitleHeel: 0xffffffff,
};
const FIELD_IDS = {
  wrestlerId: 0,
  nameString: 1,
  type: 2,
  hideId: 3,
  someId: 4,
  victoryFace: 5,
  victoryHeel: 6,
  titleFace: 7,
  titleHeel: 8,
  doubleTitleFace: 9,
  doubleTitleHeel: 10,
};
const WRITERS = {
  wrestlerId: (buffer, at, value) => buffer.writeUInt16LE(value, at),
  nameString: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  type: (buffer, at, value) => buffer.writeUInt8(value, at),
  hideId: (buffer, at, value) => buffer.writeBigUInt64LE(value, at),
  someId: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  victoryFace: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  victoryHeel: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  titleFace: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  titleHeel: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  doubleTitleFace: (buffer, at, value) => buffer.writeUInt32LE(value, at),
  doubleTitleHeel: (buffer, at, value) => buffer.writeUInt32LE(value, at),
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
  if (buffer.subarray(4, 8).toString('ascii') !== 'Vict') die('Input is not VictoryListData.jsfb (missing Vict identifier)');
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
  const wrapper = offsetAt(root, 0);
  if (wrapper === null) die('Missing root wrapper');
  const vector = offsetAt(wrapper, 0);
  if (vector === null) die('Missing record vector');
  const count = u32(vector);
  if (count === 0 || count > 10000) die('Record count is invalid');
  const rows = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4;
    const table = slot + u32(slot);
    const at = (field) => fieldAt(table, field);
    const scalar = (field, read) => (at(field) === null ? null : read(at(field)));
    rows.push({
      index,
      table,
      wrestlerId: scalar(0, u16),
      nameString: scalar(1, u32),
      type: scalar(2, (value) => buffer.readUInt8(value)),
      hideId: scalar(3, u64),
      someId: scalar(4, u32),
      victoryFace: scalar(5, u32),
      victoryHeel: scalar(6, u32),
      titleFace: scalar(7, u32),
      titleHeel: scalar(8, u32),
      doubleTitleFace: scalar(9, u32),
      doubleTitleHeel: scalar(10, u32),
      offsets: Object.fromEntries(Object.entries(FIELD_IDS).map(([name, id]) => [name, at(id)])),
    });
  }
  return rows;
}

function serializeRow(row) {
  return {
    index: row.index,
    wrestlerId: row.wrestlerId,
    nameString: row.nameString,
    type: row.type,
    hideId: row.hideId === null ? null : row.hideId.toString(),
    someId: row.someId,
    victoryFace: row.victoryFace,
    victoryHeel: row.victoryHeel,
    titleFace: row.titleFace,
    titleHeel: row.titleHeel,
    doubleTitleFace: row.doubleTitleFace,
    doubleTitleHeel: row.doubleTitleHeel,
  };
}

function editVictoryEntry(options) {
  const { inputPath, outputPath, entryId, setters } = options;
  const buffer = Buffer.from(fs.readFileSync(inputPath));
  const rows = readRows(buffer);
  const matches = rows.filter((row) => row.wrestlerId === entryId);
  if (!matches.length) die(`Entry ${entryId} not found`);
  if (matches.length > 1) die(`Entry ${entryId} exists ${matches.length} times; refusing ambiguous edit`);
  const target = matches[0];
  const before = serializeRow(target);
  const applied = [];
  for (const [field, value] of Object.entries(setters)) {
    const at = target.offsets[field];
    if (at === null) die(`Entry ${entryId} has no field ${field} present; cannot add fields in place`);
    WRITERS[field](buffer, at, value);
    applied.push({ field, value: String(value) });
  }
  const afterRows = readRows(buffer);
  const after = serializeRow(afterRows[target.index]);
  for (const [field, value] of Object.entries(setters)) {
    const expected = field === 'hideId' ? value.toString() : Number(value);
    if (after[field] !== expected) die(`Verification failed for ${field}: wrote ${value} read ${after[field]}`);
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return {
    schema: 'aurora-forge-2k25-victory-entry-edit/v1',
    input: path.resolve(inputPath),
    output: path.resolve(outputPath),
    bytes: buffer.length,
    entryId,
    index: target.index,
    before,
    after,
    applied,
    preserved: 'all other bytes unchanged (scalar in-place writes only)',
  };
}

if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) die('Usage: node edit-2k25-victory-entry.js <input.jsfb> [--list] | <input.jsfb> <output.jsfb> --id <N> [setters]');
  const buffer = fs.readFileSync(inputPath);
  if (process.argv.includes('--list')) {
    const rows = readRows(buffer);
    const findAt = process.argv.indexOf('--id');
    const filter = findAt >= 0 ? Number(process.argv[findAt + 1]) : null;
    const selected = filter === null ? rows : rows.filter((row) => row.wrestlerId === filter);
    const report = {
      input: path.resolve(inputPath),
      bytes: buffer.length,
      recordCount: rows.length,
      rowCount: selected.length,
      rows: selected.map(serializeRow),
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
  for (const field of Object.keys(LIMITS)) {
    const text = option(`--${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    if (text !== undefined) setters[field] = field === 'hideId' ? unsigned(text, field, LIMITS[field]) : Number(unsigned(text, field, LIMITS[field]));
  }
  if (!Object.keys(setters).length) die('No setters given (e.g. --victory-face 16181 --music-id? no: victory has no music field)');
  const result = editVictoryEntry({ inputPath, outputPath, entryId, setters });
  console.log(JSON.stringify(result, (key, value) => (typeof value === 'bigint' ? value.toString() : value), null, 2));
}

module.exports = { editVictoryEntry };
