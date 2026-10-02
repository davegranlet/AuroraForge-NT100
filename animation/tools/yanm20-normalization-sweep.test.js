'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { candidateKey, writeReport } = require('./yanm20-normalization-sweep');

test('candidateKey groups equivalent transform candidates', () => {
  const a = { sourceTriple: 'primary.triple0', stream: 'A', permutation: [0, 1, 2], signs: [1, -1, 1], offsets: [32768, 32768, 32768] };
  const b = { sourceTriple: 'primary.triple0', stream: 'A', permutation: [0, 1, 2], signs: [1, -1, 1], offsets: [32768, 32768, 32768] };
  const c = { ...b, stream: 'B' };
  assert.equal(candidateKey(a), candidateKey(b));
  assert.notEqual(candidateKey(a), candidateKey(c));
});

test('writeReport creates only a new JSON artifact', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-sweep-'));
  try {
    const output = path.join(work, 'report.json');
    writeReport({ schema: 'test' }, output);
    assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), { schema: 'test' });
    assert.throws(() => writeReport({ schema: 'changed' }, output), /refusing to overwrite/);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});
