'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ycl = require('./ycl');
const { validateBuffer } = require('./inspect');

test('YCL adapter reports explicit unsupported status without claiming a layout', () => {
  const result = ycl.inspect(Buffer.from([0x59, 0x43, 0x4c, 0x00]), 'fixture.ycl');
  assert.equal(result.status, 'unsupported-no-oracle');
  assert.equal(result.callable, true);
  assert.equal(result.writable, false);
});

test('YCL adapter rejects empty input', () => {
  assert.throws(() => ycl.inspect(Buffer.alloc(0)), /empty/);
});

test('generic validation refuses to claim YCL structural validity', () => {
  const result = validateBuffer(Buffer.from([0x59, 0x43, 0x4c, 0x00]), 'fixture.ycl');
  assert.equal(result.ok, false);
  assert.equal(result.status, 'unsupported-no-oracle');
});
