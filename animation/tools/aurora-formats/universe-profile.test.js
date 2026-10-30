'use strict';

const test = require('node:test');
const assert = require('node:assert');
const universe = require('./universe-profile');

const BASE = {
  schemaVersion: 9,
  shows: [{ id: 1, name: 'Raw' }],
  roster: [{ id: 1 }],
  custom: { keep: true },
};

test('inspects schema version and array counts', () => {
  const result = universe.inspect(BASE);
  assert.strictEqual(result.schemaVersion, 9);
  assert.deepStrictEqual(result.arrays, { shows: 1, roster: 1 });
});

test('merges objects while preserving unknown keys', () => {
  const merged = universe.merge(BASE, { custom: { added: 2 }, shows: [{ id: 2 }] });
  assert.strictEqual(merged.custom.keep, true);
  assert.strictEqual(merged.custom.added, 2);
  assert.deepStrictEqual(merged.shows, [{ id: 2 }]);
});

test('validates array sections and rejects non-objects', () => {
  assert.strictEqual(universe.validate(BASE).ok, true);
  assert.strictEqual(universe.validate({ shows: 'bad' }).ok, false);
  assert.strictEqual(universe.validate([]).ok, false);
});
