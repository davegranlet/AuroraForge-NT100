'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { report } = require('./tbuf-corpus-continuity-report');

function asset(magic, body, tail = Buffer.alloc(0)) {
  const header = Buffer.alloc(36);
  header.write(magic);
  header.writeUInt32LE(1, 4);
  header.write('TBUF', 12);
  header.writeUInt32LE(1, 16);
  header.writeUInt32LE(body.length, 20);
  header.writeUInt32LE(6, 24);
  header.write('ANIM', 28);
  header.writeUInt32LE(10, 32);
  return Buffer.concat([header, body, tail]);
}

test('reports exact and shared-prefix corpus continuity without payload output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tbuf-corpus-'));
  const oldDir = path.join(root, 'old');
  const newDir = path.join(root, 'new');
  fs.mkdirSync(oldDir); fs.mkdirSync(newDir);
  fs.writeFileSync(path.join(oldDir, '6100.acts'), asset('AMYM', Buffer.from([1, 2])));
  fs.writeFileSync(path.join(newDir, '6100.anims'), asset('MINA', Buffer.from([1, 2])));
  fs.writeFileSync(path.join(oldDir, '9100.acts'), asset('AMYM', Buffer.from([3, 4])));
  fs.writeFileSync(path.join(newDir, '9100.anims'), asset('MINA', Buffer.from([3])));
  const result = report(oldDir, newDir);
  assert.equal(result.summary.exactFileBodyContinuity, 1);
  assert.equal(result.summary.sharedPrefixBodyContinuity, 1);
  assert.equal(result.exceptions[0].name, '9100');
  assert.equal(result.exceptions[0].differingBlocks[0].payload.exactSharedPrefix, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('accepts MINA .anims as the left corpus source', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tbuf-corpus-'));
  const left = path.join(root, 'left'); const right = path.join(root, 'right');
  fs.mkdirSync(left); fs.mkdirSync(right);
  fs.writeFileSync(path.join(left, '6100.anims'), asset('MINA', Buffer.from([1, 2])));
  fs.writeFileSync(path.join(right, '6100.anims'), asset('MINA', Buffer.from([1, 2])));
  assert.equal(report(left, right).source.leftExtension, '.anims');
  fs.rmSync(root, { recursive: true, force: true });
});
