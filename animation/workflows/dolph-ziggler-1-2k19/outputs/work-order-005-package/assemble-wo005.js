'use strict';
// assemble-wo005.js - deterministic allowlisted assembly (order 005 P1.3).
// - explicit payload allowlist (37 files): 16x14002 (5 fixed clips overlaid) + 16x14001 sibling closure + 5 registries
// - diagnostics + manifest live OUTSIDE the payload root (staging/)
// - manifest bijection: every staging file has exactly one manifest entry; fail closed
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = __dirname;
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const staging = path.join(dir, 'staging');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// explicit allowlist
const entries = [];
for (let d = 0; d < 5; d++) {
  entries.push({ rel: 'Animation/CaeAdvanced/1' + d + '14002.clips', from: path.join(dir, 'clips-fixed', '1' + d + '14002.clips'), role: 'clips-fixed', provenance: '2K19-273 body candidate in native container; ids re-keyed (guarded writer v3)' });
  entries.push({ rel: 'Animation/CaeAdvanced/1' + d + '14002.adefs', from: tree + '/Animation/CaeAdvanced/1' + d + '14002.adefs', role: 'adefs', provenance: 'native 273 identity-transformed (273->14002 strings, Kraken-4)' });
  entries.push({ rel: 'Cutscene/CaeAdvanced/1' + d + '14002.jsfb', from: tree + '/Cutscene/CaeAdvanced/1' + d + '14002.jsfb', role: 'pair-jsfb', provenance: 'generated pair table' });
  // sibling 14001 closure (registries carry its rows)
  entries.push({ rel: 'Animation/CaeAdvanced/1' + d + '14001.clips', from: tree + '/Animation/CaeAdvanced/1' + d + '14001.clips', role: 'sibling-14001-closure', provenance: 'as-is from accepted staged build' });
  entries.push({ rel: 'Animation/CaeAdvanced/1' + d + '14001.adefs', from: tree + '/Animation/CaeAdvanced/1' + d + '14001.adefs', role: 'sibling-14001-closure', provenance: 'as-is from accepted staged build' });
  entries.push({ rel: 'Cutscene/CaeAdvanced/1' + d + '14001.jsfb', from: tree + '/Cutscene/CaeAdvanced/1' + d + '14001.jsfb', role: 'sibling-14001-closure', provenance: 'as-is from accepted staged build' });
}
entries.push({ rel: 'Cutscene/CutsceneAssembly/14002.jsfb', from: tree + '/Cutscene/CutsceneAssembly/14002.jsfb', role: 'assembly', provenance: 'from-scratch writer' });
entries.push({ rel: 'Cutscene/CutsceneAssembly/14001.jsfb', from: tree + '/Cutscene/CutsceneAssembly/14001.jsfb', role: 'sibling-14001-closure', provenance: 'as-is from accepted staged build' });
for (const rel of ['Cutscene/CutsceneNoRegistry.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb', 'Entrances/EntranceListData.jsfb', 'Sdb/ENG.sdb']) {
  entries.push({ rel, from: tree + '/' + rel, role: 'registry-shared', provenance: 'stock + rows for 14001 and 14002 (shared; closure includes both)' });
}
if (entries.length !== 37) throw new Error('allowlist must contain exactly 37 payload files, got ' + entries.length);

fs.rmSync(staging, { recursive: true, force: true });
const manifest = [];
for (const e of entries) {
  if (!fs.existsSync(e.from)) throw new Error('missing allowlist source: ' + e.from);
  const dst = path.join(staging, e.rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const buf = fs.readFileSync(e.from);
  fs.writeFileSync(dst, buf);
  manifest.push({ path: e.rel.split('/').join('/'), bytes: buf.length, sha256: sha(buf), role: e.role, provenance: e.provenance, source: e.from });
}
// bijection check
let staged = [];
(function walk(p){ for (const ent of fs.readdirSync(p, { withFileTypes: true })) { const fp = path.join(p, ent.name); if (ent.isDirectory()) walk(fp); else staged.push(path.relative(staging, fp).split(path.sep).join('/')); } })(staging);
const mSet = new Set(manifest.map((m) => m.path));
const sSet = new Set(staged);
const missing = [...mSet].filter((p) => !sSet.has(p));
const extra = [...sSet].filter((p) => !mSet.has(p));
if (staged.length !== manifest.length || missing.length || extra.length) throw new Error('bijection failed: staged ' + staged.length + ' vs manifest ' + manifest.length + ' missing=' + missing + ' extra=' + extra);
// diagnostics OUTSIDE the payload root
const diag = path.join(dir, 'DIAGNOSTIC');
fs.rmSync(diag, { recursive: true, force: true }); fs.mkdirSync(diag, { recursive: true });
for (let d = 0; d < 5; d++) fs.copyFileSync('C:/nt100-codebasemain/.local/consolidation-2026-10-16/sources/opencode/clips-14002-recordswap/1' + d + '14002.clips', path.join(diag, '1' + d + '14002.clips.recordswap-stale-ids'));
fs.writeFileSync(path.join(diag, 'README.txt'), 'Diagnostic only: pre-fix record-swap clips with stale native 273 record ids. Replaced by staging clips (guarded re-key v3). Do not install.\n');
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), payloadRoot: 'staging/', fileCount: manifest.length, totalBytes: manifest.reduce((a, m) => a + m.bytes, 0), files: manifest }, null, 1));
console.log('assembly OK: ' + manifest.length + ' payload files, bijection PASS, manifest.json (outside staging), DIAGNOSTIC/ (outside staging)');
