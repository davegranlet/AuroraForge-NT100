#!/usr/bin/env node
'use strict';

// Aurora Forge - MusicList.jsfb writer.
// Byte-preserving editor for the WWE 2K26 music picker table
// (Audio/MusicList.jsfb). Stock rows are never rewritten; new custom rows
// (musicId 3000+, the slots the CustomMusicLoader rebuilds) are appended by
// cloning a stock row template, and edits patch the affected fields in place.
//
// Container map (proven on the 2K26 file):
//   u32 root offset at 0 | "Musi" identifier at 4
//   root table -> field0 -> vector (u32 count + count x u32 relative offsets)
//   row table fields: f0 musicId u32, f2 starName string, f3 trackTitle string,
//   f4 type u8, f5 cuePoint f32 (string = u32 length + utf8 at target)
//
// Appending inserts one vector slot (4 bytes) and shifts every later byte by 4,
// then bumps every existing vector slot offset by 4. All row tables and strings
// live after the vector, so no other fixups are required.
//
// CLI:
//   node edit-2k25-music-list.js --in MusicList.jsfb --list
//   node edit-2k25-music-list.js --in MusicList.jsfb --out new.jsfb --add "3000=AURORA TEST=AURORA 3000=0"
//   node edit-2k25-music-list.js --in MusicList.jsfb --out new.jsfb --add-json rows.json
//   node edit-2k25-music-list.js --in MusicList.jsfb --out new.jsfb --set 45 --title "Fight (Edit)" --star "Kevin Owens"
//   node edit-2k25-music-list.js --selftest

const fs = require('node:fs');
const path = require('node:path');

function readMusicList(buffer) {
  if (buffer.subarray(4, 8).toString('latin1') !== 'Musi') throw new Error('not MusicList.jsfb (missing Musi identifier)');
  const u16 = (at) => buffer.readUInt16LE(at);
  const u32 = (at) => buffer.readUInt32LE(at);
  const i32 = (at) => buffer.readInt32LE(at);
  const fieldAt = (table, field) => {
    const vtable = table - i32(table);
    const slot = vtable + 4 + field * 2;
    if (slot + 2 > vtable + u16(vtable)) return null;
    const relative = u16(slot);
    return relative ? table + relative : null;
  };
  const relativeString = (at) => {
    if (at === null) return null;
    const target = at + u32(at);
    if (target + 4 > buffer.length) return null;
    const length = u32(target);
    if (length > 4096 || target + 4 + length > buffer.length) return null;
    return buffer.subarray(target + 4, target + 4 + length).toString('utf8');
  };
  const root = u32(0);
  const field0 = fieldAt(root, 0);
  if (field0 === null) throw new Error('MusicList root has no record vector');
  const vector = field0 + u32(field0);
  const count = u32(vector);
  if (count === 0 || count > 100000) throw new Error('MusicList record count is invalid');
  const records = [];
  const rowTables = [];
  for (let index = 0; index < count; index += 1) {
    const slot = vector + 4 + index * 4;
    const table = slot + u32(slot);
    rowTables.push(table);
    const scalar = (field, read) => {
      const at = fieldAt(table, field);
      return at === null ? null : read(at);
    };
    records.push({
      musicId: scalar(0, u32),
      starName: relativeString(fieldAt(table, 2)),
      trackTitle: relativeString(fieldAt(table, 3)),
      type: scalar(4, (at) => buffer.readUInt8(at)),
      cuePoint: scalar(5, (at) => buffer.readFloatLE(at))
    });
  }
  return { root, vector, count, records, rowTables, fieldAt };
}

function findTemplateTable(buffer, parsed) {
  let best = null;
  for (const table of parsed.rowTables) {
    const f5 = parsed.fieldAt(table, 5);
    if (f5 === null) continue;
    if (best === null) best = table;
  }
  if (best === null) throw new Error('no stock row with a cuePoint to use as a template');
  return best;
}

function cloneTemplate(buffer, templateTable) {
  const u16 = (at) => buffer.readUInt16LE(at);
  const i32 = (at) => buffer.readInt32LE(at);
  const vtable = templateTable - i32(templateTable);
  const vtableSize = u16(vtable);
  const tableSize = u16(vtable + 2);
  return {
    vtable: Buffer.from(buffer.subarray(vtable, vtable + vtableSize)),
    table: Buffer.from(buffer.subarray(templateTable, templateTable + tableSize)),
    vtableSize,
    tableSize
  };
}

function stringBytes(value) {
  const text = Buffer.from(String(value), 'utf8');
  const out = Buffer.alloc(4 + text.length);
  out.writeUInt32LE(text.length, 0);
  text.copy(out, 4);
  return out;
}

function appendMusicRows(buffer, rows, options) {
  const opts = options || {};
  const parsed = readMusicList(buffer);
  const templateTable = findTemplateTable(buffer, parsed);
  const template = cloneTemplate(buffer, templateTable);
  const templateVtable = templateTable - buffer.readInt32LE(templateTable);

  const vector = parsed.vector;
  const count = parsed.count;
  const insertAt = vector + 4 + count * 4;
  const shiftBytes = rows.length * 4;

  const shifted = Buffer.concat([
    buffer.subarray(0, insertAt),
    Buffer.alloc(shiftBytes),
    buffer.subarray(insertAt)
  ]);

  for (let index = 0; index < count; index += 1) {
    const slot = vector + 4 + index * 4;
    const relative = shifted.readUInt32LE(slot);
    shifted.writeUInt32LE(relative + shiftBytes, slot);
  }
  shifted.writeUInt32LE(count + rows.length, vector);

  const additions = [];
  let cursor = shifted.length;
  const align4 = () => {
    const remainder = cursor % 4;
    if (remainder === 0) return;
    const pad = Buffer.alloc(4 - remainder);
    additions.push(pad);
    cursor += pad.length;
  };

  rows.forEach((row, index) => {
    if (!Number.isSafeInteger(row.musicId) || row.musicId < 0) throw new Error(`invalid musicId: ${row.musicId}`);
    align4();
    const vtable = Buffer.from(template.vtable);
    const table = Buffer.from(template.table);
    const fieldAt = (field) => {
      const slot = 4 + field * 2;
      if (slot + 2 > vtable.length) return null;
      const relative = vtable.readUInt16LE(slot);
      return relative || null;
    };

    const starBytes = stringBytes(row.starName || '');
    const titleBytes = stringBytes(row.trackTitle || '');
    const starTarget = cursor + table.length + vtable.length + titleBytes.length;
    const titleTarget = cursor + table.length + vtable.length;

    const tablePosition = cursor + vtable.length;
    const vtablePosition = cursor;
    table.writeInt32LE(tablePosition - vtablePosition, 0);

    const f0 = fieldAt(0);
    if (f0 !== null) table.writeUInt32LE(row.musicId, f0);
    const f2 = fieldAt(2);
    if (f2 !== null) table.writeUInt32LE(starTarget - (tablePosition + f2), f2);
    const f3 = fieldAt(3);
    if (f3 !== null) table.writeUInt32LE(titleTarget - (tablePosition + f3), f3);
    const f4 = fieldAt(4);
    if (f4 !== null && row.type !== undefined) table.writeUInt8(row.type, f4);
    const f5 = fieldAt(5);
    if (f5 !== null && row.cuePoint !== undefined) table.writeFloatLE(Number(row.cuePoint) || 0, f5);

    const block = Buffer.concat([vtable, table, titleBytes, starBytes]);
    const slot = insertAt + index * 4;
    const tablePos = cursor + vtable.length;
    shifted.writeUInt32LE(tablePos - slot, slot);
    additions.push(block);
    cursor += block.length;
  });

  return Buffer.concat([shifted, Buffer.concat(additions)]);
}

function setMusicRow(buffer, musicId, changes) {
  const parsed = readMusicList(buffer);
  const index = parsed.records.findIndex((record) => record.musicId === musicId);
  if (index < 0) throw new Error(`musicId ${musicId} not found`);
  const out = Buffer.from(buffer);
  const table = parsed.rowTables[index];
  const u32 = (at) => out.readUInt32LE(at);
  const additions = [];
  let cursor = out.length;

  const patchString = (field, value) => {
    const at = parsed.fieldAt(table, field);
    if (at === null || value === undefined) return;
    const bytes = stringBytes(value);
    out.writeUInt32LE(cursor - at, at);
    additions.push(bytes);
    cursor += bytes.length;
  };
  patchString(2, changes.starName);
  patchString(3, changes.trackTitle);
  if (changes.type !== undefined) {
    const at = parsed.fieldAt(table, 4);
    if (at !== null) out.writeUInt8(Number(changes.type), at);
  }
  if (changes.cuePoint !== undefined) {
    const at = parsed.fieldAt(table, 5);
    if (at !== null) out.writeFloatLE(Number(changes.cuePoint) || 0, at);
  }
  return Buffer.concat([out, Buffer.concat(additions)]);
}

function selftest() {
  const source = 'D:/forge-files/tmp-full-v116-extract-fast/Audio/MusicList.jsfb';
  if (!fs.existsSync(source)) throw new Error('selftest source MusicList.jsfb not found');
  const original = fs.readFileSync(source);
  const before = readMusicList(original);

  const grown = appendMusicRows(original, [
    { musicId: 3000, starName: 'AURORA TEST', trackTitle: 'AURORA TEST TRACK', type: 4, cuePoint: 0 },
    { musicId: 3001, starName: 'AURORA TEST 2', trackTitle: 'AURORA TEST TRACK 2', type: 4, cuePoint: 12.5 }
  ]);
  const after = readMusicList(grown);
  if (after.count !== before.count + 2) throw new Error(`selftest count ${after.count}`);
  for (let i = 0; i < before.count; i += 1) {
    const a = before.records[i];
    const b = after.records[i];
    if (a.musicId !== b.musicId || a.trackTitle !== b.trackTitle || a.starName !== b.starName || a.cuePoint !== b.cuePoint) {
      throw new Error(`selftest stock row ${i} changed (id ${a.musicId})`);
    }
  }
  const added = after.records.slice(before.count);
  if (added[0].musicId !== 3000 || added[0].starName !== 'AURORA TEST' || added[0].trackTitle !== 'AURORA TEST TRACK') throw new Error('selftest added row 3000 mismatch');
  if (added[1].musicId !== 3001 || added[1].cuePoint !== 12.5) throw new Error('selftest added row 3001 mismatch');

  const edited = setMusicRow(grown, 3000, { trackTitle: 'AURORA EDITED', cuePoint: 4.25 });
  const editedParsed = readMusicList(edited);
  const row = editedParsed.records.find((record) => record.musicId === 3000);
  if (!row || row.trackTitle !== 'AURORA EDITED' || row.cuePoint !== 4.25 || row.starName !== 'AURORA TEST') throw new Error('selftest edit mismatch');
  const stockStill = editedParsed.records[0];
  if (stockStill.musicId !== before.records[0].musicId || stockStill.trackTitle !== before.records[0].trackTitle) throw new Error('selftest edit disturbed stock rows');

  const out = path.join(require('node:os').tmpdir(), 'aurora-musiclist-selftest.jsfb');
  fs.writeFileSync(out, edited);
  console.log('selftest passed');
  console.log(`rows: ${before.count} -> ${editedParsed.count}; file: ${original.length} -> ${edited.length} bytes`);
  console.log('output:', out);
  return 0;
}

function parseArgs(argv) {
  const options = { in: null, out: null, list: false, add: [], addJson: null, set: null, title: undefined, star: undefined, cue: undefined, type: undefined, selftest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--in') options.in = argv[++i];
    else if (arg === '--out') options.out = argv[++i];
    else if (arg === '--list') options.list = true;
    else if (arg === '--add') options.add.push(argv[++i]);
    else if (arg === '--add-json') options.addJson = argv[++i];
    else if (arg === '--set') options.set = Number(argv[++i]);
    else if (arg === '--title') options.title = argv[++i];
    else if (arg === '--star') options.star = argv[++i];
    else if (arg === '--cue') options.cue = Number(argv[++i]);
    else if (arg === '--type') options.type = Number(argv[++i]);
    else if (arg === '--selftest') options.selftest = true;
    else throw new Error(`unknown option ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selftest) return selftest();
  if (!options.in) throw new Error('--in is required');
  let buffer = fs.readFileSync(path.resolve(options.in));
  if (options.list) {
    const parsed = readMusicList(buffer);
    console.log(JSON.stringify({ count: parsed.count, music: parsed.records }, null, 2));
    return 0;
  }
  const rows = [];
  for (const spec of options.add) {
    const [musicId, trackTitle, starName, cuePoint, type] = spec.split('=');
    rows.push({ musicId: Number(musicId), trackTitle, starName, cuePoint: cuePoint !== undefined ? Number(cuePoint) : 0, type: type !== undefined ? Number(type) : 4 });
  }
  if (options.addJson) {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(options.addJson), 'utf8'));
    for (const row of Array.isArray(parsed) ? parsed : parsed.rows || []) rows.push(row);
  }
  if (rows.length) buffer = appendMusicRows(buffer, rows);
  if (options.set !== null) {
    buffer = setMusicRow(buffer, options.set, { trackTitle: options.title, starName: options.star, cuePoint: options.cue, type: options.type });
  }
  if (!options.out) throw new Error('--out is required for edits');
  fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
  fs.writeFileSync(path.resolve(options.out), buffer);
  const parsed = readMusicList(buffer);
  console.log(`wrote ${options.out}: ${parsed.count} rows, ${buffer.length} bytes`);
  return 0;
}

module.exports = { readMusicList, appendMusicRows, setMusicRow };

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(String(error && error.message ? error.message : error));
    process.exitCode = 2;
  }
}
