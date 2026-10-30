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
const root = repoRoot(__dirname);
const script = path.join(root, 'animation/tools/decompilation-function-adapter.js');
const coverage = path.join(root, 'tool-forensics/2026-10-30/decompilation-refresh/function-coverage.json');
function invoke(selector) {
  return JSON.parse(execFileSync(process.execPath, [script, coverage, 'invoke', selector], { encoding: 'utf8' }));
}

test('invoke returns an explicit callable reference-only result', () => {
  const result = invoke('1');
  assert.equal(result.function.id, 1);
  assert.equal(result.result.callable, true);
  assert.equal(result.result.implemented, false);
  assert.equal(result.result.status, 'reference-only');
});

test('invoke returns an explicit unsupported result for no-body rows', () => {
  const result = invoke('2');
  assert.equal(result.function.id, 2);
  assert.equal(result.result.callable, true);
  assert.equal(result.result.status, 'unsupported-no-body');
});

test('list and inspect preserve unsupported status instead of relabeling it', () => {
  const listed = execFileSync(process.execPath, [script, coverage, 'list'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split(/\r?\n/);
  assert.match(listed[1], /\tunsupported-no-body$/);
  const inspected = JSON.parse(execFileSync(process.execPath, [script, coverage, 'inspect', '2'], { encoding: 'utf8' }));
  assert.equal(inspected.adapter.status, 'unsupported-no-body');
});

test('adapter reports missing private inventory explicitly', () => {
  const isolated = path.join(os.tmpdir(), `aurora-function-adapter-${process.pid}.js`);
  fs.copyFileSync(script, isolated);
  try {
    const result = JSON.parse(execFileSync(process.execPath, [isolated, 'summary'], { encoding: 'utf8' }));
    assert.equal(result.status, 'inventory-unavailable');
    assert.equal(result.callable, true);
  } finally {
    fs.rmSync(isolated, { force: true });
  }
});
