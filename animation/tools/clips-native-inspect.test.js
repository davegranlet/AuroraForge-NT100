'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeQuantizedValue, decodeRecordTiming, decodeTimingPrelude, descriptor, entryWord, readBitsLE } = require('./clips-native-inspect');

test('reads native-style little-endian bit fields across uint64 words', () => {
  const words = [0xFEDCBA9876543210n, 0x0123456789ABCDEFn];
  assert.equal(readBitsLE(words, 0, 8), 0x10n);
  assert.equal(readBitsLE(words, 60, 8), 0xFFn);
  assert.equal(readBitsLE(words, 64, 16), 0xCDEFn);
  assert.equal(readBitsLE(words, 3, 0), 0n);
  assert.throws(() => readBitsLE(words, 127, 2), /exceeds/);
});

test('exposes only directly observed descriptor fields', () => {
  assert.deepEqual(descriptor(0x0000002A000017FEn), {
    raw: '0x0000002A000017FE', lowSignedByte: -2, bitWidth: 23, highUint32: 42,
  });
});

test('converts the parser hex representation back to a little-endian uint64', () => {
  assert.equal(entryWord({ hex: 'FE1700002A000000' }), 0x0000002A000017FEn);
});

test('mirrors the native compact timing prelude before value reads', () => {
  // bit 0: stepped=false; bit 1: implicit final span; bits 2..9: mode 3.
  assert.deepEqual(decodeTimingPrelude([12n], 10), {
    runs: [{ stepped: false, length: 10 }], mode: 3, nextBitOffset: 10,
  });
  // stepped=true, explicit length=3, then a final implicit run; mode 9.
  const packed = 1n | (1n << 1n) | (3n << 2n) | (0n << 18n) | (9n << 20n);
  assert.deepEqual(decodeTimingPrelude([packed], 5), {
    runs: [{ stepped: true, length: 3 }, { stepped: false, length: 2 }], mode: 9, nextBitOffset: 28,
  });
});

test('treats an empty Group90 payload as a static/bind record', () => {
  assert.equal(decodeRecordTiming([], 243), null);
  assert.deepEqual(decodeRecordTiming([12n], 10), {
    runs: [{ stepped: false, length: 10 }], mode: 3, nextBitOffset: 10,
  });
});

test('mirrors native scalar descriptor expansion without claiming full pose decoding', () => {
  const word = 0x0000002A000017FEn;
  const decoded = decodeQuantizedValue(word, 2);
  assert.equal(decoded.base, 5.885453550164232e-44);
  assert.equal(decoded.scale, 1048576000);
  assert.equal(decoded.value, decoded.base + 2097152000);
});

test('interprets observed modern descriptor upper words as IEEE float bits', () => {
  const word = 0x3FE5000000000AF9n;
  const decoded = decodeQuantizedValue(word, 0);
  assert.equal(decoded.base, Buffer.from('3FE50000', 'hex').readFloatBE(0));
  assert.equal(decoded.base, 1.7890625);
  assert.equal(decoded.scale, 1006632960);
});
