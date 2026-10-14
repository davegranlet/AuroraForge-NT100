'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { build, clipNameId, parse } = require('./clips-layout');

function fixture() {
  const payload = Buffer.alloc(0xA0 + 8 + 8 * 2 + 8 * 2);
  payload.writeBigUInt64LE(0x1234n, 0);
  payload.writeUInt32LE(1, 0x20); payload.writeFloatLE(60, 0x0C); payload.writeUInt32LE(1755, 0x44); payload.writeUInt32LE(2, 0x78); payload.writeUInt32LE(2, 0x90);
  payload.writeBigUInt64LE(0xAABBn, 0xA0);
  const table = Buffer.alloc(0x18 + 16); table.writeUInt32LE(1, 0x10); table.writeUInt32LE(1, 0x14); table.writeBigUInt64LE(0x1234n, 0x18); table.writeUInt32LE(payload.length, 0x20);
  const payloadOffset = 0x30; // 16-byte alignment after the 0x28-byte record table.
  table.writeUInt32LE(payloadOffset, 0x24);
  return Buffer.concat([table, Buffer.alloc(payloadOffset - table.length), payload]);
}

test('reads fixed sections and repeated identifiers', () => {
  const record = parse(fixture()).records[0];
  assert.equal(record.trackIdentifiers.length, 1);
  assert.equal(record.sections[3].count, 2);
  assert.equal(record.sections[4].bytes, 16);
  assert.equal(record.raw.group78[0].hex, '0000000000000000');
  assert.equal(record.raw.group90[1].hex, '0000000000000000');
  assert.deepEqual(record.raw.group90[0].candidate.u32le, [0, 0]);
  assert.deepEqual(record.group90Profile, { count: 2, unique: 1, zero: 2, highBit: 0, nonZero: 0 });
  assert.equal(record.frameValue, 1755);
});
test('compact parse omits explosive raw entry arrays', () => {
  const record = parse(fixture(), { includeRaw: false }).records[0];
  assert.equal(record.raw, undefined);
  assert.equal(record.group90Profile.nonZero, 0);
});
test('rejects identifier mismatch', () => { const b = fixture(); b.writeBigUInt64LE(9n, 0x30); assert.throws(() => parse(b), /identifier/); });
test('rejects section coverage mismatch', () => { const b = fixture(); b.writeUInt32LE(3, 0x30 + 0x90); assert.throws(() => parse(b), /coverage|exceeds/); });
test('rejects trailing bytes', () => { assert.throws(() => parse(Buffer.concat([fixture(), Buffer.alloc(1)])), /trailing/); });
test('rebuilds a lossless container from individual clip payloads', () => {
  const original = fixture(); const parsed = parse(original);
  const clips = parsed.records.map(record => original.subarray(record.offset, record.offset + record.length));
  assert.deepEqual(build(clips), original);
});
test('derives the measured lowercase FNV-1a record identifiers used by named ADEF clips', () => {
  assert.equal(clipNameId('63036a000'), '0x9D2C09E66A1FE6F6');
  assert.equal(clipNameId('59844a000'), '0xAB4C4AB63346E378');
  assert.equal(clipNameId('59844b000'), '0x60DD8ECDFBE86E6B');
  assert.throws(() => clipNameId(''), /non-empty/);
});
test('rejects malformed individual clip payloads', () => {
  assert.throws(() => build([Buffer.alloc(0x9F)]), /fixed header/);
  const bad = Buffer.alloc(0xA0); bad.writeUInt32LE(1, 0x20);
  assert.throws(() => build([bad]), /coverage/);
});
