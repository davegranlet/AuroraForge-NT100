'use strict';
// ring-object-overlay-lib.js — Worker 4 lane-local narrow record-swap overlay for
// 2K26 .clips containers (schema v1).
//
// Contract: given a base .clips container and a set of {recordId -> replacement payload},
// produce a new container where:
//   - record count, record order and every non-swapped record payload are byte-identical
//     to the base;
//   - each swapped record keeps its container id and its payload's own header bytes
//     (the replacement payload is expected to carry the same fixed-section geometry
//     and may differ only in descriptor constants and the group90 stream);
//   - the container is rebuilt with the canonical clips-layout geometry:
//       count @0x10/0x14, 16-byte table from 0x18 (id, length, offset), payloads
//       concatenated from align16(0x18 + count*16).
// The overlay never edits other records and never renames the container.
const fs = require('node:fs');
const crypto = require('node:crypto');

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const align16 = (v) => (v + 0x0f) & ~0x0f;

function parseContainer(buffer) {
  if (buffer.length < 0x18 || !buffer.subarray(0, 0x10).every((v) => v === 0)) throw new Error('invalid .clips header');
  const count = buffer.readUInt32LE(0x10);
  if (count === 0 || count !== buffer.readUInt32LE(0x14) || count > 100000) throw new Error('invalid .clips count');
  if (0x18 + count * 16 > buffer.length) throw new Error('truncated table');
  const records = [];
  const payloadStart = align16(0x18 + count * 16);
  const padding = buffer.subarray(0x18 + count * 16, payloadStart);
  if (!padding.every((v) => v === 0)) throw new Error('non-zero table padding');
  let previousEnd = payloadStart;
  for (let index = 0; index < count; index++) {
    const table = 0x18 + index * 16;
    const id = `0x${buffer.readBigUInt64LE(table).toString(16).toUpperCase().padStart(16, '0')}`;
    const length = buffer.readUInt32LE(table + 8);
    const offset = buffer.readUInt32LE(table + 12);
    if (length < 0xA0 || offset < previousEnd || offset + length > buffer.length) throw new Error(`record ${index} range invalid`);
    if (offset !== previousEnd) throw new Error(`record ${index} offset is not packed`);
    const payload = buffer.subarray(offset, offset + length);
    const payloadId = `0x${payload.readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')}`;
    if (payloadId !== id) throw new Error(`record ${index} id mismatch`);
    records.push({ index, id, length, offset, payload });
    previousEnd = offset + length;
  }
  if (previousEnd !== buffer.length) throw new Error('trailing bytes after payloads');
  return { count, records, payloadStart };
}

// Apply swaps: Map<recordId, Buffer(payload)>. Returns { buffer, swaps } with per-record status.
function applyOverlay(baseBuffer, swaps) {
  const parsed = parseContainer(baseBuffer);
  const remaining = new Map(swaps);
  const applied = [];
  const payloads = parsed.records.map((rec) => {
    if (remaining.has(rec.id)) {
      const payload = remaining.get(rec.id);
      if (!Buffer.isBuffer(payload) || payload.length < 0xA0) throw new Error(`replacement for ${rec.id} is invalid`);
      const payloadId = `0x${payload.readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')}`;
      if (payloadId !== rec.id) throw new Error(`replacement id ${payloadId} != container id ${rec.id}`);
      remaining.delete(rec.id);
      applied.push({ index: rec.index, id: rec.id, baseLength: rec.length, newLength: payload.length, baseSha256: sha256(rec.payload), newSha256: sha256(payload) });
      return { id: rec.id, payload };
    }
    return { id: rec.id, payload: rec.payload };
  });
  if (remaining.size > 0) throw new Error(`swap ids not present in container: ${[...remaining.keys()].join(',')}`);
  const tableBytes = 0x18 + payloads.length * 16;
  const payloadOffset = align16(tableBytes);
  const total = payloadOffset + payloads.reduce((sum, p) => sum + p.payload.length, 0);
  const out = Buffer.alloc(total);
  baseBuffer.copy(out, 0, 0, 0x18); // fixed header bytes preserved exactly
  out.writeUInt32LE(payloads.length, 0x10);
  out.writeUInt32LE(payloads.length, 0x14);
  let cursor = payloadOffset;
  payloads.forEach((p, index) => {
    const table = 0x18 + index * 16;
    p.payload.copy(out, cursor);
    p.payload.copy(out, table, 0, 8);
    out.writeUInt32LE(p.payload.length, table + 8);
    out.writeUInt32LE(cursor, table + 12);
    cursor += p.payload.length;
  });
  return { buffer: out, applied, count: payloads.length };
}

// Read a single record payload from a file for reuse by other lanes.
function readRecordPayload(file, recordId) {
  const parsed = parseContainer(fs.readFileSync(file));
  const rec = parsed.records.find((r) => r.id === recordId);
  if (!rec) throw new Error(`record ${recordId} not found in ${file}`);
  return { id: rec.id, index: rec.index, payload: Buffer.from(rec.payload), sha256: sha256(rec.payload) };
}

module.exports = { parseContainer, applyOverlay, readRecordPayload, sha256, align16 };
