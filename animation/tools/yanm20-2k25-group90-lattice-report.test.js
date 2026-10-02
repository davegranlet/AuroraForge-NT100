'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { fitLattice, signedModulo } = require('./yanm20-2k25-group90-lattice-report');

test('signedModulo returns the nearest signed lane offset', () => {
  assert.equal(signedModulo(250, 256), -6);
  assert.equal(signedModulo(-250, 256), 6);
});

test('fitLattice selects the minimum-residual 256-entry origin', () => {
  const fit = fitLattice([247, 248, 503, 506, 759, 762, 1782, 1783, 1786, 2803, 2806, 2807, 3059, 3062]);
  assert.equal(fit.origin, 247);
  assert.deepEqual(fit.residuals, [0, 1, 0, 3, 0, 3, -1, 0, 3, -4, -1, 0, -4, -1]);
  assert.equal(fit.withinEight, 14);
});
