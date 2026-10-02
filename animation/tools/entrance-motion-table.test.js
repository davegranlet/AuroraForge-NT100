'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { readEntranceMotionTable } = require('./entrance-motion-table');

const source24 = 'D:/converter-files-usefull/drive-download-20260913T210407Z-1-001/Cutscene/ListData/EntranceMotionTableData.jsfb';
const target25 = 'C:/Games/2k25-extracts/Root/Cutscene/ListData/EntranceMotionTableData.jsfb';

test('reads the measured five-lane EntranceMotionTable registration records', () => {
  const result = readEntranceMotionTable(fs.readFileSync(source24));
  assert.equal(result.identifier, 'Entr');
  assert.equal(result.bytes, 1204);
  assert.equal(result.recordCount, 40);
  assert.deepEqual(result.records[0], { index: 0, fields: [29101, 29102, 29109, 29113, 29114] });
  assert.deepEqual(result.records[27], { index: 27, fields: [29350, 29353, null, null, null] });
  assert.equal(result.records.every(record => record.fields.length === 5), true);
});

test('reads identical 2K24 and 2K25 registration records without assigning lane semantics', () => {
  const source = readEntranceMotionTable(fs.readFileSync(source24));
  const target = readEntranceMotionTable(fs.readFileSync(target25));
  assert.deepEqual(target.records, source.records);
});
