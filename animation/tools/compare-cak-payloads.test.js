'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compare, inventory, validateChunkTables } = require('./compare-cak-payloads');

function file(name, hash, storedSize = 8) {
  return { name, hash, type: 'clips', storedSize, expandedSize: storedSize, compressed: false, protected: false, chunkCount: 1, flags: [0, 0] };
}

test('compares extracted payload hashes and distinguishes added and removed paths', () => {
  const left = { archivePath: 'left.cak', archiveName: 'left.cak', key: 1, files: [file('Animation/Entrance/14002.clips', 'a'), file('old.bin', 'b')] };
  const right = { archivePath: 'right.cak', archiveName: 'right.cak', key: 2, files: [file('Animation/Entrance/14002.clips', 'a'), file('new.bin', 'c')] };
  const leftHashes = [
    { key: 'animation/entrance/14002.clips', sha256: 'A' },
    { key: 'old.bin', sha256: 'B' }
  ];
  const rightHashes = [
    { key: 'animation/entrance/14002.clips', sha256: 'Z' },
    { key: 'new.bin', sha256: 'C' }
  ];
  const result = compare(left, right, leftHashes, rightHashes);
  assert.deepEqual(result.counts, { 'byte-identical': 0, 'payload-different': 1, 'added-right': 1, 'removed-right': 1, 'not-extracted': 0 });
  assert.equal(result.entries.find((entry) => entry.path.endsWith('14002.clips')).status, 'payload-different');
});

test('rejects duplicate normalized catalog paths', () => {
  assert.throws(() => inventory({ archiveName: 'dup.cak', files: [file('A/B.clips', 'x'), file('a/b.clips', 'x')] }), /Duplicate virtual path/);
});

test('flags compressed entries whose chunk count cannot cover the expanded payload', () => {
  const session = { files: [{ ...file('large.clips', 'x', 700000), compressed: true, expandedSize: 1100000, chunks: [{ end: 700000, flag: 1 }] }] };
  const issues = validateChunkTables(session);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].actualChunkCount, 1);
  assert.equal(issues[0].expectedChunkCount, 2);
});
