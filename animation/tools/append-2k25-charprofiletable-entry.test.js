'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendCharProfileTableEntry, locateRecords, findByCharId } = require('./append-2k25-charprofiletable-entry');

const ORACLE = path.join(
  process.env.AURORA_TRIBUTE_FIXTURE_ROOT || path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root'),
  'Roster', 'CharProfileTable.jsfb',
);

test('charprofiletable appender mints a new char id sharing nested targets', () => {
  const before = fs.readFileSync(ORACLE);
  assert.strictEqual(locateRecords(before).vecInfo.count, 821);

  const edited = appendCharProfileTableEntry(before, { templateCharId: 65533, newCharId: 14000 });
  const after = locateRecords(edited);
  assert.strictEqual(after.vecInfo.count, 822);
  assert.strictEqual(edited.length, before.length + 4 + 12 + 92);

  const created = findByCharId(edited, after.vecInfo, 14000);
  assert.ok(created);
  assert.strictEqual(created.index, 821);
}, { timeout: 120000 });

test('charprofiletable appender refuses duplicates and unknown templates', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendCharProfileTableEntry(before, { templateCharId: 65533, newCharId: 65533 }), /already exists/);
  assert.throws(() => appendCharProfileTableEntry(before, { templateCharId: 9999, newCharId: 14001 }), /not found/);
}, { timeout: 120000 });

test('charprofiletable appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'table-'));
  const output = path.join(dir, 'CharProfileTable.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-charprofiletable-entry.js'),
    ORACLE, output, '--template-char-id', '65533', '--new-char-id', '14001',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateRecords(fs.readFileSync(output)).vecInfo.count, 822);
}, { timeout: 120000 });
