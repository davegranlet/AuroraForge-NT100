'use strict';
// probe-inputs.js - read-only reconnaissance for the integration manifest.
// Lists candidate component files with sha256 and structural facts.
// Usage: node probe-inputs.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const H8 = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');
const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }

const TREE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const BODYCAND = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/source273-clip-check/containers';

console.log('=== native 273 containers + body candidates ===');
for (let d = 0; d < 5; d++) {
  const nat = NATIVE + '/Animation/CaeAdvanced/1' + d + '00273.clips';
  const cand = BODYCAND + '/1' + d + '0-Dolph-Ziggler-1-body-only.clips';
  const np = parse(fs.readFileSync(nat), { includeRaw: false });
  const cp = parse(fs.readFileSync(cand), { includeRaw: false });
  console.log('p' + d, 'native', nat, sha(nat).slice(0, 16), np.records.length + 'rec',
    'frames', np.records.map((r) => r.frameValue !== undefined ? r.frameValue : '?').join(','),
    '| cand', sha(cand).slice(0, 16), cp.records.length + 'rec', 'frames', cp.records.map((r) => r.frameValue).join(','));
  // candidate track set vs each native record
  const cs = new Set(cp.records[0].trackIdentifiers);
  const matches = [];
  np.records.forEach((r, i) => {
    const s = new Set(r.trackIdentifiers);
    if (r.trackIdentifiers.length === cp.records[0].trackIdentifiers.length && cp.records[0].trackIdentifiers.every((t) => s.has(t))) matches.push(i);
  });
  console.log('   cand set matches native records:', JSON.stringify(matches));
}
console.log('\n=== tree 14002 pair jsfb + adefs ===');
for (let d = 0; d < 5; d++) {
  const pj = TREE + '/Cutscene/CaeAdvanced/1' + d + '14002.jsfb';
  const ad = TREE + '/Animation/CaeAdvanced/1' + d + '14002.adefs';
  const b = fs.readFileSync(pj);
  console.log('p' + d, 'pair', sha(pj).slice(0, 16), b.length + 'B', 'u32@56', b.readUInt32LE(56), '| adefs', sha(ad).slice(0, 16), fs.statSync(ad).size + 'B');
  const strs = [];
  for (let o = 0; o + 5 <= b.length; o++) { const len = b.readUInt32LE(o); if (len >= 2 && len <= 300 && o + 4 + len <= b.length) { const s = b.toString('latin1', o + 4, o + 4 + len); if (/^[\x20-\x7e]+$/u.test(s)) { strs.push(s); o += 3 + len; } } }
  console.log('   strings:', JSON.stringify(strs));
}
console.log('\n=== tree assemblies ===');
for (const m of [14001, 14002]) {
  const f = TREE + '/Cutscene/CutsceneAssembly/' + m + '.jsfb';
  const b = fs.readFileSync(f);
  const scalars = [384, 308, 240, 172, 104].map((p) => b.readUInt32LE(p));
  const digits = [421, 345, 277, 209, 141].map((p) => b.toString('latin1', p, p + 7));
  console.log(m, sha(f).slice(0, 16), b.length + 'B', 'scalars', scalars.join(','), 'digits', digits.join(','), 'labelLen', b.readUInt32LE(500), 'label', b.toString('latin1', 504, 504 + b.readUInt32LE(500)));
}
console.log('\n=== tree registries + siblings (hash only) ===');
const regs = ['Cutscene/CutsceneNoRegistry.jsfb', 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb', 'Entrances/EntranceListData.jsfb', 'Sdb/ENG.sdb'];
for (const r of regs) console.log(r, fs.statSync(TREE + '/' + r).size + 'B', sha(TREE + '/' + r).slice(0, 16));
for (let d = 0; d < 5; d++) {
  for (const ext of ['clips', 'adefs']) {
    const f = TREE + '/Animation/CaeAdvanced/1' + d + '14001.' + ext;
    console.log('1' + d + '14001.' + ext, fs.statSync(f).size + 'B', sha(f).slice(0, 16));
  }
  const j = TREE + '/Cutscene/CaeAdvanced/1' + d + '14001.jsfb';
  console.log('1' + d + '14001.jsfb', fs.statSync(j).size + 'B', sha(j).slice(0, 16));
}
console.log('\n=== WO005 output pins ===');
const W5 = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package';
for (let d = 0; d < 5; d++) {
  const f = W5 + '/clips-fixed/1' + d + '14002.clips';
  console.log('1' + d + '14002.clips (wo005 clips-fixed)', fs.statSync(f).size + 'B', sha(f));
}
for (let d = 0; d < 5; d++) {
  const f = W5 + '/payloads/ours-p' + d + '.bin';
  console.log('ours-p' + d + '.bin', fs.statSync(f).size + 'B', sha(f));
}
console.log('wo005 cak', sha(W5 + '/aurora-2k25-replace-mod.cak'));
console.log('\n=== source frames expected (from 273.bin decode pins) ===');
console.log('100:361 110:795 120:891 130:957 140:201');
console.log('fnvLower(14002_a_00_m) =', H8(fnvLower('14002_a_00_m')));
