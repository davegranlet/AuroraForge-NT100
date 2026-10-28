'use strict';
// rebuild-pairs.js - regenerate the five 14002 pair-Tabl .jsfb files with the typed,
// 4-byte-aligned relocator and write the evidence report. Input is the v116 native
// 1X00273.jsfb (read-only). Also rejects the previously shipped (F1/F2/F3-defective)
// pair files from the 913F/E6 builds as a regression control.
// usage: node rebuild-pairs.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const P = require('./lib/pair-relocate.js');
const L = require('./lib/integration.js');

const OUT_DIR = path.join(__dirname, 'generated', 'pairs');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const PHASES = [100, 110, 120, 130, 140];
const OLD_FIXTURES = [
  path.join(__dirname, 'builds', 'p14002-pairfix-discriminating', 'staging', 'Cutscene', 'CaeAdvanced'),
  path.join(__dirname, 'builds', 'p14002-diag-nativebody', 'staging', 'Cutscene', 'CaeAdvanced'),
];

const report = { schema: 'aurora-forge-pair-rebuild/v2', generated: new Date().toISOString(), phases: [] };
fs.mkdirSync(OUT_DIR, { recursive: true });

let failed = 0;
for (const phase of PHASES) {
  const nativePath = path.join(L.NATIVE273, 'Cutscene/CaeAdvanced', String(phase / 10) + '00273.jsfb');
  const native = fs.readFileSync(nativePath);
  const { buffer, report: relocation } = P.relocatePairTabl(native, { motionId: 14002 });
  const audit = P.auditPairGraph(native, buffer);
  const identity = P.relocatePairTabl(native, { motionId: 273 });
  const identityIdentical = identity.buffer.equals(native);
  const target = path.join(OUT_DIR, phase * 10000 + 14002 + '.jsfb');
  fs.writeFileSync(target, buffer);
  const rejections = [];
  for (const root of OLD_FIXTURES) {
    const oldPath = path.join(root, String(phase / 10) + '14002.jsfb');
    if (!fs.existsSync(oldPath)) continue;
    const oldAudit = P.auditPairGraph(native, fs.readFileSync(oldPath));
    rejections.push({ file: oldPath, pass: oldAudit.pass, durationChain: oldAudit.durationChain, alignment: oldAudit.alignment, scalarMismatches: oldAudit.scalarMismatches.length, graphErrors: oldAudit.graphErrors.length });
    if (oldAudit.pass) failed += 1;
  }
  const entry = {
    phase, nativePath, nativeSha256: sha(native), output: target, outputBytes: buffer.length, outputSha256: sha(buffer),
    relocation, audit, identityByteIdentical: identityIdentical, rejectedOldFixtures: rejections,
  };
  report.phases.push(entry);
  if (!audit.pass || !identityIdentical) failed += 1;
  console.log('phase ' + phase + ': ' + native.length + ' -> ' + buffer.length + ' (+' + relocation.totalDelta + ', pad ' + relocation.paddingBytes + ')' +
    ' | typed offsets ' + relocation.typedOffsetsPatched + ' | vtable rebases ' + relocation.vtableRebases + ' | scalars preserved ' + relocation.scalarFieldsPreserved +
    ' | audit ' + (audit.pass ? 'PASS' : 'FAIL') + ' (duration ' + audit.durationChain.generatedDuration + ', align mis ' + audit.alignment.generatedMisaligned + ', scalarMis ' + audit.scalarMismatches.length + ', graphErr ' + audit.graphErrors.length + ')' +
    ' | identity byte-equal ' + identityIdentical + ' | old fixtures rejected ' + rejections.filter((r) => !r.pass).length + '/' + rejections.length);
}

report.allPass = failed === 0;
L.writeJsonBomFree(path.join(OUT_DIR, 'pair-rebuild-report.json'), report);
console.log(failed ? 'REBUILD FAILED: ' + failed : 'pair rebuild OK: typed/4-byte-aligned audit PASS, old fixtures rejected, identity byte-equal');
process.exitCode = failed ? 1 : 0;
