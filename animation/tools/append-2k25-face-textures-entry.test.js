'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendFaceTexturesEntry, locateRecords, findById } = require('./append-2k25-face-textures-entry');

const ORACLE = path.join(
  process.env.AURORA_TRIBUTE_FIXTURE_ROOT || path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root'),
  'Roster', 'FaceTextures.jsfb',
);

test('face textures appender mints a new id with a cloned child', () => {
  const before = fs.readFileSync(ORACLE);
  assert.strictEqual(locateRecords(before).count, 550);

  const edited = appendFaceTexturesEntry(before, { templateId: 100, newId: 14000 });
  const afterVec = locateRecords(edited);
  assert.strictEqual(afterVec.count, 551);
  assert.strictEqual(edited.length, before.length + 4 + 12 + 8 + 12);

  const created = findById(edited, afterVec, 14000);
  assert.ok(created);
  assert.strictEqual(created.index, 550);
  assert.strictEqual(created.subCount, 1);
});

test('face textures appender refuses duplicates and multi-child templates', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendFaceTexturesEntry(before, { templateId: 100, newId: 100 }), /already exists/);
  assert.throws(() => appendFaceTexturesEntry(before, { templateId: 9999, newId: 14001 }), /not found/);
});

test('face textures appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'face-'));
  const output = path.join(dir, 'FaceTextures.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-face-textures-entry.js'),
    ORACLE, output, '--template-id', '100', '--new-id', '14001',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateRecords(fs.readFileSync(output)).count, 551);
});
