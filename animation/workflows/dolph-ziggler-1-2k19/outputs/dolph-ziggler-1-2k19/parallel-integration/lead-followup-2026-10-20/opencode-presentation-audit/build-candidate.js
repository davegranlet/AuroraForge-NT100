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
const faePairDir = path.join(auditDir, '0fae');
const buildDir = path.join(auditDir, 'candidate-wo005-pairfix');
const stagingDir = path.join(buildDir, 'staging');
const cakPath = path.join(buildDir, 'aurora-2k25-replace-mod.cak');

const pairPaths = [
  'Cutscene/CaeAdvanced/1014002.jsfb',
  'Cutscene/CaeAdvanced/1114002.jsfb',
  'Cutscene/CaeAdvanced/1214002.jsfb',
  'Cutscene/CaeAdvanced/1314002.jsfb',
  'Cutscene/CaeAdvanced/1414002.jsfb'
];

function fail(msg) { console.error('BUILD FAILED: ' + msg); process.exit(1); }

// Step 1: Extract all WO005 members
console.log('=== Step 1: Extract all WO005 members ===');
fs.mkdirSync(stagingDir, { recursive: true });
const session = openArchive(wo005Cak, {});
console.log(`WO005 key=0x${session.key.toString(16).toUpperCase()}, files=${session.files.length}`);

const extractableFiles = session.files.filter(f => f.extractable && f.nameResolved);
console.log(`Extracting ${extractableFiles.length} members...`);

for (const file of extractableFiles) {
  const targetDir = path.join(stagingDir, ...path.dirname(file.name).split('/'));
  fs.mkdirSync(targetDir, { recursive: true });
  const request = {
    archivePath: wo005Cak,
    oodlePath: oodle,
    outputRoot: stagingDir,
    archiveKey: session.key,
    overwrite: true,
    entries: [{ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks }]
  };
  const reqPath = path.join(stagingDir, `req-${file.id}.json`);
  fs.writeFileSync(reqPath, JSON.stringify(request), 'utf8');
  const result = cp.spawnSync(helper, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(String(result.stdout || '').trim());
  if (!parsed.results || !parsed.results[0] || !parsed.results[0].Ok) {
    fail(`Extraction failed for ${file.name}: ${JSON.stringify(parsed.results && parsed.results[0])}`);
  }
  fs.unlinkSync(reqPath);
}
console.log(`Extracted ${extractableFiles.length} members OK`);

// Step 2: Replace five pair files with 0FAE versions
console.log('\n=== Step 2: Replace five pair JSFB files with 0FAE pairfix-v2 versions ===');
for (const pairPath of pairPaths) {
  const faeFile = path.join(faePairDir, ...pairPath.split('/'));
  const target = path.join(stagingDir, ...pairPath.split('/'));
  if (!fs.existsSync(faeFile)) fail(`0FAE pair file missing: ${faeFile}`);
  fs.copyFileSync(faeFile, target);
  console.log(`  replaced ${pairPath} with 0FAE version (${fs.statSync(target).size} bytes)`);
}

// Step 3: Verify staging bijection
const staged = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else staged.push(path.relative(stagingDir, full).split(path.sep).join('/'));
  }
})(stagingDir);
staged.sort();
console.log(`\nStaged ${staged.length} members`);

// Step 4: Bake
console.log('\n=== Step 4: Bake candidate CAK ===');
const bake = L.repackager.buildCak(stagingDir, cakPath, {});
const cakSha = L.sha256(cakPath);
console.log(`Baked: ${cakPath}`);
console.log(`  bytes ${bake.bytes} | key 0x${bake.archiveKey.toString(16).toUpperCase()} | members ${bake.fileCount} | tdb ${bake.textureDatabase}`);
console.log(`  sha256 ${cakSha}`);

// Step 5: Verify - extract all members and compare with WO005
console.log('\n=== Step 5: Independent verification ===');
const verifyDir = path.join(buildDir, 'verify');
fs.mkdirSync(verifyDir, { recursive: true });
const verifySession = openArchive(cakPath, {});
console.log(`Candidate key=0x${verifySession.key.toString(16).toUpperCase()}, files=${verifySession.files.length}`);

const verifyFiles = verifySession.files.filter(f => f.extractable && f.nameResolved);
const wo005Files = session.files.filter(f => f.extractable && f.nameResolved);

if (verifyFiles.length !== wo005Files.length) {
  fail(`Member count mismatch: candidate=${verifyFiles.length}, WO005=${wo005Files.length}`);
}

let diffCount = 0;
let sameCount = 0;
const diffs = [];
for (const vf of verifyFiles) {
  const wo005File = wo005Files.find(f => f.name === vf.name);
  if (!wo005File) fail(`WO005 missing member: ${vf.name}`);
  const req = {
    archivePath: cakPath,
    oodlePath: oodle,
    outputRoot: verifyDir,
    archiveKey: verifySession.key,
    overwrite: true,
    entries: [{ id: vf.id, offset: Number(vf.offset), storedSize: vf.storedSize, expandedSize: vf.expandedSize, compressed: vf.compressed, protected: vf.protected, relativePath: vf.name, chunks: vf.chunks }]
  };
  const reqPath = path.join(verifyDir, `req-${vf.id}.json`);
  fs.writeFileSync(reqPath, JSON.stringify(req), 'utf8');
  const res = cp.spawnSync(helper, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  const parsed = JSON.parse(String(res.stdout || '').trim());
  if (!parsed.results || !parsed.results[0] || !parsed.results[0].Ok) {
    fail(`Verification extraction failed for ${vf.name}: ${JSON.stringify(parsed.results && parsed.results[0])}`);
  }
  fs.unlinkSync(reqPath);
  const candidatePayload = fs.readFileSync(path.join(verifyDir, ...vf.name.split('/')));
  const wo005Payload = fs.readFileSync(path.join(stagingDir, ...vf.name.split('/')));
  const candidateHash = L.sha256(candidatePayload);
  const wo005Hash = L.sha256(wo005Payload);
  if (candidateHash !== wo005Hash) {
    diffCount++;
    diffs.push(vf.name);
    console.log(`  DIFF: ${vf.name} (candidate=${candidateHash.slice(0,16)}..., WO005=${wo005Hash.slice(0,16)}...)`);
  } else {
    sameCount++;
  }
}
console.log(`\nVerification: ${sameCount} members identical, ${diffCount} members differ`);
if (diffCount !== 5) fail(`Expected exactly 5 differing members (pairs), got ${diffCount}: ${diffs.join(', ')}`);

// Step 6: Verify the five differing members are exactly the pair files
const expectedPairs = new Set(pairPaths.map(p => p.toLowerCase()));
const actualDiffs = new Set(diffs.map(d => d.toLowerCase()));
const unexpected = [...actualDiffs].filter(d => !expectedPairs.has(d));
const missing = [...expectedPairs].filter(d => !actualDiffs.has(d));
if (unexpected.length) fail(`Unexpected diffs: ${unexpected.join(', ')}`);
if (missing.length) fail(`Expected pairs not differing: ${missing.join(', ')}`);
console.log('Diff set matches exactly the five pair JSFB files');

// Step 7: Verify body payloads are byte-identical to WO005
console.log('\n=== Step 7: Verify body payloads byte-identical to WO005 ===');
const wo005BodyPayloads = {};
const candidateBodyPayloads = {};
for (const file of wo005Files) {
  if (file.name.includes('14002.clips')) {
    const payload = fs.readFileSync(path.join(stagingDir, ...file.name.split('/')));
    wo005BodyPayloads[file.name] = L.sha256(payload);
  }
}
for (const file of verifyFiles) {
  if (file.name.includes('14002.clips')) {
    const payload = fs.readFileSync(path.join(verifyDir, ...file.name.split('/')));
    candidateBodyPayloads[file.name] = L.sha256(payload);
  }
}
const bodyDiffs = Object.keys(wo005BodyPayloads).filter(k => wo005BodyPayloads[k] !== candidateBodyPayloads[k]);
if (bodyDiffs.length) fail(`Body payloads differ: ${bodyDiffs.join(', ')}`);
console.log(`All ${Object.keys(wo005BodyPayloads).length} body clip payloads byte-identical to WO005`);

// Step 8: Write build report
const report = {
  schema: 'wo005-pairfix-candidate/v1',
  generated: new Date().toISOString(),
  base: 'WO005',
  baseSha256: '245FB1A35D38E6B18DA9748620597531E92CB5B7F03AC545B5319DBE9A41C2CF',
  pairfixSource: '0FAE pairfix-v2',
  pairfixSha256: '0FAEAD25F8033225E1479AF07A49EF6CAD65C16945C3AB2EEEC40DE9B6E6D0A1',
  candidate: { path: cakPath, sha256: cakSha, bytes: bake.bytes, archiveKey: '0x' + bake.archiveKey.toString(16).toUpperCase(), members: bake.fileCount },
  replacedPairs: pairPaths,
  verification: {
    totalMembers: verifyFiles.length,
    identicalMembers: sameCount,
    differingMembers: diffCount,
    differingAreExactlyPairs: true,
    bodyPayloadsByteIdentical: true,
    bodyPayloadCount: Object.keys(wo005BodyPayloads).length
  }
};
L.writeJsonBomFree(path.join(buildDir, 'build-report.json'), report);
console.log('\n=== BUILD OK ===');
console.log(`Candidate: ${cakPath}`);
console.log(`SHA256: ${cakSha}`);
console.log(`Report: ${path.join(buildDir, 'build-report.json')}`);
