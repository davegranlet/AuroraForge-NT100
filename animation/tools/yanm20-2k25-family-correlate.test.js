'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { transformKey } = require('./yanm20-2k25-family-correlate');

test('transformKey separates stream and signed normalization families', () => {
  const a = { sourceTriple: 'primary.triple0', stream: 'A', permutation: [0, 1, 2], signs: [1, 1, 1], offsets: [0, 0, 0] };
  const b = { sourceTriple: 'primary.triple0', stream: 'A', permutation: [0, 1, 2], signs: [-1, 1, -1], offsets: [0, 0, 0] };
  const c = { sourceTriple: 'primary.triple0', stream: 'B', permutation: [0, 1, 2], signs: [1, 1, 1], offsets: [0, 0, 0] };
  assert.notEqual(transformKey(a), transformKey(b));
  assert.notEqual(transformKey(a), transformKey(c));
});
