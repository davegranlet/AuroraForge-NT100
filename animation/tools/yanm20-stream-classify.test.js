'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreComparison } = require('./yanm20-stream-classify');

test('coverage score rewards both overlap and value agreement', () => {
  assert.equal(scoreComparison({ sourceKeys: 10, sharedFrames: 10, toleranceRate: 1 }), 1);
  assert.equal(scoreComparison({ sourceKeys: 10, sharedFrames: 5, toleranceRate: 1 }), 0.5);
  assert.equal(scoreComparison({ sourceKeys: 10, sharedFrames: 5, toleranceRate: 0.8 }), 0.4);
  assert.equal(scoreComparison({ sourceKeys: 0, sharedFrames: 0, toleranceRate: 1 }), 0);
});
