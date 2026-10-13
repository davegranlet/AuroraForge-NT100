'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { readStream, countWrapEvents } = require('./export-2k20-ir.js');

function stream(rows, decode = true, unwrap = true, options = { contextAwareSentinels: true }) {
  const buf = Buffer.alloc(rows.length * 8);
  rows.forEach((row, i) => {
    row.slice(0, 3).forEach((value, c) => buf.writeInt16BE(value, i * 8 + c * 2));
    buf.writeUInt16BE(row[3] ?? 1, i * 8 + 6);
  });
  return readStream(buf, 0, 0, rows.length, decode, unwrap, options);
}

test('boundary escape connects wrapped neighbors without changing Y or timing', () => {
  const keys = stream([[-32713, -10884, 32710, 22], [-32768, -10883, -32768, 2], [32748, -10887, -32748, 1]]);
  assert.deepEqual(keys.map(key => key.packed), [
    [-32713, -10884, 32710], [-32768, -10883, 32768], [-32788, -10887, 32788],
  ]);
  assert.deepEqual(keys.map(key => [key.frame, key.delta]), [[22, 22], [24, 2], [25, 1]]);
  assert.equal(keys[1].sentinelDecode, 'boundary');
  assert.equal(keys[1].sentinel, true);
});

test('opposite crossing direction preserves the continuous component branch', () => {
  const keys = stream([[32766, -14500, -32768], [-32768, -14499, -32768], [-32758, -14496, 32758]]);
  assert.deepEqual(keys.map(key => key.packed), [
    [32766, -14500, -32768], [32768, -14499, -32768], [32778, -14496, -32778],
  ]);
});

test('boundary sentinel runs and clip endpoints use available non-sentinel anchors', () => {
  const keys = stream([
    [-32768, -12766, -32768, 0], [-32768, -12765, -32768, 1],
    [32762, -12762, -32764, 3], [-32768, -12761, -32768, 1],
  ]);
  assert.deepEqual(keys.map(key => key.packed), [
    [32768, -12766, -32768], [32768, -12765, -32768],
    [32762, -12762, -32764], [32768, -12761, -32768],
  ]);
  assert.equal(keys.filter(key => key.sentinelDecode === 'boundary').length, 3);
});

test('cumulative unwrap survives sentinel adjacency rather than resetting the branch', () => {
  const keys = stream([
    [32000, -10000, -32000], [-32000, -10000, 32000],
    [-32760, -10000, 32760], [-32768, -10000, -32768], [32760, -10000, -32760],
  ]);
  assert.deepEqual(keys[3].packed, [32768, -10000, -32768]);
  assert.deepEqual(keys[4].packed, [32760, -10000, -32760]);
});

test('hinge sentinels retain their native-validated decode and remain unwrap barriers', () => {
  const keys = stream([[0, 32000, 0], [-32768, -32000, -32768], [0, 31000, 0]]);
  assert.deepEqual(keys.map(key => key.packed), [[0, 32000, 0], [0, 64768, 0], [0, 31000, 0]]);
  assert.equal(keys[1].sentinelDecode, 'hinge');
});

test('missing or contradictory context falls back to the hinge interpretation', () => {
  assert.deepEqual(stream([[-32768, -100, -32768]])[0].packed, [0, 32868, 0]);
  const ambiguous = stream([[32760, -10000, -32760], [-32768, 20000, -32768], [0, 0, 0]]);
  assert.equal(ambiguous[1].sentinelDecode, 'hinge');
});

test('context policy is opt-in and leaves position streams and wrap census unchanged', () => {
  const rows = [[32760, -10880, -32760], [-32768, -10883, -32768], [-32760, -10903, 32760]];
  const legacy = stream(rows, true, true, {});
  assert.deepEqual(legacy[1].packed, [0, 43651, 0]);
  const position = stream(rows, false, false);
  assert.deepEqual(position.map(key => key.packed), rows);
  assert.ok(position.every(key => key.sentinel === false && key.sentinelDecode === undefined));
  assert.equal(countWrapEvents(stream(rows, true, false, {})), 0);
});

test('sources with no sentinels produce identical keys under either policy', () => {
  const rows = [[32760, 0, 0], [-32760, 1, 2], [-32750, 2, 3]];
  assert.deepEqual(stream(rows), stream(rows, true, true, {}));
});
