'use strict';

// Minimal, self-contained WWE 2K25/2K26 .clips structure reader. It exposes
// the target writer's fixed sections without decoding the packed group90 values.
const fs = require('node:fs');
const crypto = require('node:crypto');

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
const u64 = (buffer, offset) => `0x${buffer.readBigUInt64LE(offset).toString(16).toUpperCase().padStart(16, '0')}`;
const align16 = value => (value + 0x0f) & ~0x0f;

// Measured on native + community fixtures: the on-disk 64-bit identifier is
// FNV-1a 64 of the LOWERCASED clip name (273_a_00_M_facial -> 0xC93E7DDB8B7141E1). This
// resolves a named ADEF clip reference to a record lookup key; it does not
// decode any motion data or author a new clip payload.
function clipNameId(name) {
  if (typeof name !== 'string' || !name.length) throw new Error('clip name must be a non-empty string');
  let value = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(name.toLowerCase(), 'utf8')) {
    value ^= BigInt(byte);
    value = BigInt.asUintN(64, value * 0x100000001b3n);
  }
  return `0x${value.toString(16).toUpperCase().padStart(16, '0')}`;
}

function build(payloads) {
  if (!Array.isArray(payloads) || payloads.length === 0 || payloads.length > 100000) throw new Error('payloads must contain 1 to 100000 clips');
  const normalized = payloads.map((payload, index) => {
    if (!Buffer.isBuffer(payload) || payload.length < 0xA0) throw new Error(`clip ${index} is shorter than the fixed header`);
    // Validate the payload with the same fixed-section rules used for a container.
    const trackCount = payload.readUInt32LE(0x20);
    const group38Count = payload.readUInt32LE(0x38);
    const group60Count = payload.readUInt32LE(0x60);
    const descriptorCount = payload.readUInt32LE(0x78);
    const group90Count = payload.readUInt32LE(0x90);
    const expectedLength = 0xA0 + trackCount * 8 + group38Count * 4 + group60Count * 8 + descriptorCount * 8 + group90Count * 8;
    if (expectedLength !== payload.length) throw new Error(`clip ${index} section coverage mismatch`);
    return payload;
  });
  const tableBytes = 0x18 + normalized.length * 16;
  const payloadOffset = align16(tableBytes);
  const output = Buffer.alloc(payloadOffset + normalized.reduce((total, payload) => total + payload.length, 0));
  output.writeUInt32LE(normalized.length, 0x10); output.writeUInt32LE(normalized.length, 0x14);
  let offset = payloadOffset;
  normalized.forEach((payload, index) => {
    const table = 0x18 + index * 16;
    payload.copy(output, offset);
    payload.copy(output, table, 0, 8);
    output.writeUInt32LE(payload.length, table + 8); output.writeUInt32LE(offset, table + 12);
    offset += payload.length;
  });
  return output;
}

function section(name, relativeOffset, count, bytesPerEntry, payload) {
  const bytes = count * bytesPerEntry;
  if (relativeOffset + bytes > payload.length) throw new Error(`${name} exceeds payload`);
  return { name, relativeOffset: `0x${relativeOffset.toString(16).toUpperCase()}`, count, bytesPerEntry, bytes, sha256: sha256(payload.subarray(relativeOffset, relativeOffset + bytes)) };
}

function entries(payload, offset, count, bytesPerEntry) {
  return Array.from({ length: count }, (_, index) => {
    const start = offset + index * bytesPerEntry;
    const bytes = payload.subarray(start, start + bytesPerEntry);
    const candidate = bytesPerEntry === 8 ? {
      u16le: [bytes.readUInt16LE(0), bytes.readUInt16LE(2), bytes.readUInt16LE(4), bytes.readUInt16LE(6)],
      u32le: [bytes.readUInt32LE(0), bytes.readUInt32LE(4)],
      f32le: [bytes.readFloatLE(0), bytes.readFloatLE(4)].map(value => Number.isFinite(value) ? value : null),
    } : null;
    return {
      index,
      offset: `0x${start.toString(16).toUpperCase()}`,
      hex: bytes.toString('hex').toUpperCase(),
      candidate,
    };
  });
}

function profile(payload, offset, count) {
  const values = Array.from({ length: count }, (_, index) => payload.readBigUInt64LE(offset + index * 8));
  const unique = new Set(values.map(value => value.toString(16))).size;
  const zero = values.filter(value => value === 0n).length;
  const highBit = values.filter(value => (value & 0x8000000000000000n) !== 0n).length;
  return { count, unique, zero, highBit, nonZero: count - zero };
}

function parse(buffer, options = {}) {
  const includeRaw = options.includeRaw !== false;
  if (buffer.length < 0x18 || !buffer.subarray(0, 0x10).every(value => value === 0)) throw new Error('invalid .clips header');
  const count = buffer.readUInt32LE(0x10);
  if (count === 0 || count !== buffer.readUInt32LE(0x14) || count > 100000) throw new Error('invalid .clips count');
  if (0x18 + count * 16 > buffer.length) throw new Error('truncated .clips table');
  const records = [];
  let previousEnd = 0x18 + count * 16;
  for (let index = 0; index < count; index++) {
    const table = 0x18 + index * 16;
    const id = u64(buffer, table);
    const length = buffer.readUInt32LE(table + 8);
    const offset = buffer.readUInt32LE(table + 12);
    if (length < 0xA0 || offset < previousEnd || offset + length > buffer.length) throw new Error(`record ${index} payload range is invalid`);
    const payload = buffer.subarray(offset, offset + length);
    if (u64(payload, 0) !== id) throw new Error(`record ${index} identifier is not repeated in payload`);
    const trackCount = payload.readUInt32LE(0x20);
    const group38Count = payload.readUInt32LE(0x38);
    const group60Count = payload.readUInt32LE(0x60);
    const descriptorCount = payload.readUInt32LE(0x78);
    const group90Count = payload.readUInt32LE(0x90);
    let cursor = 0xA0;
    const sections = [
      section('track identifiers', cursor, trackCount, 8, payload),
      section('group38', cursor += trackCount * 8, group38Count, 4, payload),
      section('group60', cursor += group38Count * 4, group60Count, 8, payload),
      section('group78 descriptors', cursor += group60Count * 8, descriptorCount, 8, payload),
      section('group90', cursor += descriptorCount * 8, group90Count, 8, payload),
    ];
    const group78Offset = 0xA0 + trackCount * 8 + group38Count * 4 + group60Count * 8;
    const group90Offset = group78Offset + descriptorCount * 8;
    if (cursor + group90Count * 8 !== length) throw new Error(`record ${index} section coverage mismatch`);
    records.push({ index, id, offset, length, sha256: sha256(payload), trackIdentifiers: Array.from({ length: trackCount }, (_, i) => u64(payload, 0xA0 + i * 8)), sections, raw: includeRaw ? { group78: entries(payload, group78Offset, descriptorCount, 8), group90: entries(payload, group90Offset, group90Count, 8) } : undefined, group90Profile: profile(payload, group90Offset, group90Count), frameValue: payload.readUInt32LE(0x44), fps: payload.readFloatLE(0x0C) });
    previousEnd = offset + length;
  }
  if (previousEnd !== buffer.length) throw new Error('trailing bytes after .clips payloads');
  return { schema: 'aurora-forge-clips-layout/v1', bytes: buffer.length, count, sha256: sha256(buffer), records };
}

function parseFile(input, options = {}) {
  const stat = fs.statSync(input);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 1024 * 1024 * 1024) throw new Error('input is outside safe bounds');
  return parse(fs.readFileSync(input), options);
}

if (require.main === module) {
  try { if (!process.argv[2]) throw new Error('Usage: node tools/clips-layout.js <file.clips>'); console.log(JSON.stringify(parseFile(process.argv[2], { includeRaw: false }), null, 2)); }
  catch (error) { console.error(`.clips layout read failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { build, clipNameId, parse, parseFile };
