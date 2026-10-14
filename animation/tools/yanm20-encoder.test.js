'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { encodeStream, encodeRecord, encodeSection } = require('./yanm20-encoder');

test('encodes signed triplets and big-endian frame deltas', () => {
  const bytes = encodeStream([
    { frame: 0, packed: [-1, 0, 32767] },
    { frame: 300, packed: [-32768, 12, -4] },
  ]);
  assert.equal(bytes.length, 16);
  assert.deepEqual([...bytes.subarray(0, 8)], [255, 255, 0, 0, 127, 255, 0, 0]);
  assert.equal(bytes.readUInt16BE(14), 300);
});

test('encodes the verified 0x2100 40-byte record header', () => {
  const result = encodeRecord({
    hash32: 0xF91A7A26,
    streamAOffset: 100,
    streamBOffset: 200,
    streamA: [{ frame: 0, packed: [1, 2, 3] }],
    streamB: [{ frame: 0, packed: [4, 5, 6] }],
    floats: [1, 2, 3, 4],
  });
  assert.equal(result.header.length, 40);
  assert.equal(result.header.readUInt16BE(0), 0x2100);
  assert.equal(result.header.readUInt16BE(2), 40);
  assert.equal(result.header.readUInt32BE(4), 0xF91A7A26);
  assert.equal(result.header.readUInt32BE(12), 1);
  assert.equal(result.header.readFloatBE(36), 4);
});

test('lays out a self-consistent YANM20 section with relative stream offsets', () => {
  const section = encodeSection([{ hash32: 0x12345678,
    streamA: [{ frame: 0, packed: [1, 2, 3] }],
    streamB: [{ frame: 0, packed: [4, 5, 6] }] }]);
  assert.equal(section.toString('ascii', 0, 4), 'YANM');
  assert.equal(section.readUInt16BE(10), 1);
  assert.equal(section.readUInt16BE(18), 40);
  const a = section.readUInt32BE(24);
  const b = section.readUInt32BE(32);
  assert.equal(section.readUInt32BE(28), 1);
  assert.equal(section.readUInt32BE(36), 1);
  assert.deepEqual([...section.subarray(8 + a, 8 + a + 8)], [0, 1, 0, 2, 0, 3, 0, 0]);
  assert.deepEqual([...section.subarray(8 + b, 8 + b + 8)], [0, 4, 0, 5, 0, 6, 0, 0]);
});
