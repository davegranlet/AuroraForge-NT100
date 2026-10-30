'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { transform } = require('./sdb-2k26');
const { findSdbRecord } = require('./sdb-read');

const WRITER = path.join(__dirname, 'append_2k26_sdb_string.js');

test('SDB append preserves a non-empty string sharing its offset with empty aliases', (t) => {
  const scratch = fs.mkdtempSync(path.join(__dirname, '.sdb-append-test-'));
  t.after(() => {
    const resolved = path.resolve(scratch);
    assert.equal(path.dirname(resolved), path.resolve(__dirname), 'test scratch must stay inside animation/tools');
    fs.rmSync(resolved, { recursive: true, force: true });
  });

  const inputPath = path.join(scratch, 'input.sdb');
  const outputPath = path.join(scratch, 'output.sdb');
  const text = Buffer.from('Nick Nosedive', 'utf8');
  const tableEnd = 8 + 2 * 12;
  const source = Buffer.alloc(tableEnd + text.length);
  source.writeUInt32LE(256, 0);
  source.writeUInt32LE(2, 4);
  // IDs with no localized string share the next payload offset with a real name.
  source.writeUInt32LE(tableEnd, 8);
  source.writeUInt32LE(0, 12);
  source.writeUInt32LE(8024163, 16);
  source.writeUInt32LE(tableEnd, 20);
  source.writeUInt32LE(text.length, 24);
  source.writeUInt32LE(8156047, 28);
  transform(text, tableEnd).copy(source, tableEnd);
  fs.writeFileSync(inputPath, source);

  const run = spawnSync(process.execPath, [WRITER, inputPath, outputPath, '--id', '4294957747', '--text', '2K19 The Rock'], {
    cwd: path.resolve(__dirname, '..', '..'),
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const output = fs.readFileSync(outputPath);
  assert.equal(findSdbRecord(output, 8024163).text, '');
  assert.equal(findSdbRecord(output, 8156047).text, 'Nick Nosedive');
  assert.equal(findSdbRecord(output, 4294957747).text, '2K19 The Rock');
});
