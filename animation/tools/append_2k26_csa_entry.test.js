'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const { readRows, compareRows } = require('./compare_2k26_csa_rows');
const { csaIdForMotion } = require('./csa-2k26-id');

const tool = path.join(__dirname, 'append_2k26_csa_entry.js');
const stockCsa = path.resolve(__dirname, '../workflows/victory-6100-2k19/pristine-38/Cutscene/CsaDatabase.jsfb');
const testRoot = path.resolve(__dirname, '../workflows/victory-6100-2k19/.csa-writer-tests');

function runWriter(input, output, entries) {
  const entriesPath = path.join(path.dirname(output), 'entries.json');
  fs.writeFileSync(entriesPath, JSON.stringify(entries));
  return spawnSync(process.execPath, [tool, input, output, '--entries', entriesPath], {
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('Victory Csa append derives the native 64-bit assembly-path key', (t) => {
  if (!fs.existsSync(stockCsa)) return t.skip('native Csa fixture is unavailable');
  fs.mkdirSync(testRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(testRoot, 'implicit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'out.jsfb');
  const result = runWriter(stockCsa, output, [{ motionId: 99999, category: 'Victory', pairs: [1099999] }]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(compareRows(stockCsa, output, 99999).appendedRow.id0, csaIdForMotion(99999).toString());
});

test('Victory Csa append preserves native rows and writes an explicit unsigned 64-bit key', (t) => {
  if (!fs.existsSync(stockCsa)) return t.skip('native Csa fixture is unavailable');
  fs.mkdirSync(testRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(testRoot, 'explicit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'out.jsfb');
  const id0 = csaIdForMotion(99999).toString();
  const result = runWriter(stockCsa, output, [{ motionId: 99999, category: 'Victory', variant: 'Single', pairs: [1099999], id0 }]);
  assert.equal(result.status, 0, result.stderr);
  const comparison = compareRows(stockCsa, output, 99999);
  assert.equal(comparison.appendedRow.id0, id0);
  assert.equal(comparison.appendedRow.objectBytes, 36);
  assert.equal(comparison.appendedRow.field0Offset, 24);
  assert.equal(readRows(output).length, readRows(stockCsa).length + 1);
});

test('Victory Csa append rejects a non-native explicit key', (t) => {
  if (!fs.existsSync(stockCsa)) return t.skip('native Csa fixture is unavailable');
  fs.mkdirSync(testRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(testRoot, 'range-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'out.jsfb');
  const result = runWriter(stockCsa, output, [{ motionId: 99999, category: 'Victory', pairs: [1099999], id0: '18446744073709551614' }]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /must equal the verified CutsceneAssembly path key/);
  assert.equal(fs.existsSync(output), false);
});

test('Entrance Csa append retains the proven FNV1a32 default', (t) => {
  if (!fs.existsSync(stockCsa)) return t.skip('native Csa fixture is unavailable');
  fs.mkdirSync(testRoot, { recursive: true });
  const dir = fs.mkdtempSync(path.join(testRoot, 'entrance-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'out.jsfb');
  const result = runWriter(stockCsa, output, [{ motionId: 99999, pairs: [1099999, 1199999, 1299999, 1399999, 1499999] }]);
  assert.equal(result.status, 0, result.stderr);
  const added = compareRows(stockCsa, output, 99999).appendedRow;
  assert.equal(added.id0, '3263067597');
  assert.equal(added.objectBytes, 28);
  assert.equal(added.field0Offset, 4);
});
