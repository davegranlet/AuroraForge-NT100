'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { recordsFromIr, encodeIrSection, recordsFromIrWithReference } = require('./yanm20-ir-writer');

function irFixture() {
  return { sections: [{ tracks: [{ index: 0, hash32: '0x12345678', supported: true, timelineMatches: true,
    quantizationCandidates: [1, 2, 3, 4], timelines: [
      { name: 'primary', keys: [{ frame: 0, packed: [1, 2, 3] }, { frame: 2, packed: [4, 5, 6] }] },
      { name: 'secondary', keys: [{ frame: 0, packed: [7, 8, 9] }] },
    ] }] }] };
}

test('maps neutral IR timelines to 2K20 records without changing packed values', () => {
  const records = recordsFromIr(irFixture());
  assert.equal(records[0].hash32, 0x12345678);
  assert.deepEqual(records[0].streamA[1], { frame: 2, packed: [4, 5, 6] });
  assert.deepEqual(records[0].streamB[0], { frame: 0, packed: [7, 8, 9] });
});

test('rejects missing auxiliary and quantization data', () => {
  const ir = irFixture();
  ir.sections[0].tracks[0].timelines = ir.sections[0].tracks[0].timelines.slice(0, 1);
  delete ir.sections[0].tracks[0].quantizationCandidates;
  assert.throws(() => recordsFromIr(ir), /no explicit stream B/);
});

test('encodes an IR section through the 2K20 section writer', () => {
  const out = encodeIrSection(irFixture());
  assert.equal(out.toString('ascii', 0, 4), 'YANM');
  assert.equal(out.readUInt16BE(10), 1);
  assert.equal(out.readUInt32BE(20), 0x12345678);
});

test('uses a verified 2K20 reference for auxiliary stream and quantization fields', () => {
  const reference = encodeIrSection(irFixture());
  const records = recordsFromIrWithReference(irFixture(), reference);
  assert.deepEqual(records[0].streamB[0], { frame: 0, packed: [7, 8, 9] });
  assert.deepEqual(records[0].floats, [1, 2, 3, 4]);
});
