'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compareBuffers } = require('./tbuf-block-compare');

test('compareBuffers distinguishes exact equality and a common prefix with trailing bytes', () => {
  const same = compareBuffers(Buffer.from([1, 2, 3]), Buffer.from([1, 2, 3]));
  assert.equal(same.equal, true);
  assert.equal(same.exactSharedPrefix, true);
  const extended = compareBuffers(Buffer.from([1, 2, 3, 4]), Buffer.from([1, 2, 3]));
  assert.equal(extended.equal, false);
  assert.equal(extended.exactSharedPrefix, true);
  assert.equal(extended.lengthDelta, -1);
});
