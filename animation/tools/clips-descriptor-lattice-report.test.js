'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { descriptorReferences } = require('./clips-descriptor-lattice-report');

function entry(first) { return { candidate: { u32le: [first, 0] } }; }

test('descriptorReferences groups descriptors into target track slots', () => {
  const record = {
    trackIdentifiers: ['a', 'b'],
    raw: { group78: [entry(0), entry(247), entry(0), entry(506), entry(0), entry(0), entry(759), entry(0)], group90: Array(1000) },
  };
  assert.deepEqual(descriptorReferences(record), [
    { trackIndex: 0, slot: 1, startEntry: 247 },
    { trackIndex: 0, slot: 3, startEntry: 506 },
    { trackIndex: 1, slot: 2, startEntry: 759 },
  ]);
});
