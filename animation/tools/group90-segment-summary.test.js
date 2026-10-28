'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { summarizeBytes } = require('./group90-segment-summary');
const { decodeAt } = require('./group90-uleb');

test('summarizes complete ULEB tokens within a segment', () => {
  assert.deepEqual(summarizeBytes(Buffer.from([0, 5, 0xac, 2]), 0, 4), { bytes: 4, tokens: 3, oneByteTokens: 2, smallTokens: 2, zeroTokens: 1, largestToken: '300' });
});

test('rejects a token crossing a segment boundary', () => {
  assert.throws(() => summarizeBytes(Buffer.from([0xac, 2]), 0, 1), /crosses/);
});

test('permits a Group90 ULEB token longer than ten bytes', () => {
  const token = decodeAt(Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0]), 0);
  assert.equal(token.bytes, 11);
  assert.equal(token.value, 0n);
});
