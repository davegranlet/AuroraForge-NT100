'use strict';

// Low-level, format-only 2K20 encoder primitives. These encode already-normalized
// stream rows; resampling and transform semantics remain explicit caller work.

function assertUInt16(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) throw new Error(`${label} must be an unsigned 16-bit integer`);
}

function assertInt16(value, label) {
  if (!Number.isInteger(value) || value < -0x8000 || value > 0x7FFF) throw new Error(`${label} must be a signed 16-bit integer`);
}

function encodeStream(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('stream rows must be a non-empty array');
  const output = Buffer.alloc(rows.length * 8);
  let previousFrame = 0;
  rows.forEach((row, index) => {
    if (!Array.isArray(row.packed) || row.packed.length !== 3) throw new Error(`row ${index} must have exactly 3 packed values`);
    if (!Number.isInteger(row.frame) || row.frame < previousFrame) throw new Error(`row ${index} frame must be monotonic`);
    const delta = row.frame - previousFrame;
    assertUInt16(delta, `row ${index} frame delta`);
    row.packed.forEach((value, component) => assertInt16(value, `row ${index} packed[${component}]`));
    const offset = index * 8;
    output.writeInt16BE(row.packed[0], offset);
    output.writeInt16BE(row.packed[1], offset + 2);
    output.writeInt16BE(row.packed[2], offset + 4);
    output.writeUInt16BE(delta, offset + 6);
    previousFrame = row.frame;
  });
  return output;
}

function encodeRecord(record) {
  if (!record || typeof record !== 'object') throw new Error('record is required');
  const streamA = encodeStream(record.streamA);
  const streamB = encodeStream(record.streamB);
  const header = Buffer.alloc(40);
  header.writeUInt16BE(record.type === undefined ? 0x2100 : record.type, 0);
  header.writeUInt16BE(40, 2);
  header.writeUInt32BE(record.hash32 >>> 0, 4);
  header.writeUInt32BE(record.streamAOffset, 8);
  // The 2K20 fields are counts of 8-byte rows (not byte lengths).
  header.writeUInt32BE(record.streamA.length, 12);
  header.writeUInt32BE(record.streamBOffset, 16);
  header.writeUInt32BE(record.streamB.length, 20);
  const floats = record.floats || [0, 0, 0, 0];
  if (floats.length !== 4) throw new Error('record floats must contain four values');
  floats.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error(`record float ${index} must be finite`);
    header.writeFloatBE(value, 24 + index * 4);
  });
  return { header, streamA, streamB };
}

// Encode a complete embedded YANM20 section. Offsets in each record are
// relative to the section's stream base (root + 8), matching the observed
// 2K20 layout. Records may optionally include a raw sentinel header.
function encodeSection(records, options = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('records must be a non-empty array');
  const alignment = options.alignment === undefined ? 16 : options.alignment;
  if (!Number.isInteger(alignment) || alignment < 1) throw new Error('alignment must be a positive integer');
  const sentinel = options.sentinel;
  const entries = records.map((record) => encodeRecord(record));
  const sentinelBytes = sentinel ? encodeRawHeader(sentinel) : Buffer.alloc(0);
  const tableBytes = entries.length * 40 + sentinelBytes.length;
  const tableEnd = 16 + tableBytes;
  const pad = (alignment - (tableEnd % alignment)) % alignment;
  let cursor = tableEnd + pad;
  const table = Buffer.alloc(tableBytes);
  const payloads = [];
  entries.forEach((entry, index) => {
    const record = records[index];
    cursor = align(cursor, alignment);
    const aOffset = cursor - 8;
    payloads.push({ offset: cursor, data: entry.streamA }); cursor += entry.streamA.length;
    cursor = align(cursor, alignment);
    const bOffset = cursor - 8;
    payloads.push({ offset: cursor, data: entry.streamB }); cursor += entry.streamB.length;
    const header = Buffer.from(entry.header);
    header.writeUInt32BE(aOffset, 8);
    header.writeUInt32BE(bOffset, 16);
    header.copy(table, index * 40);
  });
  if (sentinelBytes.length) sentinelBytes.copy(table, entries.length * 40);
  const total = cursor;
  const out = Buffer.alloc(total);
  out.write('YANM', 0, 'ascii');
  out.writeUInt32BE(total - 8, 4);
  out.writeUInt16BE(options.headerU16 === undefined ? 0x0500 : options.headerU16, 8);
  out.writeUInt16BE(records.length + (sentinel ? 1 : 0), 10);
  out.writeUInt32BE(options.headerU32 === undefined ? 0 : options.headerU32, 12);
  table.copy(out, 16);
  for (const payload of payloads) payload.data.copy(out, payload.offset);
  return out;
}

function align(value, alignment) { return value + ((alignment - (value % alignment)) % alignment); }
function encodeRawHeader(record) {
  const raw = record.raw ? Buffer.from(record.raw) : null;
  const header = Buffer.alloc(raw ? raw.length : 40);
  if (raw) raw.copy(header);
  header.writeUInt16BE(record.type === undefined ? header.readUInt16BE(0) : record.type, 0);
  header.writeUInt16BE(record.headerSize === undefined ? header.length : record.headerSize, 2);
  if (record.hash32 !== undefined) header.writeUInt32BE(record.hash32 >>> 0, 4);
  return header;
}

module.exports = { encodeStream, encodeRecord, encodeSection };
