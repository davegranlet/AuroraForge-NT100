'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { inspectRelocations } = require('./tbuf-v1-relocations');

function fixture(width = 2, prefix = 0) {
  const buffer = Buffer.alloc(prefix + 80 + 4 + width * 3);
  buffer.write('TBUF', prefix); buffer.writeUInt32LE(1, prefix + 4);
  buffer.writeUInt32LE(64, prefix + 8); buffer.writeUInt32LE(3, prefix + 12);
  buffer.write('ANIM', prefix + 16); buffer.writeUInt32LE(10, prefix + 20);
  buffer.writeBigInt64LE(24n, prefix + 24); // forward: field 24 -> target 48
  buffer.writeBigInt64LE(-8n, prefix + 40); // backward: field 40 -> target 32
  buffer.writeUInt32LE(width, prefix + 80);
  [8, 16, 24].forEach((n, i) => buffer.writeUIntLE(n, prefix + 84 + width * i, width));
  return buffer;
}

test('reads all relocation widths, field-relative targets and nulls without mutation', () => {
  for (const width of [1, 2, 4]) {
    const buffer = fixture(width, 7), before = Buffer.from(buffer);
    const result = inspectRelocations(buffer, 7);
    assert.equal(result.tableOffset, 87);
    assert.equal(result.relocationCount, 3);
    assert.deepEqual(result.entries.map(e => e.targetOffset), [55, null, 39]);
    assert.equal(result.bytesAfterTable, 0);
    assert.deepEqual(buffer, before);
  }
});

test('rejects truncated tables, unsupported widths, invalid targets and duplicate fields', () => {
  assert.throws(() => inspectRelocations(fixture().subarray(0, 83)), /table exceeds/);
  assert.throws(() => inspectRelocations(fixture().subarray(0, 89)), /entries exceed/);
  const width = fixture(); width.writeUInt32LE(3, 80);
  assert.throws(() => inspectRelocations(width), /width/);
  const field = fixture(); field.writeUInt16LE(60, 84);
  assert.throws(() => inspectRelocations(field), /field exceeds/);
  const target = fixture(); target.writeBigInt64LE(1000n, 24);
  assert.throws(() => inspectRelocations(target), /target exceeds/);
  target.writeBigInt64LE(-1000n, 24);
  assert.throws(() => inspectRelocations(target), /target exceeds/);
  const duplicate = fixture(); duplicate.writeUInt16LE(8, 86);
  assert.throws(() => inspectRelocations(duplicate), /Duplicate/);
  const version = fixture(); version.writeUInt32LE(11, 20);
  assert.throws(() => inspectRelocations(version), /generation/);
  assert.throws(() => inspectRelocations(fixture(), 0, 80), /table exceeds/);
});
