'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { decode, encode } = require('./adefs-container');

test('round-trips a version 6 ADefs zlib envelope', () => {
  const encoded = encode(Buffer.from('aurora motion definition'));
  const decoded = decode(encoded);
  assert.equal(decoded.version, 6);
  assert.equal(decoded.expandedBytes, 24);
  assert.equal(decoded.payload.toString(), 'aurora motion definition');
});

test('rejects a mismatched envelope size or version', () => {
  const encoded = encode(Buffer.from([1, 2, 3]));
  encoded.writeUInt32LE(7, 4);
  assert.throws(() => decode(encoded), /Unsupported/);
  const corrupt = encode(Buffer.from([1, 2, 3]));
  corrupt.writeUInt32LE(1, 12);
  assert.throws(() => decode(corrupt), /compressed size/);
});
