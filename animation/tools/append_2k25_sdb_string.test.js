'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, 'append_2k25_sdb_string.js');

function key(offset) { return (offset & 0xff) ^ 0xcd; }
function encode(bytes, offset) {
  const out = Buffer.alloc(bytes.length);
  let previous = key(offset);
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] ^ previous; previous = out[i]; }
  return out;
}
function decode(bytes, offset) {
  const out = Buffer.alloc(bytes.length);
  let previous = key(offset);
  for (let i = 0; i < bytes.length; i++) { out[i] = bytes[i] ^ previous; previous = bytes[i]; }
  return out;
}
function readRecords(buffer) {
  const records = [];
  for (let i = 0; i < buffer.readUInt32LE(4); i++) {
    const at = 8 + i * 12;
    const offset = buffer.readUInt32LE(at), length = buffer.readUInt32LE(at + 4);
    records.push({ offset, length, id: buffer.readUInt32LE(at + 8), text: decode(buffer.subarray(offset, offset + length), offset).toString('utf8') });
  }
  return records;
}
function aliasedFixture() {
  const count = 3, tableEnd = 8 + count * 12;
  const alpha = Buffer.from('ALPHA'), beta = Buffer.from('BETA');
  const alphaAt = tableEnd, betaAt = alphaAt + alpha.length + 1;
  const out = Buffer.alloc(betaAt + beta.length + 1);
  out.writeUInt32LE(256, 0); out.writeUInt32LE(count, 4);
  [[alphaAt, alpha.length, 1], [betaAt, beta.length, 2], [alphaAt, alpha.length, 3]].forEach((record, i) => {
    const at = 8 + i * 12;
    out.writeUInt32LE(record[0], at); out.writeUInt32LE(record[1], at + 4); out.writeUInt32LE(record[2], at + 8);
  });
  encode(alpha, alphaAt).copy(out, alphaAt);
  encode(beta, betaAt).copy(out, betaAt);
  return out;
}

test('SDB append preserves aliased payload semantics and adds one record', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-sdb-'));
  const input = path.join(dir, 'input.sdb'), output = path.join(dir, 'output.sdb');
  fs.writeFileSync(input, aliasedFixture());
  const run = spawnSync(process.execPath, [SCRIPT, input, output, '--id', '4', '--text', 'TEST 14000'], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  const records = readRecords(fs.readFileSync(output));
  assert.deepStrictEqual(records.map(({ id, text }) => ({ id, text })), [
    { id: 1, text: 'ALPHA' }, { id: 2, text: 'BETA' }, { id: 3, text: 'ALPHA' }, { id: 4, text: 'TEST 14000' },
  ]);
  assert.strictEqual(records[0].offset, records[2].offset, 'shared payload must remain shared');
});
