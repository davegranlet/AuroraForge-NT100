'use strict';
// assemble-package.js - builds the offline five-phase package + manifest in work-order-004-package/package.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const dir = __dirname;
const pkg = path.join(dir, 'package');
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const recordswap = 'C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode/clips-14002-recordswap';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const copies = [];
function put(rel, srcBuf, role, provenance, note) {
  const dst = path.join(pkg, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, srcBuf);
  copies.push({ path: rel.split(path.sep).join('/'), bytes: srcBuf.length, sha256: sha(srcBuf), role, provenance, note: note || null, source: role === 'clips-fixed' ? 'make-14002-clips-v2.js output' : null });
}
function putFrom(rel, srcFile, role, provenance, note) { put(rel, fs.readFileSync(srcFile), role, provenance, note); put.last = srcFile; const last = copies[copies.length - 1]; if (last.source === null) last.source = srcFile; }

for (let d = 0; d < 5; d++) {
  putFrom('Animation/CaeAdvanced/1' + d + '14002.clips', path.join(pkg, 'Animation/CaeAdvanced/1' + d + '14002.clips'), 'clips-fixed', 'source-derived-body + native-derived-container', 'candidate body record in native container; all ids re-keyed to FNV-1a64(lower(14002 name)); internal refs swept');
  putFrom('Animation/CaeAdvanced/1' + d + '14002.adefs', tree + '/Animation/CaeAdvanced/1' + d + '14002.adefs', 'adefs', 'native-derived (identity transform)', '273->14002 string rename, Kraken-4 recompressed, verified vs adefs-editor identity outputs (hash match)');
  putFrom('Cutscene/CaeAdvanced/1' + d + '14002.jsfb', tree + '/Cutscene/CaeAdvanced/1' + d + '14002.jsfb', 'pair-jsfb', 'generated (pair tabl from source)', 'contains 14002 string refs; no stale id bytes');
}
putFrom('Cutscene/CutsceneAssembly/14002.jsfb', tree + '/Cutscene/CutsceneAssembly/14002.jsfb', 'assembly', 'generated (from-scratch writer, byte-identical proven on native fixtures)', '548 B; marker 01 1a 3d 3c 5a 5b 5c 5d');
putFrom('Cutscene/CutsceneNoRegistry.jsfb', tree + '/Cutscene/CutsceneNoRegistry.jsfb', 'registry-stock-modified', 'stock + our row', 'native 103416 B -> ours 103488 B');
putFrom('Cutscene/CsaDatabase.jsfb', tree + '/Cutscene/CsaDatabase.jsfb', 'registry-stock-modified', 'stock + our row', 'native 323712 B -> ours 323936 B');
putFrom('Cutscene/CdefDatabase.jsfb', tree + '/Cutscene/CdefDatabase.jsfb', 'registry-stock-modified', 'stock + our row', 'native 170860 B -> ours 171180 B');
putFrom('Entrances/EntranceListData.jsfb', tree + '/Entrances/EntranceListData.jsfb', 'registry-stock-modified', 'stock + our row (18-byte in-place repair)', 'native member of the same tree family; row verified earlier');

// diagnostics: old recordswap outputs (mixed-provenance, NOT installable)
fs.mkdirSync(path.join(pkg, 'DIAGNOSTIC'), { recursive: true });
for (let d = 0; d < 5; d++) {
  const b = fs.readFileSync(recordswap + '/1' + d + '14002.clips');
  const dst = path.join(pkg, 'DIAGNOSTIC', '1' + d + '14002.clips.recordswap-stale-ids');
  fs.writeFileSync(dst, b);
  copies.push({ path: 'DIAGNOSTIC/1' + d + '14002.clips.recordswap-stale-ids', bytes: b.length, sha256: sha(b), role: 'diagnostic', provenance: 'mixed (native containers + candidate body, stale 273 ids)', note: 'evidence only - do not install (its links do not resolve)' });
}
fs.writeFileSync(path.join(pkg, 'DIAGNOSTIC', 'README.txt'), 'Old record-swap clips kept as evidence of the stale-id state (record ids = native 273 FNV values while adefs/jsfs strings had been renamed to 14002). Replaced by the fixed package/Animation/CaeAdvanced files. Do not install these.\n');

// body validation: package body record payload vs candidate payload
const val = { generated: new Date().toISOString(), phases: [] };
const candFiles = { 0: '100', 1: '110', 2: '120', 3: '130', 4: '140' };
for (let d = 0; d < 5; d++) {
  const pBuf = fs.readFileSync(path.join(pkg, 'Animation/CaeAdvanced/1' + d + '14002.clips'));
  const p = parse(pBuf, { includeRaw: false });
  const cBuf = fs.readFileSync(path.join(dir, '..', 'dolph-ziggler-1-2k19', 'body-candidate', candFiles[d] + '-Dolph-Ziggler-1-body-only.clips'));
  const c = parse(cBuf, { includeRaw: false });
  const bodyIdx = p.records.findIndex((r) => r.trackIdentifiers.length === c.records[0].trackIdentifiers.length && r.trackIdentifiers.every((t) => c.records[0].trackIdentifiers.includes(t)));
  const pr = p.records[bodyIdx], cr = c.records[0];
  const pPay = pBuf.subarray(pr.offset, pr.offset + pr.length);
  const cPay = cBuf.subarray(cr.offset, cr.offset + cr.length);
  const sameLen = pr.length === cr.length;
  let diffBytes = 0, diffAfter8 = 0, firstDiff = -1;
  for (let i = 0; i < Math.min(pPay.length, cPay.length); i++) if (pPay[i] !== cPay[i]) { diffBytes++; if (i >= 8) { diffAfter8++; if (firstDiff < 0) firstDiff = i; } }
  val.phases.push({ phase: d, bodyIdx, bodyTracks: pr.trackIdentifiers.length, sameLength: sameLen, diffBytes, diffBytesRelGe8: diffAfter8, firstDiffRel: firstDiff, verdict: sameLen && diffAfter8 === 0 ? 'body payload identical to candidate except re-keyed id (rel0..7)' : 'DIFFS BEYOND ID - inspect' });
  console.log('p' + d, 'body@' + bodyIdx, 'tracks', pr.trackIdentifiers.length, '| len', sameLen ? 'same' : 'DIFF', '| bytes differing', diffBytes, '(rel>=8:', diffAfter8 + ')', '| firstDiffRel', firstDiff);
}
fs.writeFileSync(path.join(dir, 'body-validation.json'), JSON.stringify(val, null, 1));
fs.writeFileSync(path.join(pkg, 'MANIFEST.json'), JSON.stringify({ generated: new Date().toISOString(), packageRoot: 'package/', files: copies }, null, 1));
console.log('MANIFEST.json written; files:', copies.length);
