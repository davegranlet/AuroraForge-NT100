'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const mtls = require('./mtls');

function fixture() {
  const table = Buffer.from('Alpha\0Beta\0', 'utf8');
  const nameOffsets = [0, 6];
  const headerBytes = 12 + table.length;
  const aligned = (headerBytes + 3) & ~3;
  const countAt = aligned;
  const tocAt = countAt + 4;
  const namesAt = tocAt + 2 * 8;
  const blockAt = (namesAt + 2 * 2 + 3) & ~3;
  const buffer = Buffer.alloc(blockAt + 4);
  buffer.writeUInt32LE(mtls.MAGIC, 0);
  buffer.writeUInt32LE(6, 4);
  buffer.writeUInt32LE(table.length, 8);
  table.copy(buffer, 12);
  buffer.writeInt32LE(2, countAt);
  buffer.writeBigUInt64LE(1n, tocAt);
  buffer.writeBigUInt64LE(2n, tocAt + 8);
  buffer.writeUInt16LE(nameOffsets[0], namesAt);
  buffer.writeUInt16LE(nameOffsets[1], namesAt + 2);
  buffer.writeUInt32LE(mtls.MATERIAL_MAGIC, blockAt);
  return buffer;
}

test('reads MTLS v6 global table, names, TOC, and block magic', () => {
  const result = mtls.inspect(fixture());
  assert.strictEqual(result.version, 6);
  assert.strictEqual(result.materialCount, 2);
  assert.deepStrictEqual(result.names, ['Alpha', 'Beta']);
  assert.strictEqual(result.blockMagicValid, true);
});

test('rejects a bad magic or truncated table', () => {
  const bad = fixture();
  bad.writeUInt32LE(0, 0);
  assert.throws(() => mtls.inspect(bad), /magic/);
  const truncated = fixture().subarray(0, 16);
  assert.throws(() => mtls.inspect(truncated), /table/);
});

test('read-only MTLS roundtrip audit preserves source bytes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-mtls-'));
  const file = path.join(root, 'sample.mtls');
  fs.writeFileSync(file, fixture());
  const result = JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'aurora-format-tool.js'), 'roundtrip', file], { encoding: 'utf8' }));
  assert.equal(result.format, 'mtls');
  assert.equal(result.identical, true);
  assert.equal(result.wroteInput, false);
  assert.deepEqual(fs.readFileSync(file), fixture());
});
