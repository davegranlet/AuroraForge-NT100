'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

function repoRoot(start) {
  let current = path.resolve(start);
  const fs = require('node:fs');
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  throw new Error('Could not locate repository root');
}

test('fixture audit reports a non-authoritative mixed corpus without rewriting it', () => {
  const script = path.join(__dirname, 'tribute-fixture-audit.js');
  const root = path.join(repoRoot(__dirname), 'animation', 'analysis', 'this-is-the-test-cak', 'extracted-root');
  const run = spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  const report = JSON.parse(run.stdout);
  assert.equal(report.schema, 'aurora-forge-tribute-fixture-audit/v1');
  assert.equal(report.match, false);
  assert.equal(report.results.length, 4);
  assert.ok(report.results.every(item => item.exists));
  assert.ok(report.results.some(item => item.status === 'match'));
  assert.ok(report.results.some(item => item.status === 'mismatch'));
});
