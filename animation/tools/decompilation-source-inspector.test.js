'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

function repoRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (require('node:fs').existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  throw new Error('Could not locate repository root');
}
const root = repoRoot(__dirname);
const script = path.join(root, 'animation/tools/decompilation-source-inspector.js');
const index = path.join(root, 'tool-forensics/2026-10-30/decompilation-refresh/ghidra-function-index.csv');
function run(...args) { return JSON.parse(execFileSync(process.execPath, [script, index, ...args], { encoding: 'utf8' })); }

test('inspects recovered first function and extracts its body', () => {
  const result = run('1', 'inspect');
  assert.equal(result.status, 'recovered-evidence');
  assert.match(result.body, /FUN_140001010/);
  assert.equal(result.source.endsWith('AnimEditor.full.c'), true);
});

test('reports an indexed function with no recovered body', () => {
  const result = run('2', 'inspect');
  assert.equal(result.decompiled, false);
  assert.equal(result.status, 'no-recovered-body');
  assert.equal(result.body, null);
});

test('inspects the final inventory function by numeric ID', () => {
  const result = run('71312', 'calls');
  assert.equal(result.function, 'FUN_1400e507c');
  assert.ok(Array.isArray(result.calls));
});
