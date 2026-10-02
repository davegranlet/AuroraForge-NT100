#!/usr/bin/env node
'use strict';

const fs = require('fs');

function usage() {
  console.error('Usage: node inspect_jsfb_vector.js <file.jsfb> [--record N | --find-u32 N]');
  process.exit(2);
}

const file = process.argv[2];
if (!file) usage();
const data = fs.readFileSync(file);
const u16 = (o) => o >= 0 && o + 2 <= data.length ? data.readUInt16LE(o) : null;
const u32 = (o) => o >= 0 && o + 4 <= data.length ? data.readUInt32LE(o) : null;
const i32 = (o) => o >= 0 && o + 4 <= data.length ? data.readInt32LE(o) : null;

function tableAt(offset) {
  if (offset < 4 || offset + 4 > data.length) return null;
  const distance = i32(offset);
  const vtable = offset - distance;
  if (!distance || vtable < 0 || vtable + 4 > data.length) return null;
  const vtableSize = u16(vtable);
  const objectSize = u16(vtable + 2);
  if (vtableSize < 4 || (vtableSize & 1) || objectSize < 4 ||
      vtable + vtableSize > data.length || offset + objectSize > data.length) return null;
  const fields = [];
  for (let id = 0, p = vtable + 4; p < vtable + vtableSize; id++, p += 2) {
    const relative = u16(p);
    if (!relative || relative >= objectSize) continue;
    const at = offset + relative;
    const raw = u32(at);
    const target = raw === null ? null : at + raw;
    fields.push({ id, relative, at, u32: raw, i32: i32(at), target,
      targetIsTable: target !== null && !!tableAtShallow(target) });
  }
  return { offset, vtable, vtableSize, objectSize, fields };
}

function tableAtShallow(offset) {
  if (offset < 4 || offset + 4 > data.length) return false;
  const distance = i32(offset);
  const vtable = offset - distance;
  if (!distance || vtable < 0 || vtable + 4 > data.length) return false;
  const vs = u16(vtable), os = u16(vtable + 2);
  return vs >= 4 && !(vs & 1) && os >= 4 && vtable + vs <= data.length && offset + os <= data.length;
}

function rootVector() {
  const root = u32(0);
  const table = tableAt(root);
  if (!table || !table.fields.length) throw new Error('Root table/vector not recognized');
  const vector = table.fields[0].target;
  const count = u32(vector);
  if (count === null || vector + 4 + count * 4 > data.length) throw new Error('Root field is not a table vector');
  const records = [];
  for (let i = 0; i < count; i++) {
    const slot = vector + 4 + i * 4;
    records.push(tableAt(slot + u32(slot)));
  }
  return { root, table, vector, count, records };
}

function dumpTable(record, depth = 0, seen = new Set()) {
  if (!record || seen.has(record.offset)) return null;
  seen.add(record.offset);
  return {
    offset: record.offset,
    vtable: record.vtable,
    objectSize: record.objectSize,
    fields: (record.fields || []).map((f) => ({
      id: f.id,
      relative: f.relative,
      at: f.at,
      u8: data.readUInt8(f.at),
      u16: u16(f.at),
      u32: f.u32,
      i32: f.i32,
      target: f.target,
      targetIsTable: f.targetIsTable,
      child: depth > 0 && f.targetIsTable ? dumpTable(tableAt(f.target), depth - 1, seen) : undefined,
    })),
  };
}

function compact(record, index, depth = 0) {
  return {
    index,
    ...dumpTable(record, depth),
  };
}

const parsed = rootVector();
const identifier = data.subarray(4, 8).toString('ascii');
const recordArg = process.argv.indexOf('--record');
const findArg = process.argv.indexOf('--find-u32');
console.log(JSON.stringify({ file, size: data.length, identifier, root: parsed.root,
  vector: parsed.vector, recordCount: parsed.count }, null, 2));

if (recordArg >= 0) {
  const index = Number(process.argv[recordArg + 1]);
  const depthArg = process.argv.indexOf('--depth');
  const depth = depthArg >= 0 ? Number(process.argv[depthArg + 1]) : 0;
  console.log(JSON.stringify(compact(parsed.records[index], index, depth), null, 2));
} else if (findArg >= 0) {
  const needle = Number(process.argv[findArg + 1]);
  const matches = [];
  parsed.records.forEach((record, index) => {
    const hitFields = (record?.fields || []).filter((f) => f.u32 === needle).map((f) => f.id);
    if (hitFields.length) matches.push({ index, offset: record.offset, fieldIds: hitFields });
  });
  console.log(JSON.stringify({ needle, matches }, null, 2));
} else {
  console.log(JSON.stringify(parsed.records.slice(0, 10).map(compact), null, 2));
}
