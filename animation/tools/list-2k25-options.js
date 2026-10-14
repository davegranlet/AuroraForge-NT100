#!/usr/bin/env node
'use strict';

// Option-list exporter for the Aurora Forge customize step (Tribute-style
// dropdown data). Read-only: parses game files and emits JSON lists.
//
// Modes:
//   node list-2k25-options.js --music <MusicList.jsfb> [--json out.json]
//   node list-2k25-options.js --motions <Animation/Entrance dir> [--json out.json]
//   node list-2k25-options.js --motion-names <EntranceListData.jsfb> <ENG.sdb> [--json out.json]
//
// MusicList record map (proven against Tribute display: id 8 = John Cena /
// "The Time Is Now" / cue 22.066999):
//   f0 u32 musicId | f2 relative string starName | f3 relative string trackTitle
//   f4 u8 type | f5 f32 cuePoint
// Relative string = at target: u32 charCount then UTF-8 bytes.

const fs = require('node:fs');
const path = require('node:path');

function die(message) { console.error(message); process.exit(2); }

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) die(`Missing value for ${name}`);
  return value;
}

function fieldAt(buffer, table, field) {
  const i32 = (at) => buffer.readInt32LE(at);
  const u16 = (at) => buffer.readUInt16LE(at);
  const vtable = table - i32(table);
  const slot = vtable + 4 + field * 2;
  if (slot + 2 > vtable + u16(vtable)) return null;
  const relative = u16(slot);
  return relative ? table + relative : null;
}

function relativeString(buffer, at) {
  if (at === null) return null;
  const target = at + buffer.readUInt32LE(at);
  if (target + 4 > buffer.length) return null;
  const length = buffer.readUInt32LE(target);
  const start = target + 4;
  if (length > 4096 || start + length > buffer.length) return null;
  return buffer.subarray(start, start + length).toString('utf8');
}

function readMusicList(buffer) {
  if (buffer.subarray(4, 8).toString('ascii') !== 'Musi') die('Input is not MusicList.jsfb (missing Musi identifier)');
  const u32 = (at) => buffer.readUInt32LE(at);
  const root = u32(0);
  const field0 = fieldAt(buffer, root, 0);
  if (field0 === null) die('MusicList root has no record vector');
  const vector = field0 + u32(field0);
  const count = u32(vector);
  if (count === 0 || count > 100000) die('MusicList record count is invalid');
  const records = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4;
    const table = slot + u32(slot);
    const scalar = (field, read) => {
      const at = fieldAt(buffer, table, field);
      return at === null ? null : read(at);
    };
    records.push({
      musicId: scalar(0, u32),
      starName: relativeString(buffer, fieldAt(buffer, table, 2)),
      trackTitle: relativeString(buffer, fieldAt(buffer, table, 3)),
      type: scalar(4, (at) => buffer.readUInt8(at)),
      cuePoint: scalar(5, (at) => buffer.readFloatLE(at)),
    });
  }
  return { schema: 'aurora-forge-option-music/v1', bytes: buffer.length, count: records.length, music: records };
}

function readMotions(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const motions = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.clips')) continue;
    const id = Number(path.basename(entry.name, path.extname(entry.name)));
    if (!Number.isSafeInteger(id)) continue;
    const hasAdefs = fs.existsSync(path.join(directory, `${id}.adefs`));
    motions.push({ id, clips: entry.name, adefs: hasAdefs });
  }
  motions.sort((a, b) => a.id - b.id);
  return { schema: 'aurora-forge-option-motions/v1', directory: path.resolve(directory), count: motions.length, motions };
}

function readMotionNames(entranceListPath, sdbPath) {
  const { readSdbRecords } = require('./sdb-read.js');
  const sdb = new Map();
  for (const record of readSdbRecords(fs.readFileSync(sdbPath))) sdb.set(record.id >>> 0, record.text);
  const buffer = fs.readFileSync(entranceListPath);
  if (buffer.subarray(4, 8).toString('ascii') !== 'Entr') die('Input is not EntranceListData.jsfb');
  const u32 = (at) => buffer.readUInt32LE(at);
  const u16 = (at) => buffer.readUInt16LE(at);
  const root = u32(0);
  const wrapperField = fieldAt(buffer, root, 8);
  if (wrapperField === null) die('EntranceListData has no section 8');
  const wrapper = wrapperField + u32(wrapperField);
  const vectorField = fieldAt(buffer, wrapper, 0);
  if (vectorField === null) die('EntranceListData section 8 has no vector');
  const vector = vectorField + u32(vectorField);
  const count = u32(vector);
  const motions = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4;
    const table = slot + u32(slot);
    const idAt = fieldAt(buffer, table, 0);
    const nameAt = fieldAt(buffer, table, 1);
    if (idAt === null) continue;
    const id = u16(idAt);
    const nameString = nameAt === null ? null : u32(nameAt);
    motions.push({ id, nameString, name: nameString === null ? null : (sdb.get(nameString >>> 0) || null) });
  }
  return {
    schema: 'aurora-forge-option-motion-names/v1',
    entranceList: path.resolve(entranceListPath),
    sdb: path.resolve(sdbPath),
    count: motions.length,
    motions,
  };
}

if (require.main === module) {
  const jsonAt = process.argv.indexOf('--json');
  const jsonPath = jsonAt >= 0 ? process.argv[jsonAt + 1] : null;
  let report;
  if (process.argv.includes('--music')) {
    report = readMusicList(fs.readFileSync(option('--music')));
  } else if (process.argv.includes('--motions')) {
    report = readMotions(option('--motions'));
  } else if (process.argv.includes('--motion-names')) {
    const entranceList = option('--motion-names');
    const sdbPath = process.argv[process.argv.indexOf('--motion-names') + 2];
    if (!sdbPath || sdbPath.startsWith('--')) die('--motion-names requires <EntranceListData.jsfb> <ENG.sdb>');
    report = readMotionNames(entranceList, sdbPath);
  } else {
    die('Usage: node list-2k25-options.js --music <MusicList.jsfb> | --motions <Animation/Entrance dir> | --motion-names <EntranceListData.jsfb> <ENG.sdb> [--json out.json]');
  }
  if (jsonPath && !jsonPath.startsWith('--')) {
    fs.mkdirSync(path.dirname(path.resolve(jsonPath)), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ output: path.resolve(jsonPath), schema: report.schema, count: report.count }));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

module.exports = { readMusicList, readMotions, readMotionNames };
