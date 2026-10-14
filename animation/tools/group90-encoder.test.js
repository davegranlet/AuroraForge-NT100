'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeTokens, decodeTokens } = require('./group90-encoder');

test('generic ULEB encoder round-trips ordinary and long BigInt tokens', () => {
  const values = [0n, 1n, 127n, 128n, 16384n, 0xFFFFFFFFn, 0x123456789ABCDEFn];
  assert.deepEqual(decodeTokens(encodeTokens(values)).map(item => item.value), values);
});

test('generic ULEB encoder preserves its input byte stream on decode/re-encode', () => {
  const original = Buffer.from('808001ff0180808001', 'hex');
  assert.deepEqual(encodeTokens(decodeTokens(original).map(item => item.value)), original);
});
