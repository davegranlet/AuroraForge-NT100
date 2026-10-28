'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { encode } = require('./tbuf-v1');
const { inspectFile, report, u32Words } = require('./tbuf-v1-body-prefix-corpus');

function writeActs(filePath, bodyPrefixWords, bodyExtra = Buffer.alloc(128)) {
  const group = Buffer.alloc(16);
  group.writeUInt32LE(0, 8);
  group.writeUInt32LE(1, 12);
  const sizes = Buffer.alloc(4);
  const ids = Buffer.alloc(2);
  ids.writeUInt16LE(6100, 0);
  const header = Buffer.alloc(16);
  header.write('AMYM');
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(1, 8);
  const prefix = Buffer.alloc(64);
  bodyPrefixWords.forEach((word, index) => prefix.writeUInt32LE(word, index * 4));
  const bodyPayload = Buffer.concat([prefix, bodyExtra]);
  const entryPayload = Buffer.concat([encode(Buffer.alloc(12), 3), encode(bodyPayload, 6)]);
  sizes.writeUInt32LE(entryPayload.length, 0);
  fs.writeFileSync(filePath, Buffer.concat([header, group, sizes, ids, entryPayload]));
}

function words(u48 = 232) {
  return [24, 0, 0, 0, 4896, 0, 1, 2, 8, 0, 3614061049, 2097409, u48, 0, 268501081, u48 + 20];
}

test('u32Words reads bounded little-endian prefix words', () => {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32LE(1, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(3, 8);
  assert.deepEqual(u32Words(buffer), [1, 2, 3]);
});

test('inspectFile identifies the single 6-channel body block prefix relationship', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-body-prefix-'));
  const file = path.join(dir, '6100.acts');
  writeActs(file, words(232));
  const row = inspectFile(file);
  assert.equal(row.bodyBlockIndex, 1);
  assert.equal(row.u0, 24);
  assert.equal(row.u48, 232);
  assert.equal(row.u60, 252);
  assert.equal(row.prefix48Plus20Equals60, true);
});

test('report validates stable prefix relationships over a small corpus', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-body-prefix-'));
  writeActs(path.join(dir, '6100.acts'), words(232));
  writeActs(path.join(dir, '6101.acts'), words(296));
  const output = report(dir);
  assert.equal(output.summary.filesWithOneSixChannelBlock, 2);
  assert.equal(output.validator.allHaveStableHeaderPrefix, true);
  assert.equal(output.validator.allHaveStableMidSignature, true);
  assert.equal(output.validator.allHavePrefix48Plus20Equals60, true);
  assert.deepEqual(output.summary.prefixShapeCounts, { 'u48=232;u60=252': 1, 'u48=296;u60=316': 1 });
});
