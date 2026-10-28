'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { encode } = require('./tbuf-v1');
const { byteDiffRanges, payloadWindowDiffs, report } = require('./tbuf-v1-track-probe');

function tempFile(name, blocks) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-tbuf-probe-'));
  const header = Buffer.alloc(20);
  header.write('AMYM');
  header.writeUInt32LE(1, 4);
  header.writeUInt32LE(1, 8);
  return path.join(dir, name);
}

function writeSyntheticActs(filePath, payloads) {
  const groupCount = 1;
  const entryCount = 1;
  const group = Buffer.alloc(16);
  group.writeUInt32LE(0, 8);
  group.writeUInt32LE(1, 12);
  const entryPayload = Buffer.concat(payloads.map((payload, index) => encode(payload, index === 0 ? 3 : 6)));
  const sizes = Buffer.alloc(4);
  sizes.writeUInt32LE(entryPayload.length, 0);
  const ids = Buffer.alloc(2);
  ids.writeUInt16LE(6100, 0);
  const header = Buffer.alloc(16);
  header.write('AMYM');
  header.writeUInt32LE(groupCount, 4);
  header.writeUInt32LE(entryCount, 8);
  fs.writeFileSync(filePath, Buffer.concat([header, group, sizes, ids, entryPayload]));
}

test('byteDiffRanges reports compact changed ranges without exposing payload bytes', () => {
  const result = byteDiffRanges(Buffer.from([1, 2, 3, 4, 5, 6]), Buffer.from([1, 9, 9, 4, 8, 6]));
  assert.equal(result.differentBytes, 3);
  assert.deepEqual(result.ranges, [
    { start: 1, end: 2, bytes: 2 },
    { start: 4, end: 4, bytes: 1 },
  ]);
});

test('payloadWindowDiffs emits hashes for changed windows only', () => {
  const result = payloadWindowDiffs(Buffer.from([1, 2, 3, 4, 5, 6]), Buffer.from([1, 2, 9, 4, 5, 8]), 3);
  assert.equal(result.changedWindows, 2);
  assert.equal(result.sample.length, 2);
  assert.deepEqual(result.sample.map(window => window.offset), [0, 3]);
  assert.ok(result.sample.every(window => !Object.hasOwn(window, 'bytesHex')));
});

test('report compares aligned synthetic TBUF blocks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-tbuf-probe-'));
  const left = path.join(dir, '6100.acts');
  const right = path.join(dir, '6101.acts');
  writeSyntheticActs(left, [Buffer.from([1, 2, 3, 4]), Buffer.from([10, 11, 12, 13])]);
  writeSyntheticActs(right, [Buffer.from([1, 2, 9, 4]), Buffer.from([10, 11, 12, 99])]);

  const output = report([left, right], { windowBytes: 2 });
  assert.equal(output.files[0].summary?.tbufBlocks, undefined);
  assert.equal(output.files[0].tbufBlocks, 2);
  assert.equal(output.files[0].channelCounts['3'], 1);
  assert.equal(output.comparisons[0].sameChannelOrder, true);
  assert.equal(output.channelOccurrenceComparisons[0].matchedBlocks, 2);
  assert.equal(output.comparisons[0].sameDeclaredSizes, true);
  assert.equal(output.comparisons[0].blocks[0].payload.firstDifference, 2);
  assert.equal(output.comparisons[0].blocks[1].payload.firstDifference, 3);
});


