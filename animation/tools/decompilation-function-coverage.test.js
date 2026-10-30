'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function repoRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  throw new Error('Could not locate repository root');
}
const coveragePath = path.join(repoRoot(__dirname), 'tool-forensics/2026-10-30/decompilation-refresh/function-coverage.json');
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

test('coverage ledger accounts for every decompilation function', () => {
  assert.equal(coverage.total, 71312);
  assert.equal(coverage.functions.length, coverage.total);
  assert.equal(new Set(coverage.functions.map(item => item.id)).size, coverage.total);
  assert.equal(new Set(coverage.functions.map(item => `${item.binary}:${item.address}`)).size, coverage.total);
  for (const item of coverage.functions) {
    assert.ok(item.binary && item.function && item.address);
    assert.ok(['reference-only', 'unsupported-no-body', 'implemented'].includes(item.status));
    assert.ok(item.classification);
    assert.ok(item.evidence);
  }
  assert.equal(coverage.statuses['reference-only'], 71139);
  assert.equal(coverage.statuses['unsupported-no-body'], 173);
});
