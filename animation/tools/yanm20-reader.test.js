'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { encodeSection } = require('./yanm20-encoder');
const { decodeSection } = require('./yanm20-reader');

test('reads back encoded 2K20 records and both streams', () => {
  const input = [{ hash32: 0xCAFEBABE, streamA: [{ frame: 0, packed: [-1, 2, 3] }, { frame: 4, packed: [4, 5, 6] }], streamB: [{ frame: 0, packed: [7, 8, 9] }], floats: [1, 2, 3, 4] }];
  const decoded = decodeSection(encodeSection(input));
  assert.equal(decoded.records.length, 1);
  assert.equal(decoded.records[0].hash32, 0xCAFEBABE);
  assert.deepEqual(decoded.records[0].streamA[1], { frame: 4, packed: [4, 5, 6], delta: 4 });
  assert.deepEqual(decoded.records[0].streamB[0], { frame: 0, packed: [7, 8, 9], delta: 0 });
});

test('rejects truncated stream spans', () => {
  assert.throws(() => decodeSection(Buffer.from('YANM')), /span/);
});

test('preserves the compact 8-byte trailing sentinel header', () => {
  const sentinel = Buffer.alloc(8);
  sentinel.writeUInt16BE(0, 0); sentinel.writeUInt16BE(8, 2); sentinel.writeUInt32BE(0xFACEB00C, 4);
  const decoded = decodeSection(encodeSection([{ hash32: 1, streamA: [{ frame: 0, packed: [1, 2, 3] }], streamB: [{ frame: 0, packed: [4, 5, 6] }] }], { sentinel: { raw: sentinel } }));
  assert.equal(decoded.records.length, 2);
  assert.equal(decoded.records[1].headerSize, 8);
  assert.equal(decoded.records[1].hash32, 0xFACEB00C);
});
