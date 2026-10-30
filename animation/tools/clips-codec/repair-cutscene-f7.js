'use strict';

// CutsceneNoRegistry field 7 is a per-motion 2K26 lookup key. Appended rows
// cloned from a stock row inherit its key, so repair only colliding keys in
// the appended range and leave all established unique keys untouched.
const { locateCutsceneVector } = require('./locate-cutscene-vector');

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function repairCutsceneF7(buffer, firstAppendedIndex) {
  const { count, slotsOffset } = locateCutsceneVector(buffer);
  if (!Number.isInteger(firstAppendedIndex) || firstAppendedIndex < 0 || firstAppendedIndex > count) {
    throw new RangeError(`firstAppendedIndex must be in [0, ${count}]`);
  }
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
    return { field, id: buffer.readUInt32LE(table + 8) >>> 0, f7: buffer.readUInt32LE(field) >>> 0 };
  }
  const rows = Array.from({ length: count }, (_, i) => rowInfo(i));
  const counts = new Map();
  for (const row of rows) if (row) counts.set(row.f7, (counts.get(row.f7) || 0) + 1);
  const used = new Set();
  for (let i = 0; i < firstAppendedIndex; i++) if (rows[i]) used.add(rows[i].f7);
  let patched = 0;
  let preserved = 0;
  for (let i = firstAppendedIndex; i < count; i++) {
    const row = rows[i];
    if (!row) continue;
    if ((counts.get(row.f7) || 0) <= 1) { used.add(row.f7); preserved++; continue; }
    let salt = 0, key;
    do { key = fnv1a32(`AURORA-${row.id}-${salt++}`); } while (used.has(key));
    buffer.writeUInt32LE(key, row.field);
    used.add(key);
    patched++;
  }
  return { rows: count, firstAppendedIndex, patched, preserved, uniqueF7: used.size };
}

module.exports = { repairCutsceneF7, fnv1a32 };
