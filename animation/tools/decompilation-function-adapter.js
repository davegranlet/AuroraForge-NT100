'use strict';

// Addressable adapter for every function in the decompilation inventory.
// This is deliberately honest: a decompiled function is not executable Aurora
// Forge behavior until its semantics have been ported and verified.
const fs = require('fs');
const path = require('path');

function die(message) { console.error(message); process.exit(2); }
function findRepoRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  return null;
}
const args = process.argv.slice(2);
const commands = new Set(['summary', 'list', 'inspect', 'invoke']);
const repoRoot = findRepoRoot(__dirname);
const defaultCoverage = repoRoot && path.join(repoRoot, 'tool-forensics/2026-10-30/decompilation-refresh/function-coverage.json');
const coveragePath = commands.has(args[0]) ? defaultCoverage : args[0];
const command = commands.has(args[0]) ? args[0] : (args[1] || 'summary');
const selector = commands.has(args[0]) ? args[1] : args[2];
if (!coveragePath) {
  console.log(JSON.stringify({
    schema: 'aurora-forge-function-adapters/v1',
    status: 'inventory-unavailable',
    callable: true,
    implemented: false,
    reason: 'The private decompilation inventory is not bundled with the distributable; provide function-coverage.json or run from the Aurora Forge repository.'
  }, null, 2));
  process.exit(0);
}
const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const functions = coverage.functions || [];

function find(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return functions[Number(value) - 1] || null;
  return functions.find(item => item.address.toLowerCase() === value.toLowerCase()) ||
    functions.find(item => `${item.binary}:${item.function}`.toLowerCase() === value.toLowerCase()) || null;
}

if (command === 'summary') {
  const byBinary = {};
  for (const item of functions) {
    byBinary[item.binary] = byBinary[item.binary] || { total: 0, decompiled: 0, status: 'reference-only' };
    byBinary[item.binary].total += 1;
    if (item.decompiled) byBinary[item.binary].decompiled += 1;
  }
  console.log(JSON.stringify({ schema: 'aurora-forge-function-adapters/v1', total: functions.length, callableRecords: functions.length, implemented: functions.filter(item => item.status === 'implemented').length, referenceOnly: functions.filter(item => item.status === 'reference-only').length, unsupportedNoBody: functions.filter(item => item.status === 'unsupported-no-body').length, byBinary }, null, 2));
} else if (command === 'list') {
  for (const item of functions) console.log(`${item.id}\t${item.binary}\t${item.function}\t${item.address}\t${item.decompiled ? 'decompiled' : 'no-body'}\t${item.status}`);
} else if (command === 'inspect') {
  const item = find(selector);
  if (!item) die(`Function not found: ${selector}`);
  const status = item.status === 'unsupported-no-body' ? 'unsupported-no-body' : 'reference-only';
  console.log(JSON.stringify({ ...item, adapter: { status, callable: true, implementation: null, reason: status === 'unsupported-no-body' ? 'No recovered decompiled body is available for this indexed function.' : 'The inventory records evidence; no verified Aurora Forge port is registered for this function.' } }, null, 2));
} else if (command === 'invoke') {
  const item = find(selector);
  if (!item) die(`Function not found: ${selector}`);
  // Every inventory row is callable through this stable contract. Recovered
  // native bodies remain evidence until a verified Aurora Forge port exists;
  // the explicit result prevents callers from mistaking evidence for behavior.
  console.log(JSON.stringify({
    function: item,
    result: {
      status: item.status === 'unsupported-no-body' ? 'unsupported-no-body' : 'reference-only',
      callable: true,
      implemented: false,
      output: null,
      reason: item.status === 'unsupported-no-body'
        ? 'No recovered decompiled body is available for this indexed function.'
        : 'Recovered native evidence is addressable, but no verified Aurora Forge implementation is registered.'
    }
  }, null, 2));
} else die(`Unknown command: ${command}`);
