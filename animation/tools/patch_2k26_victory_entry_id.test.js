'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const { append2k26VictoryEntry, rowsWithValues } = require('./append_2k26_victory_entry');
const { patchVictoryEntryId } = require('./patch_2k26_victory_entry_id');

const repo = path.resolve(__dirname, '../..');
const fixture = path.join(repo, 'umbrella-app/app/skeletons/14000-base/BakeMe/Entrances/VictoryListData.jsfb');

test('patch changes only the Victory entry ID and preserves motion ID 14003', (t) => {
  if (!fs.existsSync(fixture)) return t.skip('2K26 native VictoryList fixture is unavailable');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-victory-id-patch-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const initial = path.join(root, 'initial.jsfb');
  const output = path.join(root, 'patched.jsfb');
  append2k26VictoryEntry({ input: fixture, output: initial, entryId: 14003, nameString: 4294957747, motionId: 14003 });
  const before = fs.readFileSync(initial);
  const report = patchVictoryEntryId({ input: initial, output, fromEntryId: 14003, toEntryId: 14004, expectedMotionId: 14003 });
  const after = fs.readFileSync(output);
  const diff = [];
  for (let index = 0; index < before.length; index += 1) if (before[index] !== after[index]) diff.push(index);
  const rows = rowsWithValues(after);
  assert.equal(report.pass, true);
  assert.equal(report.changedFieldWidth, 2);
  assert.equal(report.changedBytes, 1);
  assert.equal(diff.length, 1);
  assert.equal(rows.at(-1).wrestlerId, 14004);
  assert.equal(rows.at(-1).someId, 14003);
  assert.equal(rows.at(-1).victoryFace, 14003);
  assert.equal(rows.length, 720);
  assert.throws(() => patchVictoryEntryId({ input: output, output: path.join(root, 'duplicate.jsfb'), fromEntryId: 14004, toEntryId: 100, expectedMotionId: 14003 }), /already occupied/);
  assert.throws(() => patchVictoryEntryId({ input: initial, output: path.join(root, 'wrong-motion.jsfb'), fromEntryId: 14003, toEntryId: 14004, expectedMotionId: 14100 }), /does not point/);
});
