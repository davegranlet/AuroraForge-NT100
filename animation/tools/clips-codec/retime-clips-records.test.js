'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse, build } = require('../clips-layout');
const { retimeClips, resample } = require('./retime-clips-records');

const FIXTURE = path.resolve(__dirname, '../../workflows/victory-6100-2k19/candidate-victory-f7fix/Animation/Victory/14003.clips');
const SELECTED = [1, 2, 3, 4, 8, 14];

test('retime preserves endpoints and linearly samples between them', () => {
  assert.deepEqual(resample([3, 7], 5), [3, 4, 5, 6, 7]);
  assert.deepEqual(resample([3, 7], 2), [3, 7]);
});

test('Victory companion retime aligns selected records and preserves every other record', { skip: !fs.existsSync(FIXTURE) }, () => {
  const input = fs.readFileSync(FIXTURE);
  const before = parse(input, { includeRaw: false });
  const result = retimeClips(input, 2421, SELECTED);
  const after = parse(result.output, { includeRaw: false });

  assert.equal(after.count, before.count);
  assert.deepEqual(result.reports.map(row => row.index), SELECTED);
  for (let index = 0; index < before.count; index++) {
    const oldRecord = before.records[index];
    const newRecord = after.records[index];
    assert.equal(newRecord.id, oldRecord.id, `record ${index} identity`);
    assert.deepEqual(newRecord.trackIdentifiers, oldRecord.trackIdentifiers, `record ${index} tracks`);
    assert.equal(newRecord.sections.find(section => section.name === 'group38').count,
      oldRecord.sections.find(section => section.name === 'group38').count, `record ${index} extras`);
    if (SELECTED.includes(index)) {
      assert.equal(newRecord.frameValue, 2421, `record ${index} timeline`);
      assert.ok(newRecord.length > oldRecord.length, `record ${index} packed stream grows with frame count`);
    } else {
      const oldBytes = input.subarray(oldRecord.offset, oldRecord.offset + oldRecord.length);
      const newBytes = result.output.subarray(newRecord.offset, newRecord.offset + newRecord.length);
      assert.ok(newBytes.equals(oldBytes), `unselected record ${index} remains byte-identical`);
    }
  }
  assert.equal(parse(build(after.records.map(record => result.output.subarray(record.offset, record.offset + record.length))), { includeRaw: false }).count, 17);
});

test('retime rejects duplicate or out-of-range records', () => {
  const small = build([Buffer.alloc(0xA0)]);
  assert.throws(() => retimeClips(small, 2421, [0, 0]), /invalid|duplicated/i);
  assert.throws(() => retimeClips(small, 2421, [1]), /invalid|duplicated/i);
});
