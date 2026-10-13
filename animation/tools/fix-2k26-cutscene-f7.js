'use strict';
// Repairs appended CutsceneNoRegistry rows whose f7 (per-entry motion key) is
// DUPLICATED: the clone-based appender copies the anchor's f7, so appended clones
// collide with an existing row. The game keys motions by f7; duplicates break
// lookup and crash on play. Only rows in [firstAppendedIndex, count) whose f7 is
// duplicated anywhere in the file are re-keyed; unique keys are preserved (a
// blanket re-key destroys valid pre-existing library keys). Patches only the f7 u32.
const fs = require('fs');
const path = require('path');
const { locateCutsceneVector } = require('./clips-codec/locate-cutscene-vector');

const input = process.argv[2];
const output = process.argv[3];
const firstAppendedIndex = Number(process.argv[4] || 0);
if (!input || !output) {
  console.error('Usage: node fix-2k26-cutscene-f7.js <in> <out> <firstAppendedIndex>');
  process.exit(2);
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const buffer = fs.readFileSync(input);
const { count, slotsOffset } = locateCutsceneVector(buffer);
if (!count) throw new Error('registry has no entries');

function rowInfo(index) {
  const slot = slotsOffset + 4 * index;
  const rel = buffer.readUInt32LE(slot);
  if (!rel) return null;
  const table = slot + rel;
  const vtable = table - buffer.readInt32LE(table);
  const slotAt = vtable + 4 + 7 * 2;
  if (slotAt + 2 > vtable + buffer.readUInt16LE(vtable)) return null;
  const fieldOffset = buffer.readUInt16LE(slotAt);
  if (!fieldOffset) return null;
  const field = table + fieldOffset;
  const id = (() => {
    const s0 = vtable + 4;
    const f0 = buffer.readUInt16LE(s0);
    return f0 ? buffer.readUInt32LE(table + f0) >>> 0 : null;
  })();
  return { table, field, id, f7: buffer.readUInt32LE(field) >>> 0 };
}

const counts = new Map();
for (let i = 0; i < count; i += 1) {
  const info = rowInfo(i);
  if (info && info.f7 !== null) counts.set(info.f7, (counts.get(info.f7) || 0) + 1);
}
const used = new Set();
for (let i = 0; i < firstAppendedIndex; i += 1) {
  const info = rowInfo(i);
  if (info && info.f7 !== null) used.add(info.f7);
}
let patched = 0;
let preserved = 0;
for (let i = firstAppendedIndex; i < count; i += 1) {
  const info = rowInfo(i);
  if (!info || info.id === null || info.f7 === null) continue;
  if ((counts.get(info.f7) || 0) <= 1) { used.add(info.f7); preserved += 1; continue; }
  let salt = 0;
  let candidate;
  do {
    candidate = fnv1a32(`AURORA-${info.id}-${salt}`);
    salt += 1;
  } while (used.has(candidate));
  used.add(candidate);
  buffer.writeUInt32LE(candidate, info.field);
  patched += 1;
}
fs.writeFileSync(output, buffer);
console.log(JSON.stringify({ output: path.resolve(output), rows: count, firstAppendedIndex, patched, preserved, uniqueF7: used.size }, null, 2));
