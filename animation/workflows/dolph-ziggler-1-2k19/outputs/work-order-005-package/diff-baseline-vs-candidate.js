'use strict';
// diff-baseline-vs-candidate.js - prove the five 1X14002.clips differences between the installed
// snapshot (B644C39E) and the WO005 candidate (245FB1A3) are EXCLUSIVELY the intended re-keyed
// id fields (record-table entry + payload head). Anything else = fail.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const snapshotCak = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/baseline-recovery/installed-snapshot/aurora-2k25-replace-mod.cak';
const staging = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/staging';
const foundry = 'C:/nt100-codebasemain/cak-foundry';
const dictionary = JSON.parse(fs.readFileSync(path.join(foundry, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const helper = path.join(foundry, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const oodle = path.join(foundry, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const session = openArchive(snapshotCak, dictionary);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-diff-'));
const wanted = session.files.filter((f) => /1[0-4]14002\.clips$/i.test(f.name));
const req = {
  archivePath: path.resolve(snapshotCak), oodlePath: oodle, outputRoot: temp, archiveKey: session.key, overwrite: true,
  entries: wanted.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })),
};
const rp = path.join(temp, 'req.json'); fs.writeFileSync(rp, JSON.stringify(req));
const res = cp.spawnSync(helper, [rp], { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
const parsed = JSON.parse(String(res.stdout || '').trim());
if ((parsed.results || []).some((r) => !r.Ok)) { console.error('extraction failed', JSON.stringify(parsed.results.filter(r => !r.Ok))); process.exit(1); }

const report = { generated: new Date().toISOString(), snapshotCak, candidateStaging: staging, phases: [], verdict: 'PASS' };
for (let d = 0; d < 5; d++) {
  const name = '1' + d + '14002.clips';
  const a = fs.readFileSync(path.join(temp, 'Animation', 'CaeAdvanced', name));   // installed (control)
  const b = fs.readFileSync(path.join(staging, 'Animation', 'CaeAdvanced', name)); // candidate
  const p = parse(b, { includeRaw: false });
  // allowed byte positions: record table entries (0x18 + i*16 .. +8) and payload heads (rec.offset .. +8)
  const allowed = new Set();
  p.records.forEach((r, i) => { for (let k = 0; k < 8; k++) { allowed.add(0x18 + i * 16 + k); allowed.add(r.offset + k); } });
  const diffs = [];
  const n = Math.max(a.length, b.length);
  let outside = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) { diffs.push(i); if (!allowed.has(i)) outside++; }
  }
  const chains = [];
  let i0 = -1;
  diffs.forEach((v, idx) => { if (i0 < 0) i0 = v; if (idx === diffs.length - 1 || diffs[idx + 1] !== v + 1) { chains.push([i0, v]); i0 = -1; } });
  const phase = {
    phase: d, file: name, controlBytes: a.length, candidateBytes: b.length,
    differingBytes: diffs.length, differingRuns: chains.map(([s, e]) => s + '..' + e).join(','),
    allWithinIdFields: outside === 0,
    idFields: chains.map(([s, e]) => {
      const len = e - s + 1;
      const kind = (s >= 0x18 && s < 0x18 + p.records.length * 16) ? 'recordTable' : 'payloadHead';
      const recIdx = kind === 'recordTable' ? (s - 0x18) / 16 : p.records.findIndex((r) => s === r.offset);
      return { at: s, len, kind, record: recIdx, old: a.subarray(s, e + 1).toString('hex'), new: b.subarray(s, e + 1).toString('hex') };
    }),
  };
  if (outside) report.verdict = 'FAIL';
  report.phases.push(phase);
  console.log('p' + d + ' ' + name + ': ' + diffs.length + ' differing bytes in ' + chains.length + ' runs | all within id fields: ' + (outside === 0) + ' | ' + chains.map(([s, e]) => s + '..' + e).join(' '));
}
fs.writeFileSync(path.join(__dirname, 'baseline-vs-candidate-diff.json'), JSON.stringify(report, null, 1));
console.log('verdict:', report.verdict, '| baseline-vs-candidate-diff.json written');
process.exitCode = report.verdict === 'PASS' ? 0 : 1;
