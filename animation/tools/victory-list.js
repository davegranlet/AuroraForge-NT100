'use strict';

// Structural-only reader for the `Vict` FlatBuffer catalog. It intentionally
// retains field positions and raw bytes without assigning gameplay semantics
// or offering a writer: no controlled catalog edit has established either.
const FILE_IDENTIFIER = 'Vict';
const MAX_RECORDS = 10000;

function requireSpan(buffer, offset, bytes, label) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error(`${label} exceeds VictoryList bounds`);
  }
}

function tableAt(buffer, offset, label) {
  requireSpan(buffer, offset, 4, label);
  const distance = buffer.readInt32LE(offset);
  const vtable = offset - distance;
  requireSpan(buffer, vtable, 4, `${label} vtable`);
  const vtableBytes = buffer.readUInt16LE(vtable);
  const objectBytes = buffer.readUInt16LE(vtable + 2);
  if (!distance || vtableBytes < 4 || (vtableBytes & 1) || objectBytes < 4) throw new Error(`${label} vtable is invalid`);
  requireSpan(buffer, vtable, vtableBytes, `${label} vtable`);
  requireSpan(buffer, offset, objectBytes, label);
  return { offset, vtable, vtableBytes, objectBytes };
}

function fieldOffset(buffer, table, fieldIndex) {
  const at = table.vtable + 4 + fieldIndex * 2;
  if (at + 2 > table.vtable + table.vtableBytes) return null;
  const relative = buffer.readUInt16LE(at);
  if (relative === 0) return null;
  if (relative >= table.objectBytes) throw new Error(`VictoryList field ${fieldIndex} exceeds object bounds`);
  return table.offset + relative;
}

function relativeTarget(buffer, offset, label) {
  requireSpan(buffer, offset, 4, label);
  const target = offset + buffer.readUInt32LE(offset);
  requireSpan(buffer, target, 4, label);
  return target;
}

function readVictoryList(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  requireSpan(buffer, 0, 8, 'header');
  if (buffer.toString('ascii', 4, 8) !== FILE_IDENTIFIER) throw new Error('VictoryList file identifier is invalid');

  const root = tableAt(buffer, buffer.readUInt32LE(0), 'root table');
  const rootField = fieldOffset(buffer, root, 0);
  if (rootField === null) throw new Error('VictoryList root has no wrapper');
  const wrapper = tableAt(buffer, relativeTarget(buffer, rootField, 'VictoryList wrapper'), 'VictoryList wrapper');
  const wrapperField = fieldOffset(buffer, wrapper, 0);
  if (wrapperField === null) throw new Error('VictoryList wrapper has no record vector');
  const vector = relativeTarget(buffer, wrapperField, 'VictoryList record vector');
  const recordCount = buffer.readUInt32LE(vector);
  if (recordCount === 0 || recordCount > MAX_RECORDS) throw new Error('VictoryList record count is invalid');
  requireSpan(buffer, vector + 4, recordCount * 4, 'VictoryList record vector entries');

  const records = [];
  for (let index = 0; index < recordCount; index += 1) {
    const pointer = vector + 4 + index * 4;
    const table = tableAt(buffer, relativeTarget(buffer, pointer, `VictoryList record ${index}`), `VictoryList record ${index}`);
    const fieldCount = (table.vtableBytes - 4) / 2;
    const fields = [];
    for (let field = 0; field < fieldCount; field += 1) {
      const offset = fieldOffset(buffer, table, field);
      // A field may be a byte/short/scalar/relative reference. Until a schema
      // is proven, preserve its in-object location and up to four raw bytes.
      const bytes = offset === null ? null : buffer.subarray(offset, Math.min(table.offset + table.objectBytes, offset + 4)).toString('hex');
      fields.push({ field, offset: offset === null ? null : offset - table.offset, bytes });
    }
    records.push({ index, objectBytes: table.objectBytes, fields });
  }
  return { identifier: FILE_IDENTIFIER, bytes: buffer.length, recordCount, records };
}

module.exports = { FILE_IDENTIFIER, MAX_RECORDS, readVictoryList };
