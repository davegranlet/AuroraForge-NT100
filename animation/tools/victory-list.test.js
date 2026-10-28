'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { readVictoryList } = require('./victory-list');

const source24 = 'D:/converter-files-usefull/drive-download-20260913T210407Z-1-001/Entrances/VictoryListData.jsfb';
const target25 = 'C:/Games/2k25-extracts/Root/Entrances/VictoryListData.jsfb';

test('reads the nested 2K24 VictoryList record vector without assigning field semantics', () => {
  const result = readVictoryList(fs.readFileSync(source24));
  assert.equal(result.identifier, 'Vict');
  assert.equal(result.bytes, 23016);
  assert.equal(result.recordCount, 527);
  assert.deepEqual(result.records[0].fields.slice(0, 6), [
    { field: 0, offset: 6, bytes: '0100b1e9' },
    { field: 1, offset: 8, bytes: 'b1e99c38' },
    { field: 2, offset: null, bytes: null },
    { field: 3, offset: null, bytes: null },
    { field: 4, offset: null, bytes: null },
    { field: 5, offset: 12, bytes: '55180000' },
  ]);
});

test('detects that 2K25 is a structurally different Victory catalog, not a copy target', () => {
  const source = readVictoryList(fs.readFileSync(source24));
  const target = readVictoryList(fs.readFileSync(target25));
  assert.equal(target.identifier, 'Vict');
  assert.equal(target.bytes, 33208);
  assert.equal(target.recordCount, 661);
  assert.notEqual(target.recordCount, source.recordCount);
  assert.deepEqual(target.records[0].fields.slice(0, 6), [
    { field: 0, offset: 6, bytes: '0100b1e9' },
    { field: 1, offset: 8, bytes: 'b1e99c38' },
    { field: 2, offset: null, bytes: null },
    { field: 3, offset: null, bytes: null },
    { field: 4, offset: 12, bytes: '55180000' },
    { field: 5, offset: 16, bytes: '55180000' },
  ]);
});
