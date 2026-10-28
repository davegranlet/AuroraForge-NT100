'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { window } = require('./yanm20-2k25-group90-entry-correlate');

function entry(index) {
  return { index, hex: index.toString(16).padStart(16, '0').toUpperCase(), candidate: { u32le: [index, index + 1], u16le: [index, 0, 0, 0] } };
}

test('window clamps entry context at table boundaries', () => {
  const entries = [0, 1, 2, 3].map(entry);
  assert.deepEqual(window(entries, 0, 2).map(item => item.index), [0, 1, 2]);
  assert.deepEqual(window(entries, 3, 2).map(item => item.index), [1, 2, 3]);
});
