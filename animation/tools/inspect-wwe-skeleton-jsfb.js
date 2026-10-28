'use strict';

// Aurora Forge read-only structural reader for WWE `Skel` JSFB assets.
// It reports validated FlatBuffer tables and raw scalar/offset fields without
// assigning transform or parent semantics that have not been proven.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function fail(message) { throw new Error(message); }
function fnv1a64(text) {
  let hash = 0xCBF29CE484222325n;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001B3n);
  }
  return `0x${hash.toString(16).toUpperCase().padStart(16, '0')}`;
}

function tableAt(bytes, offset) {
  if (!Number.isInteger(offset) || offset < 4 || offset + 4 > bytes.length) return null;
  const distance = bytes.readInt32LE(offset);
  if (!distance) return null;
  const vtable = offset - distance;
  if (vtable < 0 || vtable + 4 > bytes.length) return null;
  const vtableSize = bytes.readUInt16LE(vtable);
  const objectSize = bytes.readUInt16LE(vtable + 2);
  if (vtableSize < 4 || vtableSize % 2 || vtable + vtableSize > bytes.length ||
      objectSize < 4 || offset + objectSize > bytes.length) return null;
  const fields = [];
  for (let id = 0, cursor = vtable + 4; cursor < vtable + vtableSize; id++, cursor += 2) {
    const relative = bytes.readUInt16LE(cursor);
    if (!relative) { fields.push(null); continue; }
    if (relative >= objectSize || offset + relative + 4 > bytes.length) return null;
    const at = offset + relative;
    fields.push({ id, relative, at, u32: bytes.readUInt32LE(at), i32: bytes.readInt32LE(at), f32: bytes.readFloatLE(at) });
  }
  return { offset, vtable, vtableSize, objectSize, fields };
}

function readString(bytes, offset) {
  if (offset < 0 || offset + 5 > bytes.length) return null;
  const length = bytes.readUInt32LE(offset);
  if (length > 512 || offset + 4 + length >= bytes.length || bytes[offset + 4 + length] !== 0) return null;
  const raw = bytes.subarray(offset + 4, offset + 4 + length);
  if (raw.some(byte => byte < 0x20 || byte > 0x7e)) return null;
  return raw.toString('utf8');
}

function targetOf(field) { return field.at + field.u32; }

function readTableVector(bytes, table, fieldId, label) {
  const field = table.fields[fieldId];
  if (!field) fail(`${label}: root field ${fieldId} is absent`);
  const vector = targetOf(field);
  if (vector < 0 || vector + 4 > bytes.length) fail(`${label}: vector target out of bounds`);
  const count = bytes.readUInt32LE(vector);
  if (count > 4096 || vector + 4 + count * 4 > bytes.length) fail(`${label}: invalid table-vector length ${count}`);
  const entries = [];
  for (let index = 0; index < count; index++) {
    const slot = vector + 4 + index * 4;
    const offset = slot + bytes.readUInt32LE(slot);
    const record = tableAt(bytes, offset);
    if (!record) fail(`${label}: vector entry ${index} is not a valid table`);
    entries.push({ index, slot, ...record });
  }
  return { vector, count, entries };
}

function describeRecord(bytes, entry) {
  const nameField = entry.fields[0];
  const name = nameField ? readString(bytes, targetOf(nameField)) : null;
  const parentField = entry.fields[1];
  return {
    index: entry.index,
    offset: entry.offset,
    vtableOffset: entry.vtable,
    vtableSize: entry.vtableSize,
    objectSize: entry.objectSize,
    name,
    boneId64: name ? fnv1a64(name) : null,
    parentHash32: parentField ? `0x${parentField.u32.toString(16).toUpperCase().padStart(8, '0')}` : null,
    fields: entry.fields.map(field => {
      if (!field) return null;
      const target = targetOf(field);
      return {
        id: field.id,
        relative: field.relative,
        offset: field.at,
        hex: `0x${field.u32.toString(16).toUpperCase().padStart(8, '0')}`,
        i32: field.i32,
        f32: Number.isFinite(field.f32) ? field.f32 : null,
        target,
        targetString: readString(bytes, target),
      };
    }),
  };
}

function inspect(file, out, boneVectorField = 4) {
  const bytes = fs.readFileSync(file);
  if (bytes.subarray(4, 8).toString('ascii') !== 'Skel') fail('input is not a Skel JSFB');
  const rootOffset = bytes.readUInt32LE(0);
  const root = tableAt(bytes, rootOffset);
  if (!root) fail('invalid root table');
  const bones = readTableVector(bytes, root, boneVectorField, 'bone list');
  const boneRecords = bones.entries.map(entry => describeRecord(bytes, entry));
  const namesByHash32 = new Map(boneRecords.filter(bone => bone.name && bone.boneId64)
    .map(bone => [bone.boneId64.slice(-8), bone.name]));
  for (const bone of boneRecords) {
    bone.parentName = bone.parentHash32 ? namesByHash32.get(bone.parentHash32.slice(-8)) || null : null;
    bone.parentHashResolved = Boolean(bone.parentName);
  }
  const report = {
    schema: 'aurora-forge/wwe-skeleton-jsfb-structure/v1',
    file: path.resolve(file),
    sha256: sha256(bytes),
    bytes: bytes.length,
    identifier: 'Skel',
    root: { offset: root.offset, vtableOffset: root.vtable, vtableSize: root.vtableSize, objectSize: root.objectSize,
      fields: root.fields.map(field => field ? { id: field.id, relative: field.relative, offset: field.at,
        hex: `0x${field.u32.toString(16).toUpperCase().padStart(8, '0')}`, i32: field.i32, f32: Number.isFinite(field.f32) ? field.f32 : null,
        target: targetOf(field), targetString: readString(bytes, targetOf(field)) } : null) },
    boneVectorField,
    boneCount: bones.count,
    bones: boneRecords,
    limits: ['Field 0 is interpreted as a name string; field 1 is reported as a parent hash because it matches the named-bone FNV-1a64 low words across this file.', 'Other bone fields and local/rest transform values remain uninterpreted; this report does not compute world-space animated bone positions.'],
  };
  if (out) {
    if (fs.existsSync(out)) fail(`refusing to overwrite ${out}`);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  }
  return report;
}

if (require.main === module) {
  try {
    const argv = process.argv.slice(2);
    const flag = name => { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1]; };
    const file = argv.find(value => !value.startsWith('--'));
    if (!file) fail('Usage: node inspect-wwe-skeleton-jsfb.js <skeleton.jsfb> [--bone-vector-field <index>] [--out <report.json>]');
    const vectorField = flag('--bone-vector-field');
    const report = inspect(file, flag('--out'), vectorField === null ? 4 : Number(vectorField));
    console.log(JSON.stringify({ file: report.file, sha256: report.sha256, boneCount: report.boneCount, out: flag('--out') || null }, null, 2));
  } catch (error) {
    console.error(`skeleton JSFB inspection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspect, tableAt };
