'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendCharMoveSetSlot, locateTopVector, findWrestler } = require('./append-2k25-charmoveset-slot');

const ORACLE = path.join(
  process.env.AURORA_TRIBUTE_FIXTURE_ROOT || path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root'),
  'Roster', 'CharMoveSetDataTable.jsfb',
);

test('charmoveset appender repoints a wrestler slot at a new sdb id', () => {
  const before = fs.readFileSync(ORACLE);
  const { vecInfo } = locateTopVector(before);
  assert.strictEqual(vecInfo.count, 713);
  assert.ok(findWrestler(before, vecInfo, 1));

  // Template: stock slot 0xFFFFDABC next to the oracle's own 0xFFFFDAB0 hit.
  const edited = appendCharMoveSetSlot(before, {
    wrestlerId: 1, templateSdbId: 0xffffdabc, newSdbId: 4294957747,
  });
  assert.strictEqual(edited.length, before.length + 4 + 12);
  const { vecInfo: afterVec } = locateTopVector(edited);
  assert.strictEqual(afterVec.count, 713);
  assert.ok(findWrestler(edited, afterVec, 1));
}, { timeout: 120000 });

test('charmoveset appender refuses duplicates and unknown wrestlers', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendCharMoveSetSlot(before, {
    wrestlerId: 1, templateSdbId: 0xffffdabc, newSdbId: 0xffffdab0,
  }), /already present/);
  assert.throws(() => appendCharMoveSetSlot(before, {
    wrestlerId: 9999, templateSdbId: 0xffffdabc, newSdbId: 4294957747,
  }), /not found/);
}, { timeout: 120000 });

test('charmoveset appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charmove-'));
  const output = path.join(dir, 'CharMoveSetDataTable.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-charmoveset-slot.js'),
    ORACLE, output, '--wrestler-id', '1',
    '--template-sdb-id', '4294957756', '--new-sdb-id', '4294957748',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateTopVector(fs.readFileSync(output)).vecInfo.count, 713);
}, { timeout: 120000 });
