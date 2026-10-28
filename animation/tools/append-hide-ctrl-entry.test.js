'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { appendHideMotionEntry, locateSections } = require('./append-hide-ctrl-entry');

const ORACLE = path.join(
  __dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root',
  'Hide', 'HideCtrlData.hidelink.jsfb',
);

test('hide motion appender clones an s0 record and patches the motion id', () => {
  const before = fs.readFileSync(ORACLE);
  assert.strictEqual(locateSections(before).sections.length, 30);

  const edited = appendHideMotionEntry(before, { section: 0, templateIndex: 0, newMotionId: 14000 });
  const after = locateSections(edited);
  assert.strictEqual(after.sections[0].vecInfo.count, 38721);
  assert.strictEqual(edited.length, before.length + 4 + 20);

  const created = after.sections[0].vecInfo.tables[38720];
  const lib = require('./jsfb-append-lib');
  const r = lib.tableAt(edited, created);
  const f0 = lib.fieldByIndex(r, 0);
  assert.strictEqual(edited.readUInt16LE(f0.at), 14000);
}, { timeout: 300000 });

test('hide motion appender clones an s17 record', () => {
  const before = fs.readFileSync(ORACLE);
  const edited = appendHideMotionEntry(before, { section: 17, templateIndex: 103, newMotionId: 14001 });
  const after = locateSections(edited);
  assert.strictEqual(after.sections[17].vecInfo.count, 706);
}, { timeout: 300000 });

test('hide motion appender refuses duplicates and bad sections', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendHideMotionEntry(before, { section: 0, templateIndex: 0, newMotionId: 14004 }), /already present/);
  assert.throws(() => appendHideMotionEntry(before, { section: 30, templateIndex: 0, newMotionId: 14000 }), /out of range/);
}, { timeout: 300000 });

test('hide motion appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hide-'));
  const output = path.join(dir, 'HideCtrlData.hidelink.jsfb');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-hide-ctrl-entry.js'), 'motion',
    ORACLE, output, '--section', '0', '--template-index', '0', '--new-motion-id', '14002',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  assert.strictEqual(locateSections(fs.readFileSync(output)).sections[0].vecInfo.count, 38721);
}, { timeout: 300000 });
