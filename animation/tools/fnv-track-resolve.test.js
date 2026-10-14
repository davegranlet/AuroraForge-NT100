'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { fnv1a64 } = require('./fnv-track-resolve');

test('computes the verified WWE FNV-1a identifier for J_Hips', () => {
  assert.equal(fnv1a64('J_Hips'), '0xF4043B2D54A71FC8');
});
