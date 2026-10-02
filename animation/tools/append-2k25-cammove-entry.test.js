'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendCAMMoveEntry, locateRecords, readMotionId } = require('./append-2k25-cammove-entry');

const ORACLE = path.join(
  __dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root',
  'MoveData', 'CAMMoveData.jsfb',
);

test('cammove appender clones the entrance class and patches f3', () => {
  const before = fs.readFileSync(ORACLE);
  const beforeVec = locateRecords(before);
  assert.strictEqual(beforeVec.count, 14375);

  // Template: a stock entrance-class record (idx1 carries motion 41525).
  const edited = appendCAMMoveEntry(before, { templateMotionId: 41525, newId: 14000, vsize: 116, osize: 80 });
  const afterVec = locateRecords(edited);
  assert.strictEqual(afterVec.count, 14376);
  assert.strictEqual(edited.length, before.length + 4 + 116 + 80);

  const created = readMotionId(edited, afterVec.tables[14375]);
  assert.ok(created);
  assert.strictEqual(created.motionId, 14000);
  assert.strictEqual(created.vsize, 116);
  assert.strictEqual(created.osize, 80);
  // High bytes of f3 preserved from template.
  const beforeRec = readMotionId(before, beforeVec.tables[1]);
  assert.strictEqual(edited.readUInt32LE(afterVec.tables[14375] + created.f3rel + 4), before.readUInt32LE(beforeVec.tables[1] + beforeRec.f3rel + 4));
});

test('cammove appender clones the victory class', () => {
  const before = fs.readFileSync(ORACLE);
  const edited = appendCAMMoveEntry(before, { templateMotionId: 21600, newId: 14004, vsize: 116, osize: 100 });
  const afterVec = locateRecords(edited);
  assert.strictEqual(afterVec.count, 14376);
  const created = readMotionId(edited, afterVec.tables[14375]);
  assert.strictEqual(created.motionId, 14004);
});

test('cammove appender refuses duplicates and bad shapes', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendCAMMoveEntry(before, { templateMotionId: 41525, newId: 41525, vsize: 116, osize: 80 }), /already exists/);
  assert.throws(() => appendCAMMoveEntry(before, { templateMotionId: 41525, newId: 14002, vsize: 116, osize: 100 }), /not found/);
});

test('cammove appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cammove-'));
  const output = path.join(dir, 'CAMMoveData.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-cammove-entry.js'),
    ORACLE, output, '--template-motion-id', '41525', '--new-id', '14002', '--vsize', '116', '--osize', '80',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateRecords(fs.readFileSync(output)).count, 14376);
});
