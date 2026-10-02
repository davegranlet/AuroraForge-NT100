'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { mapReferences } = require('./group90-token-index-map');

test('groups descriptor references by Group90 token index', () => {
  assert.deepEqual(mapReferences([[0, 7, 0], [7, 11, 0]], 20), [
    { startToken: 7, references: [{ trackIndex: 0, slot: 1 }, { trackIndex: 1, slot: 0 }], context: 4 },
    { startToken: 11, references: [{ trackIndex: 1, slot: 1 }], context: 4 },
  ]);
});

test('rejects a descriptor index outside the decoded token stream', () => {
  assert.throws(() => mapReferences([[20]], 20), /outside/);
});
