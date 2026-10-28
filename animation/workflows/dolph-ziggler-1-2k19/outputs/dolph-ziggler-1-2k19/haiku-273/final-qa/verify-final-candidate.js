'use strict';
// final-qa: independent verifier for the lead's FINAL candidate CAK.
// Usage: node verify-final-candidate.js <path-to-aurora-2k25-replace-mod.cak> [--allow-camera-phases 100,110,120,130,140]
//
// Verifies, per phase (1X14002.clips):
//   1. every record other than the 3-track camera record is BYTE-EXACT (incl. body 64-track,
//      all 28/5-track companions, event/extra records found in the container);
//   2. the facial record tracks are the exact 8 established ids and bytes[8..] equal the frozen
//      converted payload (id re-key only);
//   3. only the 3-track camera record may differ from the 0FAE baseline, and only in the
//      phases the lead declares;
//   4. container integrity via clips-layout parse on all five files; CAK basename unchanged.
// Read-only on the candidate; extraction output under final-qa/artifacts/candidate/.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const HERE = __dirname;
const FACIAL_TRACKS = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];
const FROZEN = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19', 'haiku-273', 'facial-converted');
const BASELINE_DIR = path.join(HERE, 'artifacts', 'cached_0FAE', 'Animation', 'CaeAdvanced');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const args = process.argv.slice(2);
const cakPath = args[0];
const allowIdx = args.indexOf('--allow-camera-phases');
const allow = allowIdx >= 0 ? new Set((args[allowIdx + 1] || '').split(',').map((s) => s.trim()).filter(Boolean)) : new Set(['100', '110', '120', '130', '140']);
if (!cakPath || !fs.existsSync(cakPath)) { console.error('usage: node verify-final-candidate.js <cak> [--allow-camera-phases 100,110,...]'); process.exit(2); }
if (path.basename(cakPath).toLowerCase() !== 'aurora-2k25-replace-mod.cak') { console.error('FAIL: CAK basename must remain aurora-2k25-replace-mod.cak (filename participates in key derivation)'); process.exit(2); }

const FOUNDRY = path.join(ROOT, 'cak-foundry');
const { openArchive } = require(path.join(FOUNDRY, 'electron', 'cak-reader.js'));
const DICT = JSON.parse(fs.readFileSync(path.join(FOUNDRY, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const HELPER = path.join(FOUNDRY, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const OODLE = path.join(FOUNDRY, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const report = { schema: 'aurora-forge-final-qa-candidate-verify/v1', generated: new Date().toISOString(), candidate: { path: path.resolve(cakPath), bytes: fs.statSync(cakPath).size, sha256: sha(fs.readFileSync(cakPath)) }, allowCameraPhases: [...allow], phases: [], fails: [], warnings: [] };

const session = openArchive(cakPath, DICT);
const want = session.files.filter((f) => /Animation\/CaeAdvanced\/1\d14002\.clips$/i.test(f.name || '') && f.extractable);
if (want.length !== 5) report.fails.push(`expected 5 x 1X14002.clips members, found ${want.length}`);
const dir = path.join(HERE, 'artifacts', 'candidate');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ archivePath: path.resolve(cakPath), oodlePath: OODLE, outputRoot: dir, archiveKey: session.key, overwrite: true, entries: want.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })) }), 'utf8');
const res = cp.spawnSync(HELPER, [path.join(dir, 'request.json')], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
let parsed; try { parsed = JSON.parse(String(res.stdout || '').trim()); } catch (e) { report.fails.push('helper output unparseable: ' + String(res.stdout || '').slice(0, 200)); parsed = { results: [] }; }
const errs = (parsed.results || []).filter((r) => !r.Ok);
if (errs.length) report.fails.push('extraction errors: ' + errs.map((r) => r.Id + ':' + r.Error).join(';'));

for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const row = { phase, clip: `1${p}14002.clips`, records: [], fails: [], warnings: [] };
  const candFile = path.join(dir, 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
  const baseFile = path.join(BASELINE_DIR, `1${p}14002.clips`);
  if (!fs.existsSync(candFile)) { row.fails.push('missing extracted member'); report.phases.push(row); continue; }
  if (!fs.existsSync(baseFile)) { row.fails.push('baseline missing in final-qa/artifacts/cached_0FAE (run compare-artifacts.js first)'); report.phases.push(row); continue; }
  const cand = parse(fs.readFileSync(candFile), { includeRaw: false });
  const base = parse(fs.readFileSync(baseFile), { includeRaw: false });
  const candBuf = fs.readFileSync(candFile);
  const baseBuf = fs.readFileSync(baseFile);
  if (cand.records.length !== base.records.length) row.fails.push(`record count ${cand.records.length} != baseline ${base.records.length}`);
  for (const rec of cand.records) {
    const isFacial = rec.trackIdentifiers.length === 8 && rec.trackIdentifiers.every((t, k) => t === FACIAL_TRACKS[k]);
    const isCamera = rec.trackIdentifiers.length === 3;
    const r = { index: rec.index, id: rec.id, tracks: rec.trackIdentifiers.length, kind: isFacial ? 'facial' : isCamera ? 'camera(3-track)' : (rec.trackIdentifiers.length >= 200 ? 'body' : 'companion') };
    const payload = candBuf.subarray(rec.offset, rec.offset + rec.length);
    const b = base.records.find((x) => x.id === rec.id && x.trackIdentifiers.length === rec.trackIdentifiers.length);
    if (!b) { r.status = 'NEW-RECORD'; row.fails.push(`record ${rec.id} not present in baseline`); }
    else {
      const bpay = baseBuf.subarray(b.offset, b.offset + b.length);
      const equal = payload.length === b.length && Buffer.compare(payload, bpay) === 0;
      if (equal) r.status = 'EQUAL-BASELINE';
      else if (isCamera && allow.has(String(phase))) r.status = 'CAMERA-CHANGED-ALLOWED';
      else { r.status = 'CHANGED'; row.fails.push(`record ${rec.id} (${r.kind}) changed in phase ${phase} but is not an allowed camera change`); }
    }
    if (isFacial) {
      const frozen = fs.readFileSync(path.join(FROZEN, `1${p}00273-facial-converted.payload.bin`));
      const ok = payload.length === frozen.length && payload.subarray(8).equals(frozen.subarray(8));
      r.facialFrozenEqual = ok;
      if (!ok) row.fails.push(`facial record bytes[8..] differ from frozen payload in phase ${phase}`);
    }
    row.records.push(r);
  }
  row.fails.forEach((f) => report.fails.push(`phase ${phase}: ${f}`));
  row.warnings.forEach((w) => report.warnings.push(`phase ${phase}: ${w}`));
  report.phases.push(row);
  const changed = row.records.filter((r) => r.status === 'CHANGED').length;
  console.log(`phase ${phase}: records ${row.records.length} | camera changed allowed ${row.records.filter((r) => r.status === 'CAMERA-CHANGED-ALLOWED').length} | FAILS ${row.fails.length}${changed ? ' (CHANGED non-camera: ' + changed + ')' : ''}`);
}
report.verdict = report.fails.length === 0 ? 'PASS' : 'FAIL';
fs.writeFileSync(path.join(HERE, 'final-candidate-verification.json'), JSON.stringify(report, null, 1), 'utf8');
console.log('verdict', report.verdict, '| fails', report.fails.length, '| warnings', report.warnings.length);
console.log('final-candidate-verification.json written');
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
