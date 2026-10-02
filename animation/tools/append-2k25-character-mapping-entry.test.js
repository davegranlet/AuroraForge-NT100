'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendCharacterMappingEntry, locateRecords, findById } = require('./append-2k25-character-mapping-entry');

const ORACLE = path.join(
  __dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root',
  'Characters', 'CharacterMapping.jsfb',
);

test('character mapping appender mints a new id from the dominant shape', () => {
  const before = fs.readFileSync(ORACLE);
  const beforeVec = locateRecords(before);
  assert.strictEqual(beforeVec.count, 832);

  const edited = appendCharacterMappingEntry(before, { templateId: 120, newId: 14000 });
  const afterVec = locateRecords(edited);
  assert.strictEqual(afterVec.count, 833);
  assert.strictEqual(edited.length, before.length + 4 + 64);

  const created = findById(edited, afterVec, 14000);
  assert.ok(created);
  assert.strictEqual(created.index, 832);
  // Hash payload cloned verbatim from template 120.
  const template = findById(before, beforeVec, 120);
  assert.ok(template);
  assert.ok(edited.subarray(created.table + 8, created.table + 64).equals(before.subarray(template.table + 8, template.table + 64)));
});

test('character mapping appender refuses duplicates and unknown templates', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendCharacterMappingEntry(before, { templateId: 120, newId: 120 }), /already exists/);
  assert.throws(() => appendCharacterMappingEntry(before, { templateId: 9999, newId: 14001 }), /not found/);
});

test('character mapping appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'charmap-'));
  const output = path.join(dir, 'CharacterMapping.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-character-mapping-entry.js'),
    ORACLE, output, '--template-id', '120', '--new-id', '14001',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  const edited = fs.readFileSync(output);
  assert.strictEqual(locateRecords(edited).count, 833);
});
