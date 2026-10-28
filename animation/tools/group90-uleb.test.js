'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { decodeAt, tokensFrom } = require('./group90-uleb');

test('decodes bounded ULEB128 tokens', () => {
  assert.deepEqual(decodeAt(Buffer.from([0x7f]), 0), { value: 127n, bytes: 1 });
  assert.deepEqual(decodeAt(Buffer.from([0xac, 0x02]), 0), { value: 300n, bytes: 2 });
  assert.deepEqual(tokensFrom(Buffer.from([1, 0xac, 2, 3]), 0, 3).map(item => item.value), [1n, 300n, 3n]);
});

test('rejects unterminated tokens', () => {
  assert.throws(() => decodeAt(Buffer.from([0x80]), 0), /truncated/);
});
