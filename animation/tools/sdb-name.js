#!/usr/bin/env node
'use strict';

// SDB name helper (Tribute "Generate SDB Hash" equivalent, simpler policy):
// given a label text, either reuses an existing ENG.sdb record with the exact
// text, or appends a new record continuing the unsigned id sequence (the
// negative signed space the game already uses) via append_2k25_sdb_string.js.
//
// Usage:
//   node sdb-name.js <input.sdb> <output.sdb> --text "AURORA 16086" [--force-new]
//
// Output (stdout, JSON): { id, signedId, text, created, output }
// The returned `id` is the u32 to store in a row's nameString field
// (edit-2k25-entrance-entry.js --name-string / victory --name-string).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readSdbRecords } = require('./sdb-read.js');

function die(message) { console.error(message); process.exit(2); }

const [input, output] = process.argv.slice(2, 4);
const textAt = process.argv.indexOf('--text');
if (!input || !output || textAt < 0 || process.argv[textAt + 1] === undefined) {
  die('Usage: node sdb-name.js <input.sdb> <output.sdb> --text "LABEL" [--force-new]');
}
const text = process.argv[textAt + 1];
const forceNew = process.argv.includes('--force-new');
const source = fs.readFileSync(input);
const records = readSdbRecords(source);

if (!forceNew) {
  const existing = records.find((record) => record.text === text);
  if (existing) {
    if (path.resolve(output) !== path.resolve(input)) fs.copyFileSync(input, output);
    console.log(JSON.stringify({ id: existing.id >>> 0, signedId: existing.id | 0, text, created: false, output: path.resolve(output) }));
    process.exit(0);
  }
}

const last = records[records.length - 1];
const nextUnsigned = (last.id + 1) >>> 0;
if (nextUnsigned === 0) die('SDB id space exhausted');
const nextSigned = nextUnsigned > 0x7fffffff ? nextUnsigned - 0x100000000 : nextUnsigned;
const appended = spawnSync(process.execPath, [
  path.join(__dirname, 'append_2k25_sdb_string.js'), input, output,
  '--id', String(nextSigned), '--text', text,
], { encoding: 'utf8' });
if (appended.status !== 0) die(`append_2k25_sdb_string failed:\n${appended.stdout || ''}${appended.stderr || ''}`.trim());
const verify = readSdbRecords(fs.readFileSync(output)).find((record) => record.text === text);
if (!verify) die('Verification failed: appended text not found in output');
console.log(JSON.stringify({ id: verify.id >>> 0, signedId: verify.id | 0, text, created: true, output: path.resolve(output) }));
