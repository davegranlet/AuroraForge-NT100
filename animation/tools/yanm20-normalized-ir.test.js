'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { normalize } = require('./yanm20-normalized-ir');

test('applies measured normalization to the selected source triple', () => {
  const ir = { sections: [{ tracks: [{ index: 0, hash32: '0x1', timelines: [{ name: 'primary', keys: [{ frame: 0, packed: [1, 2, 3, 99] }, { frame: 4, packed: [-4, 5, 6, 99] }] }] }] }] };
  const sweep = { tracks: [{ index: 0, best: { sourceTriple: 'primary.triple0', stream: 'A', permutation: [2, 1, 0], signs: [1, -1, 1], offsets: [0, 0, 0], coverageScore: 1 } }] };
  const out = normalize(ir, sweep);
  assert.deepEqual(out[0].rows, [{ frame: 0, packed: [3, -2, 1] }, { frame: 4, packed: [6, -5, -4] }]);
});

test('rejects missing sweep evidence instead of inventing a transform', () => {
  assert.throws(() => normalize({ sections: [{ tracks: [{ index: 0, timelines: [] }] }] }, { tracks: [] }), /missing track/);
});
