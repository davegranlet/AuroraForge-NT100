'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendCharProfileProEntry, locateRecords, findByCharId } = require('./append-2k25-charprofilepro-entry');

const ORACLE = path.join(
  __dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root',
  'Roster', 'CharProfilePro.jsfb',
);

test('charprofilepro appender mints a new char id', () => {
  const before = fs.readFileSync(ORACLE);
  assert.strictEqual(locateRecords(before).vecInfo.count, 709);

  const edited = appendCharProfileProEntry(before, { templateCharId: 978, newCharId: 14000 });
  const after = locateRecords(edited);
  assert.strictEqual(after.vecInfo.count, 710);
  assert.strictEqual(edited.length, before.length + 4 + 104);

  const created = findByCharId(edited, after.vecInfo, 14000);
  assert.ok(created);
  assert.strictEqual(created.index, 709);
  assert.deepStrictEqual(created.ids, [14000, 14000, 14000]);
}, { timeout: 120000 });

test('charprofilepro appender refuses duplicates and unknown templates', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendCharProfileProEntry(before, { templateCharId: 978, newCharId: 978 }), /already exists/);
  assert.throws(() => appendCharProfileProEntry(before, { templateCharId: 9999, newCharId: 14001 }), /not found/);
}, { timeout: 120000 });

test('charprofilepro appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-'));
  const output = path.join(dir, 'CharProfilePro.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-charprofilepro-entry.js'),
    ORACLE, output, '--template-char-id', '978', '--new-char-id', '14001',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateRecords(fs.readFileSync(output)).vecInfo.count, 710);
}, { timeout: 120000 });
