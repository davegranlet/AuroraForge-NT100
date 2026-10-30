'use strict';

const test = require('node:test');
const assert = require('node:assert');
const tdb = require('./tdb');

function fixture() {
  return {
    version: 6,
    entries: [
      {
        assetGuid: '0x0000000000000002',
        texMagic: 526,
        height: 1024,
        width: 2048,
        texGuid: '0x1111111111111111',
        decompressedSize: 4194304,
        bcFormatHash: '0x7FDA1A1A',
        colorSpace: 5,
        mipCount: 11,
        compressionLevel: 2,
        tailHash: '0x0000000000000002',
      },
      {
        assetGuid: '0x0000000000000001',
        texMagic: 526,
        height: 512,
        width: 512,
        texGuid: '0x2222222222222222',
        decompressedSize: 262144,
        bcFormatHash: '0x9EE2BD60',
        colorSpace: 4,
        mipCount: 10,
        compressionLevel: 1,
        tailHash: '0x0000000000000001',
      },
    ],
  };
}

test('writes and reads a v6 TDB in asset-guid order', () => {
  const encoded = tdb.write(fixture());
  const decoded = tdb.read(encoded);
  assert.strictEqual(decoded.version, 6);
  assert.strictEqual(decoded.entrySize, 56);
  assert.strictEqual(decoded.count, 2);
  assert.strictEqual(decoded.entries[0].assetGuid, '0x0000000000000001');
  assert.strictEqual(decoded.entries[0].bcFormat, 'BC3');
  assert.strictEqual(decoded.entries[1].colorSpaceName, 'sRGB');
  assert.strictEqual(decoded.entries[0].mipCount, 10);
});

test('rejects a bad magic or mismatched entry size', () => {
  const encoded = tdb.write(fixture());
  const bad = Buffer.from(encoded);
  bad.writeUInt32LE(0, 0);
  assert.throws(() => tdb.read(bad), /magic/);
  const wrong = Buffer.from(encoded);
  wrong.writeUInt32LE(48, 12);
  assert.throws(() => tdb.read(wrong), /entry size/);
});

test('merges entries by asset guid and keeps the replacement', () => {
  const base = tdb.read(tdb.write(fixture()));
  const merged = tdb.merge(base, [{
    ...fixture().entries[0],
    assetGuid: '0x0000000000000001',
    width: 4096,
  }]);
  assert.strictEqual(merged.entries.length, 2);
  assert.strictEqual(merged.entries.find((entry) => entry.assetGuid === '0x0000000000000001').width, 4096);
});

test('FNV-1a lower hash is stable for ASCII paths', () => {
  assert.strictEqual(tdb.fnv1a64Lower('ABC'), tdb.fnv1a64Lower('abc'));
  assert.notStrictEqual(tdb.fnv1a64Lower('abc'), tdb.fnv1a64Lower('abd'));
});
