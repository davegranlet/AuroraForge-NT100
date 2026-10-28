'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { compareControlPair } = require('./clip-control-pair');

const root = 'D:\\wwe 2k25 mods\\extracts\\Animation\\animbanks\\ingame\\general_purpose';

test('reports the controlled editor slice as descriptor evidence without claiming Group90 coverage', () => {
  const report = compareControlPair(`${root}\\original.clip`, `${root}\\slice_0_30.clip`);
  assert.equal(report.identity.sameId, true);
  assert.equal(report.identity.sameTrackIdentifiers, true);
  assert.deepEqual(report.identity.fps, [60, 60]);
  assert.deepEqual(report.identity.frameValue, [11001, 31]);
  assert.deepEqual(report.group78.counts, [438, 438]);
  assert.equal(report.group78.changedEntries, 159);
  assert.deepEqual(report.group90.counts, [0, 0]);
  assert.equal(report.group90.changedEntries, 0);
});
