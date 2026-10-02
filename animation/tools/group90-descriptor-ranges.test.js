'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { boundedCandidates, ranges, rangesFromCandidates } = require('./group90-descriptor-ranges');

test('builds shared descriptor-owned Group90 ranges', () => {
  assert.deepEqual(ranges([[0, 4, 9], [4, 0, 0]], 15), [
    { start: 4, references: [{ trackIndex: 0, slot: 1 }, { trackIndex: 1, slot: 0 }], endExclusive: 9, entryCount: 5 },
    { start: 9, references: [{ trackIndex: 0, slot: 2 }], endExclusive: 15, entryCount: 6 },
  ]);
});

test('rejects descriptor starts outside the Group90 table', () => {
  assert.throws(() => ranges([[5]], 5), /outside/);
});

test('separates bounded candidates from descriptor values that cannot be direct Group90 indexes', () => {
  assert.deepEqual(boundedCandidates([[0, 4, 2041], [9]], 15), {
    candidates: [{ trackIndex: 0, slot: 1, value: 4 }, { trackIndex: 1, slot: 0, value: 9 }],
    excluded: [{ trackIndex: 0, slot: 2, value: 2041 }],
  });
});

test('retains the original descriptor references in bounded candidate ranges', () => {
  assert.deepEqual(rangesFromCandidates([
    { trackIndex: 2, slot: 3, value: 4 },
    { trackIndex: 7, slot: 1, value: 4 },
    { trackIndex: 2, slot: 4, value: 9 },
  ], 15), [
    { start: 4, references: [{ trackIndex: 2, slot: 3 }, { trackIndex: 7, slot: 1 }], endExclusive: 9, entryCount: 5 },
    { start: 9, references: [{ trackIndex: 2, slot: 4 }], endExclusive: 15, entryCount: 6 },
  ]);
});
