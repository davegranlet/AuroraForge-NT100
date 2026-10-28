'use strict';
// pair-tests.js - regression tests for the typed, 4-byte-aligned pair relocation.
// 1. identity relocation byte-identical to native
// 2. relocated output passes the full typed graph audit:
//    - root duration chain (f15 -> vector count 1 -> table f4 duration)
//    - every typed field/scalar/string/vector preserved (F2 id scalars unchanged)
//    - all strings/tables/vectors 4-byte aligned (F3)
// 3. the previously shipped F1/F2/F3-defective fixtures FAIL the audit (913F and E6)
// 4. deterministic, 14002 pairId, documented f7
const fs = require('fs');
const path = require('path');
const P = require('../lib/pair-relocate.js');
const L = require('../lib/integration.js');

let failures = 0;
function test(name, fn) {
  try { const detail = fn(); console.log('PASS ' + name + (detail ? ' :: ' + JSON.stringify(detail) : '')); }
  catch (error) { failures += 1; console.log('FAIL ' + name + ' :: ' + error.message); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const NAT = path.join(L.NATIVE273, 'Cutscene/CaeAdvanced');
const GENERATED = path.join(__dirname, '..', 'generated', 'pairs');
const OLD_913F = path.join(__dirname, '..', 'builds', 'p14002-pairfix-discriminating', 'staging', 'Cutscene', 'CaeAdvanced');
const OLD_E6 = path.join(__dirname, '..', 'builds', 'p14002-diag-nativebody', 'staging', 'Cutscene', 'CaeAdvanced');
const PHASES = [100, 110, 120, 130, 140];
const DURATIONS = { 100: 360, 110: 794, 120: 890, 130: 956, 140: 200 };
const nativeOf = (phase) => fs.readFileSync(path.join(NAT, String(phase / 10) + '00273.jsfb'));

test('identity-relocation-byte-equal', () => {
  const results = [];
  for (const phase of PHASES) {
    const native = nativeOf(phase);
    const identity = P.relocatePairTabl(native, { motionId: 273 });
    assert(identity.buffer.equals(native), 'p' + phase + ' identity relocation changed bytes');
    results.push({ phase, bytes: identity.buffer.length });
  }
  return results;
});

test('relocated-output-typed-audit-pass', () => {
  const results = [];
  for (const phase of PHASES) {
    const audit = P.auditPairGraph(nativeOf(phase), fs.readFileSync(path.join(GENERATED, phase * 10000 + 14002 + '.jsfb')));
    assert(audit.pass, 'p' + phase + ' audit failed: ' + JSON.stringify({ graph: audit.graphErrors.slice(0, 3), scalars: audit.scalarMismatches.slice(0, 3), duration: audit.durationChain, align: audit.alignment }));
    assert(audit.durationChain.nativeCount === 1 && audit.durationChain.generatedCount === 1, 'p' + phase + ' duration vector count');
    assert(audit.durationChain.generatedDuration === DURATIONS[phase], 'p' + phase + ' duration value mismatch');
    assert(audit.alignment.nativeMisaligned === 0 && audit.alignment.generatedMisaligned === 0, 'p' + phase + ' alignment');
    assert(audit.scalarMismatches.length === 0, 'p' + phase + ' scalar mismatches');
    assert(audit.graphErrors.length === 0, 'p' + phase + ' graph errors');
    results.push({ phase, duration: audit.durationChain.generatedDuration, objects: audit.alignment.generatedTotal, tables: audit.reachableTablesGenerated });
  }
  return results;
});

test('old-defective-pairs-rejected', () => {
  const results = [];
  for (const phase of PHASES) {
    const native = nativeOf(phase);
    for (const [label, root] of [['913F', OLD_913F], ['E6', OLD_E6]]) {
      const file = path.join(root, String(phase / 10) + '14002.jsfb');
      if (!fs.existsSync(file)) continue;
      const audit = P.auditPairGraph(native, fs.readFileSync(file));
      assert(!audit.pass, label + ' p' + phase + ' unexpectedly passed');
      assert(audit.graphErrors.length > 0 || audit.scalarMismatches.length > 0, label + ' p' + phase + ' expected graph/scalar differences');
      assert(audit.alignment.generatedMisaligned > 0, label + ' p' + phase + ' expected alignment loss');
      results.push({ label, phase, duration: audit.durationChain.generatedDuration, misaligned: audit.alignment.generatedMisaligned, scalarMismatches: audit.scalarMismatches.length, graphErrors: audit.graphErrors.length });
    }
  }
  return results;
});

test('relocation-deterministic-pairid-f7', () => {
  const results = [];
  for (const phase of PHASES) {
    const native = nativeOf(phase);
    const a = P.relocatePairTabl(native, { motionId: 14002 });
    const b = P.relocatePairTabl(native, { motionId: 14002 });
    assert(a.buffer.equals(b.buffer), 'p' + phase + ' relocation not deterministic');
    const audit = P.auditPairGraph(native, a.buffer);
    assert(audit.headerFields.every((entry) => entry.ok), 'p' + phase + ' header fields');
    assert(a.buffer.length % 4 === 0, 'p' + phase + ' output size not 4-aligned');
    results.push({ phase, pairId: audit.headerFields[0].generated, f7: audit.headerFields[1].generated, bytes: a.buffer.length, padding: a.report.paddingBytes });
  }
  return results;
});

test('relocated-strings-match-native-schema', () => {
  const results = [];
  for (const phase of PHASES) {
    const native = nativeOf(phase);
    const generated = fs.readFileSync(path.join(GENERATED, phase * 10000 + 14002 + '.jsfb'));
    const tokenRegex = /(^|\D)273(?=\D|$)/g;
    const runs = [];
    let start = -1;
    for (let i = 0; i <= native.length; i += 1) {
      const byte = i < native.length ? native[i] : 0;
      const printable = byte >= 0x20 && byte < 0x7f;
      if (printable && start < 0) start = i;
      else if (!printable && start >= 0) { if (i - start >= 8) runs.push(native.toString('latin1', start, i)); start = -1; }
    }
    const tokenRuns = runs.filter((run) => { tokenRegex.lastIndex = 0; return tokenRegex.test(run); });
    const mapped = tokenRuns.map((run) => { tokenRegex.lastIndex = 0; return run.replace(tokenRegex, (match, prefix) => prefix + '14002'); });
    const missing = mapped.filter((run) => generated.indexOf(Buffer.from(run, 'latin1')) === -1);
    assert(tokenRuns.length > 0 && missing.length === 0, 'p' + phase + ' missing mapped strings: ' + JSON.stringify(missing.slice(0, 3)));
    results.push({ phase, tokenRuns: tokenRuns.length });
  }
  return results;
});

console.log(failures ? 'PAIR TESTS FAILED: ' + failures : 'ALL PAIR TESTS PASS');
process.exitCode = failures ? 1 : 0;
