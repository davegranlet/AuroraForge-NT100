'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
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

test('evidence audit locates every recovered decompilation row', () => {
  const root = repoRoot(__dirname);
  const script = path.join(root, 'animation/tools/decompilation-evidence-audit.js');
  const index = path.join(root, 'tool-forensics/2026-10-30/decompilation-refresh/ghidra-function-index.csv');
  const output = path.join(os.tmpdir(), `aurora-function-audit-${process.pid}.json`);
  try {
    const result = JSON.parse(execFileSync(process.execPath, [script, index, output], { encoding: 'utf8' }));
    assert.equal(result.total, 71312);
    assert.equal(result.files, 7);
    assert.equal(result.counts['evidence-locatable'], 71139);
    assert.equal(result.counts['no-recovered-body'], 173);
    assert.equal(result.counts['indexed-body-not-found'] || 0, 0);
  } finally {
    fs.rmSync(output, { force: true });
  }
});
