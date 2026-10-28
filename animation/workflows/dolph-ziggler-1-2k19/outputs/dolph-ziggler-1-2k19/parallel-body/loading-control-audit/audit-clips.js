'use strict';
// Lane-local: clips ledger + structural audit for the E6 diagnostic vs native 273 vs B4C0.
// Checks:
//  1. per-record table (id, frames, tracks, bytes) and record-order identity vs native
//  2. group90 walk exactness for EVERY record via canonical parseClipsRecord (consumed==total)
//  3. record-id resolution against the decoded 14002 adefs name refs (FNV-1a64 lowered)
// usage: node audit-clips.js [out.json]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const E6_DIR = path.join(__dirname, 'extract-e6/Animation/CaeAdvanced');
const B4_DIR = path.join(__dirname, 'extract-b4c0/Animation/CaeAdvanced');
const PAYLOADS = path.join(__dirname, 'payloads');
const OUT = process.argv[2] || path.join(__dirname, 'clips-audit.json');

const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return '0x' + v.toString(16).toUpperCase().padStart(16, '0'); }

function nameRefsFor(phase) {
  const payload = fs.readFileSync(path.join(PAYLOADS, `e6-${phase}.payload.bin`));
  const strings = [...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
  const refs = strings.filter(s => /^14002_/.test(s) && /[a-z]/.test(s));
  return new Map(refs.map(r => [fnvLower(r), r]));
}

const report = { schema: 'parallel-body/loading-control-audit/clips-audit/v1', phases: [] };
for (const d of [0, 1, 2, 3, 4]) {
  const phase = 100 + d * 10;
  const natFile = path.join(NATIVE_DIR, `1${d}00273.clips`);
  const e6File = path.join(E6_DIR, `1${d}14002.clips`);
  const b4File = path.join(B4_DIR, `1${d}14002.clips`);
  const nat = parseFile(natFile, { includeRaw: false });
  const e6 = parseFile(e6File, { includeRaw: false });
  const b4 = parseFile(b4File, { includeRaw: false });
  const refs = nameRefsFor(phase);
  const rows = [];
  for (let i = 0; i < e6.records.length; i++) {
    const er = e6.records[i], nr = nat.records[i], br = b4.records[i];
    const e6Tracks = new Set(er.trackIdentifiers);
    const sameTracksAsNative = nr && nr.trackIdentifiers.length === er.trackIdentifiers.length && nr.trackIdentifiers.every(t => e6Tracks.has(t));
    let walk = null;
    try {
      const parsed = parseClipsRecord(e6File, i);
      walk = { consumed: parsed.consumed, totalBits: parsed.totalBits, exact: parsed.consumed === parsed.totalBits };
    } catch (e) { walk = { error: e.message }; }
    rows.push({
      index: i, id: er.id, name: refs.get(er.id) || null, frames: er.frameValue, tracks: er.trackIdentifiers.length, bytes: er.length,
      native: nr ? { id: nr.id, frames: nr.frameValue, tracks: nr.trackIdentifiers.length, bytes: nr.length, sameTracks: sameTracksAsNative } : null,
      b4c0: br ? { id: br.id, frames: br.frameValue, tracks: br.trackIdentifiers.length, bytes: br.length } : null,
      g90: er.sections.find(s => s.name === 'group90').count, walk,
    });
  }
  const allExact = rows.every(r => r.walk && r.walk.exact === true);
  const allResolved = rows.every(r => r.name !== null);
  report.phases.push({ phase, nativeRecords: nat.records.length, e6Records: e6.records.length, b4c0Records: b4.records.length, rows, allWalkExact: allExact, allIdsResolved: allResolved });
  console.log(`phase ${phase}: records native=${nat.records.length} e6=${e6.records.length} b4c0=${b4.records.length} walkExact=${allExact} idsResolved=${allResolved}`);
  for (const r of rows) console.log(`   rec${r.index} id=${r.id} ${r.name || 'UNRESOLVED'} frames=${r.frames} tracks=${r.tracks} bytes=${r.bytes} g90=${r.g90} walk=${r.walk.error ? 'ERR ' + r.walk.error : (r.walk.exact ? 'exact' : `MISMATCH ${r.walk.consumed}/${r.walk.totalBits}`)} tracks==native:${r.native ? r.native.sameTracks : '-'}`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
