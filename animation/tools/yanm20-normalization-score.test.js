'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { wrapS16, transformPacked } = require('./yanm20-normalization-score');

test('wrapS16 keeps values in signed 16-bit space', () => {
  assert.equal(wrapS16(32767), 32767);
  assert.equal(wrapS16(32768), -32768);
  assert.equal(wrapS16(65535), -1);
  assert.equal(wrapS16(-32769), 32767);
});

test('transformPacked applies permutation signs and half-turn offsets', () => {
  assert.deepEqual(
    transformPacked([1, -2, 3], { permutation: [2, 1, 0], signs: [1, -1, 1], offsets: [0, 32768, 0] }),
    [3, -32766, 1],
  );
});
