'use strict';

// Bounded reader for the small `Entr` FlatBuffer used by the 2K24/2K25
// entrance-motion registration layer.  Field meanings remain unlabelled until
// a schema or controlled registration edit proves them; this reader preserves
// their ordered scalar lanes without inventing semantics.
const FILE_IDENTIFIER = 'Entr';
const RECORD_FIELDS = 5;

function requireSpan(buffer, offset, bytes, label) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error(`${label} exceeds EntranceMotionTable bounds`);
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
  const vtableField = table.vtable + 4 + fieldIndex * 2;
  if (vtableField + 2 > table.vtable + table.vtableBytes) return null;
  const relative = buffer.readUInt16LE(vtableField);
  if (relative === 0) return null;
  if (relative + 4 > table.objectBytes) throw new Error(`record field ${fieldIndex} exceeds object bounds`);
  return table.offset + relative;
}

function relativeTarget(buffer, offset, label) {
  requireSpan(buffer, offset, 4, label);
  const target = offset + buffer.readUInt32LE(offset);
  requireSpan(buffer, target, 4, label);
  return target;
}

function readEntranceMotionTable(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  requireSpan(buffer, 0, 8, 'header');
  if (buffer.toString('ascii', 4, 8) !== FILE_IDENTIFIER) throw new Error('EntranceMotionTable file identifier is invalid');
  const root = tableAt(buffer, buffer.readUInt32LE(0), 'root table');
  const vectorField = fieldOffset(buffer, root, 0);
  if (vectorField === null) throw new Error('EntranceMotionTable root has no record vector');
  const vector = relativeTarget(buffer, vectorField, 'record vector');
  const recordCount = buffer.readUInt32LE(vector);
  if (recordCount === 0 || recordCount > 10000) throw new Error('EntranceMotionTable record count is invalid');
  requireSpan(buffer, vector + 4, recordCount * 4, 'record vector entries');
  const records = [];
  for (let index = 0; index < recordCount; index += 1) {
    const pointer = vector + 4 + index * 4;
    const record = tableAt(buffer, relativeTarget(buffer, pointer, `record ${index}`), `record ${index}`);
    const fields = [];
    for (let field = 0; field < RECORD_FIELDS; field += 1) {
      const offset = fieldOffset(buffer, record, field);
      // The observed 40-record table has sparse rows (for example record 27
      // exposes only lanes 0 and 1). Preserve absence explicitly instead of
      // treating it as a zero or rejecting a valid registration record.
      fields.push(offset === null ? null : buffer.readUInt32LE(offset));
    }
    records.push({ index, fields });
  }
  return { identifier: FILE_IDENTIFIER, bytes: buffer.length, recordCount, records };
}

module.exports = { FILE_IDENTIFIER, RECORD_FIELDS, readEntranceMotionTable };
