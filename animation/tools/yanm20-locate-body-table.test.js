'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalHash, commonPrefix, scanBlocks } = require('./yanm20-locate-body-table');

test('scanBlocks reports big-endian YANM header metadata', () => {
  const buffer = Buffer.alloc(40);
  buffer.write('YANM', 4, 'ascii');
  buffer.writeUInt32BE(32, 8);
  buffer.writeUInt16BE(3, 14);
  assert.deepEqual(scanBlocks(buffer), [{ offset: 4, size: 32, count: 3, tableOffset: 20, declaredEnd: 36 }]);
});

test('commonPrefix requires the same ordered hash sequence', () => {
  assert.equal(commonPrefix(['A', 'B', 'C'], ['A', 'B', 'D']), 2);
  assert.equal(commonPrefix(['A'], ['B']), 0);
});

test('canonicalHash ignores the x prefix casing', () => {
  assert.equal(canonicalHash('0x0c5879e5'), canonicalHash('0X0C5879E5'));
});
