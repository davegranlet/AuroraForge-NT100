#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node parse_2k25_victory_list.js <VictoryListData.jsfb> [--wrestler-id N] [--json output.json]');
  process.exit(2);
}

const source = process.argv[2];
if (!source) usage();
const data = fs.readFileSync(source);
const u8 = (o) => data.readUInt8(o);
const u16 = (o) => data.readUInt16LE(o);
const u32 = (o) => data.readUInt32LE(o);
const u64 = (o) => data.readBigUInt64LE(o);
const i32 = (o) => data.readInt32LE(o);

function fieldAt(table, id) {
  const vtable = table - i32(table);
  const vtableSize = u16(vtable);
  const slot = vtable + 4 + id * 2;
  if (slot + 2 > vtable + vtableSize) return null;
  const relative = u16(slot);
  return relative ? table + relative : null;
}

function offsetField(table, id) {
  const at = fieldAt(table, id);
  return at === null ? null : at + u32(at);
}

if (data.subarray(4, 8).toString('ascii') !== 'Vict') {
  throw new Error('Not a VictoryListData JSFB (missing Vict identifier)');
}

const root = u32(0);
const victory = offsetField(root, 0);
const vector = offsetField(victory, 0);
const count = u32(vector);
const records = [];
const scalar = (table, id, read) => {
  const at = fieldAt(table, id);
  return at === null ? null : read(at);
};

for (let index = 0; index < count; index++) {
  const slot = vector + 4 + index * 4;
  const table = slot + u32(slot);
  records.push({
    index,
    wrestlerId: scalar(table, 0, u16),
    nameString: scalar(table, 1, u32),
    type1: scalar(table, 2, u8),
    hideId: scalar(table, 3, (o) => u64(o).toString()),
    someId: scalar(table, 4, u32),
    victoryFace: scalar(table, 5, u32),
    victoryHeel: scalar(table, 6, u32),
    titleVictoryFace: scalar(table, 7, u32),
    titleVictoryHeel: scalar(table, 8, u32),
    doubleTitleVictoryFace: scalar(table, 9, u32),
    doubleTitleVictoryHeel: scalar(table, 10, u32),
  });
}

const wrestlerArg = process.argv.indexOf('--wrestler-id');
const wrestlerId = wrestlerArg >= 0 ? Number(process.argv[wrestlerArg + 1]) : null;
const selected = wrestlerId === null ? records : records.filter((r) => r.wrestlerId === wrestlerId);
const report = {
  source: path.resolve(source),
  size: data.length,
  identifier: 'Vict',
  recordCount: count,
  filter: wrestlerId === null ? null : { wrestlerId },
  matchCount: selected.length,
  records: selected,
};

const jsonArg = process.argv.indexOf('--json');
if (jsonArg >= 0) {
  const output = path.resolve(process.argv[jsonArg + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
