'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { append2k26VictoryEntry, rowsWithValues } = require('./append_2k26_victory_entry');
const { readVictoryList } = require('./victory-list');

const repo = path.resolve(__dirname, '../..');
const fixture = path.join(repo, 'umbrella-app/app/skeletons/14000-base/BakeMe/Entrances/VictoryListData.jsfb');
const workflow = path.join(repo, 'animation/workflows/victory-6100-2k19');

test('2K26 Victory row clones template 100 and preserves all 719 native records', (t) => {
  if (!fs.existsSync(fixture)) return t.skip('2K26 native VictoryList fixture is unavailable');
  const root = fs.mkdtempSync(path.join(workflow, 'outputs/test-victory-row-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, 'VictoryListData.jsfb');
  const report = append2k26VictoryEntry({ input: fixture, output, entryId: 14003, nameString: 4294957747, motionId: 14003 });
  const before = readVictoryList(fs.readFileSync(fixture));
  const afterBytes = fs.readFileSync(output);
  const after = readVictoryList(afterBytes);
  const rows = rowsWithValues(afterBytes);
  const appended = rows.at(-1);

  assert.equal(report.pass, true);
  assert.equal(report.nativeRowsPreserved, 719);
  assert.equal(after.recordCount, before.recordCount + 1);
  assert.deepEqual(after.records.slice(0, before.recordCount).map(row => row.fields), before.records.map(row => row.fields));
  const template = rows.find(row => row.wrestlerId === 100);
  const expected = { ...template, wrestlerId: 14003, nameString: 4294957747, someId: 14003, victoryFace: 14003 };
  delete expected.index;
  delete expected.table;
  const actual = Object.fromEntries(Object.entries(appended).filter(([key]) => key !== 'index' && key !== 'table'));
  assert.deepEqual(actual, expected, 'clone 100 and patch only its ID, name, base and face fields');
});

test('2K26 custom Victory row can use the required type 1 while preserving template 100 defaults', (t) => {
  if (!fs.existsSync(fixture)) return t.skip('2K26 native VictoryList fixture is unavailable');
  const root = fs.mkdtempSync(path.join(workflow, 'outputs/test-victory-row-type1-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, 'VictoryListData.jsfb');
  const report = append2k26VictoryEntry({ input: fixture, output, entryId: 14004, nameString: 4294957747, motionId: 14003, type: 1 });
  const rows = rowsWithValues(fs.readFileSync(output));
  const appended = rows.at(-1);
  const template = rows.find(row => row.wrestlerId === 100);
  assert.equal(report.pass, true);
  assert.equal(appended.wrestlerId, 14004);
  assert.equal(appended.type, 1);
  for (const key of ['hideId', 'victoryHeel', 'titleFace', 'titleHeel', 'doubleTitle']) {
    assert.equal(appended[key], template[key], `${key} is copied from template 100`);
  }
  assert.equal(appended.someId, 14003);
  assert.equal(appended.victoryFace, 14003);
});
