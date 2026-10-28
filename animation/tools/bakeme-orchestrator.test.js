'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyBakeMeConfig } = require('./bakeme-orchestrator');
const { findSdbRecord, readSdbRecords } = require('./sdb-read');

function key(offset) { return (offset & 0xff) ^ 0xcd; }
function encode(bytes, offset) {
  const out = Buffer.alloc(bytes.length);
  let previous = key(offset);
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] ^ previous; previous = out[i]; }
  return out;
}

function sdbFixture() {
  const count = 1;
  const tableEnd = 8 + count * 12;
  const text = Buffer.from('Testing 6');
  const out = Buffer.alloc(tableEnd + text.length + 1);
  out.writeUInt32LE(256, 0);
  out.writeUInt32LE(count, 4);
  out.writeUInt32LE(tableEnd, 8);
  out.writeUInt32LE(text.length, 12);
  out.writeUInt32LE(4294957742, 16);
  encode(text, tableEnd).copy(out, tableEnd);
  return out;
}

test('bakeme-orchestrator copies a full tree, applies active edits, and writes proof', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-bakeme-orchestrator-'));
  const sourceBakeMe = path.join(temp, 'BakeMe');
  const outputBakeMe = path.join(temp, 'OutBakeMe');
  const assetSource = path.join(temp, '14000.clips');
  fs.mkdirSync(path.join(sourceBakeMe, 'String'), { recursive: true });
  fs.writeFileSync(path.join(sourceBakeMe, 'String', 'ENG.sdb'), sdbFixture());
  fs.writeFileSync(path.join(sourceBakeMe, 'keep.txt'), 'unchanged');
  fs.writeFileSync(assetSource, Buffer.from('clip payload'));

  const proof = applyBakeMeConfig({
    sourceBakeMe,
    outputBakeMe,
    assets: [{ source: assetSource, relativePath: 'Animation/Cutscene/14000.clips' }],
    sdb: { relativePath: 'String/ENG.sdb', id: 4294957743, text: 'Test 14000' },
  });

  assert.strictEqual(proof.sourceFiles, 2);
  assert.strictEqual(proof.outputFiles, 3);
  assert.deepStrictEqual(proof.changedFiles.map((file) => [file.relative, file.status]), [
    ['Animation/Cutscene/14000.clips', 'added'],
    ['String/ENG.sdb', 'modified'],
  ]);
  assert.ok(fs.existsSync(path.join(outputBakeMe, 'aurora-bakeme-proof.json')));
  assert.strictEqual(fs.readFileSync(path.join(outputBakeMe, 'keep.txt'), 'utf8'), 'unchanged');

  const editedSdb = fs.readFileSync(path.join(outputBakeMe, 'String', 'ENG.sdb'));
  assert.strictEqual(readSdbRecords(editedSdb).length, 2);
  assert.strictEqual(findSdbRecord(editedSdb, 4294957743).text, 'Test 14000');
});

test('bakeme-orchestrator applies the extended registration writers', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-bakeme-reg-'));
  const sourceBakeMe = path.join(temp, 'BakeMe');
  const outputBakeMe = path.join(temp, 'OutBakeMe');
  const oracleRoot = path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root');
  fs.mkdirSync(path.join(sourceBakeMe, 'Stable'), { recursive: true });
  fs.copyFileSync(
    path.join(oracleRoot, 'Stable', 'TeamsTable.jsfb'),
    path.join(sourceBakeMe, 'Stable', 'TeamsTable.jsfb'),
  );

  const proof = applyBakeMeConfig({
    sourceBakeMe,
    outputBakeMe,
    teams: { relativePath: path.join('Stable', 'TeamsTable.jsfb'), templateTeamId: 100, newTeamId: 14000 },
  });

  const types = proof.operations.map((op) => op.type);
  assert.ok(types.includes('teams'));
  assert.ok(types.includes('teams-verify'));
  const verify = proof.operations.find((op) => op.type === 'teams-verify');
  assert.strictEqual(verify.report.found, true);
  assert.strictEqual(verify.report.index, 50);
  assert.ok(proof.changedFiles.some((file) => file.relative === 'Stable/TeamsTable.jsfb' && file.status === 'modified'));
});
