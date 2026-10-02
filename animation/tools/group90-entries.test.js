'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeEntries, readEntries } = require('./group90-entries');

test('fixed Group90 entries round-trip as uint64 words', () => {
  const values = [0n, 1n, 0x123456789ABCDEFn, 0xFFFFFFFFFFFFFFFFn];
  assert.deepEqual(readEntries(encodeEntries(values), 0, values.length), values);
});

test('fixed Group90 encoding is exactly 8 bytes per entry', () => {
  assert.equal(encodeEntries([1n, 2n, 3n]).length, 24);
});
