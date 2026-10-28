'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const L = require('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lib/integration.js');

const auditDir = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-20/opencode-presentation-audit';
const helper = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const oodle = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-v93/oo2core_9_win64.dll';

const wo005Cak = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/aurora-2k25-replace-mod.cak';
const candidateCak = path.join(auditDir, 'candidate-wo005-pairfix', 'aurora-2k25-replace-mod.cak');

const pairPaths = [
  'Cutscene/CaeAdvanced/1014002.jsfb',
  'Cutscene/CaeAdvanced/1114002.jsfb',
  'Cutscene/CaeAdvanced/1214002.jsfb',
  'Cutscene/CaeAdvanced/1314002.jsfb',
  'Cutscene/CaeAdvanced/1414002.jsfb'
];

function fail(msg) { console.error('VERIFICATION FAILED: ' + msg); process.exit(1); }

function extractAll(cakPath, outputDir, label) {
  console.log(`\n=== Extracting all members from ${label} ===`);
  fs.mkdirSync(outputDir, { recursive: true });
  const session = openArchive(cakPath, {});
  console.log(`  key=0x${session.key.toString(16).toUpperCase()}, files=${session.files.length}`);
  const files = session.files.filter(f => f.extractable && f.nameResolved);
  for (const file of files) {
    const req = {
      archivePath: cakPath,
      oodlePath: oodle,
      outputRoot: outputDir,
      archiveKey: session.key,
      overwrite: true,
      entries: [{ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks }]
    };
    const reqPath = path.join(outputDir, `req-${file.id}.json`);
    fs.writeFileSync(reqPath, JSON.stringify(req), 'utf8');
    const res = cp.spawnSync(helper, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    const parsed = JSON.parse(String(res.stdout || '').trim());
    if (!parsed.results || !parsed.results[0] || !parsed.results[0].Ok) {
      fail(`Extraction failed for ${file.name}: ${JSON.stringify(parsed.results && parsed.results[0])}`);
    }
    fs.unlinkSync(reqPath);
  }
  console.log(`  extracted ${files.length} members`);
  return files;
}

// Extract WO005 and candidate to separate directories
const wo005Dir = path.join(auditDir, 'verify-wo005');
const candidateDir = path.join(auditDir, 'verify-candidate');
const wo005Files = extractAll(wo005Cak, wo005Dir, 'WO005');
const candidateFiles = extractAll(candidateCak, candidateDir, 'candidate');

// Compare all members
console.log('\n=== Comparing all members ===');
if (wo005Files.length !== candidateFiles.length) {
  fail(`Member count mismatch: WO005=${wo005Files.length}, candidate=${candidateFiles.length}`);
}

let diffCount = 0;
let sameCount = 0;
const diffs = [];
const bodyClipDiffs = [];

for (const cf of candidateFiles) {
  const wf = wo005Files.find(f => f.name === cf.name);
  if (!wf) fail(`WO005 missing member: ${cf.name}`);
  const candidatePayload = fs.readFileSync(path.join(candidateDir, ...cf.name.split('/')));
  const wo005Payload = fs.readFileSync(path.join(wo005Dir, ...cf.name.split('/')));
  const candidateHash = L.sha256(candidatePayload);
  const wo005Hash = L.sha256(wo005Payload);
  if (candidateHash !== wo005Hash) {
    diffCount++;
    diffs.push(cf.name);
    console.log(`  DIFF: ${cf.name}`);
    console.log(`    candidate=${candidateHash}`);
    console.log(`    WO005   =${wo005Hash}`);
  } else {
    sameCount++;
    // Check body clips specifically
    if (cf.name.includes('14002.clips')) {
      const bodyIdentical = candidatePayload.equals(wo005Payload);
      if (!bodyIdentical) bodyClipDiffs.push(cf.name);
    }
  }
}

console.log(`\nResult: ${sameCount} identical, ${diffCount} differ`);
if (diffCount !== 5) fail(`Expected exactly 5 differing members (pairs), got ${diffCount}: ${diffs.join(', ')}`);

// Verify the five differing members are exactly the pair files
const expectedPairs = new Set(pairPaths.map(p => p.toLowerCase()));
const actualDiffs = new Set(diffs.map(d => d.toLowerCase()));
const unexpected = [...actualDiffs].filter(d => !expectedPairs.has(d));
const missing = [...expectedPairs].filter(d => !actualDiffs.has(d));
if (unexpected.length) fail(`Unexpected diffs: ${unexpected.join(', ')}`);
if (missing.length) fail(`Expected pairs not differing: ${missing.join(', ')}`);
console.log('PASS: Diff set matches exactly the five pair JSFB files');

// Verify body payloads are byte-identical
if (bodyClipDiffs.length) fail(`Body clip payloads differ: ${bodyClipDiffs.join(', ')}`);
const bodyClips = candidateFiles.filter(f => f.name.includes('14002.clips'));
console.log(`PASS: All ${bodyClips.length} body clip payloads byte-identical to WO005`);

// Verify record IDs in body clips are unchanged
console.log('\n=== Verifying record IDs in body clips ===');
for (const cf of bodyClips) {
  const candidatePayload = fs.readFileSync(path.join(candidateDir, ...cf.name.split('/')));
  const wo005Payload = fs.readFileSync(path.join(wo005Dir, ...cf.name.split('/')));
  // Record IDs are at specific offsets in the clips container
  // Just verify the full payload is byte-identical (already done above)
  console.log(`  ${cf.name}: ${candidatePayload.length} bytes, byte-identical to WO005`);
}

// Write verification report
const candidateSha = L.sha256(fs.readFileSync(candidateCak));
const wo005Sha = L.sha256(fs.readFileSync(wo005Cak));
const report = {
  schema: 'wo005-pairfix-verification/v1',
  generated: new Date().toISOString(),
  base: { label: 'WO005', sha256: wo005Sha },
  candidate: { label: 'WO005+pairfix', sha256: candidateSha, path: candidateCak },
  pairfixSource: { label: '0FAE pairfix-v2', sha256: '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1' },
  totalMembers: candidateFiles.length,
  identicalMembers: sameCount,
  differingMembers: diffCount,
  differingMembersList: diffs,
  bodyClipsByteIdentical: true,
  bodyClipCount: bodyClips.length,
  recordIdsPreserved: true,
  verificationPassed: true
};
const reportPath = path.join(auditDir, 'candidate-wo005-pairfix', 'verification.json');
L.writeJsonBomFree(reportPath, report);
console.log(`\n=== VERIFICATION PASSED ===`);
console.log(`Candidate SHA256: ${candidateSha}`);
console.log(`Report: ${reportPath}`);
