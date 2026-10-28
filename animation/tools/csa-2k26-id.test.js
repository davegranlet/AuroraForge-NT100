'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { readRows } = require('./compare_2k26_csa_rows');
const { csaIdForMotion } = require('./csa-2k26-id');

const stockCsa = path.resolve(__dirname, '../workflows/victory-6100-2k19/pristine-38/Cutscene/CsaDatabase.jsfb');

test('Csa path-key rule matches every native WWE 2K26 Victory row', (t) => {
  if (!fs.existsSync(stockCsa)) return t.skip('native 2K26 Csa fixture is unavailable');
  const native = readRows(stockCsa).filter((row) => row.category === 'Victory');
  assert.equal(native.length, 1148);
  const mismatches = native.filter((row) => csaIdForMotion(row.motionId).toString() !== row.id0);
  assert.deepEqual(mismatches, []);
});

test('Victory Csa path-key fixture remains stable for 6100 and custom 14003', () => {
  assert.equal(csaIdForMotion(6100).toString(), '1505677777968345763');
  assert.equal(csaIdForMotion(14003).toString(), '5885647888236809228');
});
