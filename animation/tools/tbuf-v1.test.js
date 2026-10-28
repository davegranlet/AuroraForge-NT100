'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { decodeAt, encode, replacePayload } = require('./tbuf-v1');

test('round-trips a validated TBUF v1 / ANIM v10 envelope', () => {
  const bytes = encode(Buffer.from([1, 2, 3, 4]), 3);
  const decoded = decodeAt(bytes);
  assert.equal(decoded.declaredBufferBytes, 12);
  assert.equal(decoded.declaredNativeDataBytes, 12);
  assert.equal(decoded.animDataBytes, 4);
  assert.equal(decoded.relocationCount, 3);
  assert.equal(decoded.channelCount, 3);
  assert.deepEqual([...decoded.payload], [1, 2, 3, 4]);
  assert.equal(decoded.nativeData.toString('ascii', 0, 4), 'ANIM');
});

test('rejects a truncated or unsupported envelope', () => {
  assert.throws(() => decodeAt(Buffer.from('TBUF')), /span/);
  const bytes = encode(Buffer.alloc(0), 1); bytes.writeUInt32LE(99, 4);
  assert.throws(() => decodeAt(bytes), /Unsupported/);
});

test('replaces only equal-sized payloads in a reference wrapper', () => {
  const reference = Buffer.concat([Buffer.from([9, 9]), encode(Buffer.from([1, 2, 3]), 3), Buffer.from([8])]);
  const replaced = replacePayload(reference, 2, Buffer.from([4, 5, 6]));
  assert.deepEqual([...replaced], [9, 9, ...encode(Buffer.from([4, 5, 6]), 3), 8]);
  assert.throws(() => replacePayload(reference, 2, Buffer.alloc(2)), /expected 3/);
});
