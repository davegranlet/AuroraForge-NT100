'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { inspectOffsetHypotheses, summarizeOffsetHypotheses } = require('./tbuf-v1-body-offset-hypotheses');

function fixture() {
  const payload = Buffer.alloc(256, 0xab);
  // Field-relative targets: 64 + 32 + 16 = 112; 84 + 52 + 8 = 144.
  payload.fill(0, 112, 128);
  payload.writeUInt32LE(7, 116);
  return { payload, a: [0, 7, 0, 0, 64], b: [0, 9, 84, 0, 7] };
}

test('compares address bases and matches a complete field-relative 32-byte header', () => {
  const { payload, a, b } = fixture();
  const result = inspectOffsetHypotheses(payload, 32, 52, a, b, 7);
  assert.equal(result.absolute.bytes, 20);
  assert.equal(result.recordRelative.bytes, 40);
  assert.equal(result.fieldRelative.bytes, 32);
  assert.equal(result.absolute.matchingHeaderCount, 0);
  assert.equal(result.fieldRelative.matchingHeaderCount, 1);
  assert.deepEqual(result.fieldRelative.startHeaderCountMatches, ['prefix', 'at48', 'at60Tail']);
  assert.equal(result.fieldRelative.matchingHeaderSamples[0].relativeOffset, 0);
  assert.equal(result.fieldRelative.zeroU32, 3);
  assert.deepEqual(result.fieldRelative.trailingTwentyByteWindow, {
    start: 132, bytes: 12,
    sha256: crypto.createHash('sha256').update(payload.subarray(132, 144)).digest('hex').toUpperCase(),
  });
  assert.equal(JSON.stringify(result).includes('"words"'), false);
  payload.writeUInt32LE(8, 116);
  assert.equal(inspectOffsetHypotheses(payload, 32, 52, a, b, 7).fieldRelative.matchingHeaderCount, 0);
});

test('scans headers at four-byte alignment and counts beyond the sample cap', () => {
  const payload = Buffer.alloc(128, 0xab);
  for (const offset of [4, 36, 68]) {
    payload.fill(0, offset, offset + 16);
    payload.writeUInt32LE(7, offset + 4);
  }
  const scan = limit => inspectOffsetHypotheses(payload, 0, 0, [0, 7, 0, 0, 0], [0, 7, 100, 0, 7], 7, limit).absolute;
  assert.equal(scan(1).matchingHeaderCount, 3);
  assert.equal(scan(1).matchingHeaderSamples.length, 1);
  assert.equal(scan(1).matchingHeaderSamples[0].relativeOffset, 4);
  assert.equal(scan(0).matchingHeaderCount, 3);
  assert.equal(scan(0).matchingHeaderSamples.length, 0);
});

test('rejects bad inputs and preserves invalid or unaligned candidate status', () => {
  const { payload, a, b } = fixture();
  assert.throws(() => inspectOffsetHypotheses(null, 32, 52, a, b, 7), /Buffer/);
  for (const limit of [-1, 0.5, Infinity, NaN]) {
    assert.throws(() => inspectOffsetHypotheses(payload, 32, 52, a, b, 7, limit), /sampleLimit/);
  }
  for (const end of [-1, 32, 300]) {
    const result = inspectOffsetHypotheses(payload, 32, 52, a, [0, 7, end, 0, 7], 7);
    assert.equal(result.absolute.inBounds, false);
  }
  const unaligned = inspectOffsetHypotheses(payload, 0, 0, [0, 7, 0, 0, 1], b, 7).absolute;
  assert.equal(unaligned.inBounds, true);
  assert.equal(unaligned.aligned, false);
  assert.equal(unaligned.matchingHeaderCount, null);
  // A matching prefix without the full 32-byte span must not count.
  const truncated = inspectOffsetHypotheses(payload, 32, 52, a, [0, 7, 80, 0, 7], 7).fieldRelative;
  assert.equal(truncated.bytes, 28);
  assert.equal(truncated.matchingHeaderCount, 0);
  assert.deepEqual(truncated.startHeaderCountMatches, ['prefix', 'at48', 'at60', 'at60Tail']);
  assert.equal(summarizeOffsetHypotheses([]).usualGap.total, 0);
});

test('summaries separate usual and expanded gaps and retain descriptor exceptions', () => {
  const { payload, a, b } = fixture();
  const row = {
    relationships: { at60Word2EqualsAt48Word4Plus20: true },
    derived: {
      tableRanges: { offsets: { at48Word4: 64, at60Word2: 84 } },
      descriptorWords: { at48Word1: { low16: 7 }, at60Word1: { low16: 9 } },
      offsetHypotheses: inspectOffsetHypotheses(payload, 32, 52, a, b, 7),
    },
  };
  const expanded = structuredClone(row);
  expanded.relationships.at60Word2EqualsAt48Word4Plus20 = false;
  expanded.derived.tableRanges.offsets.at60Word2 = 104;
  expanded.derived.offsetHypotheses = inspectOffsetHypotheses(payload, 32, 52, a, [0, 9, 104, 0, 7], 7);
  const result = summarizeOffsetHypotheses([row, expanded]);
  assert.equal(result.usualGap.total, 1);
  assert.equal(result.expandedGap.total, 1);
  assert.equal(result.usualGap.equalDescriptorCounts, 0);
  assert.deepEqual(result.usualGap.hypotheses.fieldRelative.startHeaderCountMatches, {
    prefix: 1, at48: 1, at60: 0, at60Tail: 1,
  });
});
