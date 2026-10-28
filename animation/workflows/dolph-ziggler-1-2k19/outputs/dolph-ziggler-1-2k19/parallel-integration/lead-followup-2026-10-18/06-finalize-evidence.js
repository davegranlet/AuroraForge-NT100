'use strict';
// 06-finalize-evidence.js - add computed 'derived' section to the evidence JSON (read-only otherwise).
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { fnv1a64 } = require('C:/nt100-codebasemain/animation/tools/fnv-track-resolve.js');

const OUT = __dirname;
const EVIDENCE = `${OUT}/06-community-conversion-format-EVIDENCE.json`;
const D = `${OUT}/06-adefs-decoded`;
const NATIVE = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const COMM = 'D:/WWE2k26-resources/6th/Dolph Ziggler [2K15]';
const OURS = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging';
const PHASES = ['10', '11', '12', '13', '14'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function stringsFrom(buf, min = 4, cap = 4000) {
  const out = []; const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g'); const t = buf.toString('latin1'); let m;
  while ((m = re.exec(t)) && out.length < cap) out.push(m[0]);
  return out;
}
function loadRecords(fp) {
  const buf = fs.readFileSync(fp);
  const p = parse(buf, { includeRaw: false });
  return p.records.map(r => ({
    id: r.id, tracks: r.trackIdentifiers.length, frames: r.frameValue, length: r.length,
    payload: Buffer.from(buf.subarray(r.offset, r.offset + r.length)),
  }));
}
function countDiff(a, b) { let n = 0; const m = Math.min(a.length, b.length); for (let i = 0; i < m; i++) if (a[i] !== b[i]) n++; return n; }
function bodyDiffCount(a, b) { const x = Buffer.from(a), y = Buffer.from(b); x.writeBigUInt64LE(0n, 0); y.writeBigUInt64LE(0n, 0); if (x.length !== y.length) return null; return countDiff(x, y); }

const evidence = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));
const derived = {
  method: 'Computed by 06-finalize-evidence.js from byte-level parses of .clips/.adefs/.jsfb fixtures; see sibling scripts 06-community-format-compare.js, 06-details.js, 06-details2.js, 06-details3.js, 06-details4.js.',
  recordNameResolution: { scheme: 'FNV-1a64 of lowercased clip/definition name (same scheme as clips-layout.clipNameId).', entries: {} },
  jsfbDurationEdits: {},
  adefsAnalysis: { decodedBy: 'OodleLZ_Decompress via oo2core_9_win64.dll (cak-foundry)', phases: {} },
  ringMatFlagBits: {},
  retainedSubstituted: {},
};

const nameCandidates = new Set();
for (const fp of [`${D}/n275-1000275.bin`, `${D}/n273-1000273.bin`, `${D}/comm-1000275.bin`, `${D}/ours-1014002.bin`]) {
  for (const s of stringsFrom(fs.readFileSync(fp))) nameCandidates.add(s);
}
const nameByHash = new Map();
for (const name of nameCandidates) {
  for (const variant of [name, name.toLowerCase()]) {
    const h = fnv1a64(variant);
    if (!nameByHash.has(h)) nameByHash.set(h, name);
  }
}
const hashKey = id => `0x${BigInt(id).toString(16).toUpperCase().padStart(16, '0')}`;

for (const ph of PHASES) {
  const rows = {};
  for (const [key, fp] of [
    ['comm275', `${COMM}/Animation/CaeAdvanced/${ph}00275.clips`],
    ['native275', `${NATIVE}/Animation/CaeAdvanced/${ph}00275.clips`],
    ['native273', `${NATIVE}/Animation/CaeAdvanced/${ph}00273.clips`],
    ['ours14002', `${OURS}/Animation/CaeAdvanced/${ph}14002.clips`],
  ]) {
    rows[key] = loadRecords(fp).map(r => ({
      id: r.id, name: nameByHash.get(hashKey(r.id)) || null, nameResolved: nameByHash.has(hashKey(r.id)),
      tracks: r.tracks, frames: r.frames, bytes: r.length,
    }));
  }
  derived.recordNameResolution.entries[ph] = rows;
}

for (const ph of PHASES) {
  const A = fs.readFileSync(`${COMM}/Cutscene/CaeAdvanced/${ph}00275.jsfb`);
  const B = fs.readFileSync(`${NATIVE}/Cutscene/CaeAdvanced/${ph}00275.jsfb`);
  const diffs = [];
  for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] !== B[i]) diffs.push(i);
  const entry = { bytesComm: A.length, bytesNative: B.length, diffCount: diffs.length };
  if (diffs.length <= 4 && diffs.length > 0) {
    const off = diffs[0];
    entry.fieldOffset = off;
    entry.fieldNative = B.readUInt32LE(off);
    entry.fieldComm = A.readUInt32LE(off);
    entry.interpretation = 'LE u32 = phase duration in frames minus 1 (native value matches native body/camera frames-1; community value matches converted body/camera frames-1).';
  }
  derived.jsfbDurationEdits[ph] = entry;
}

for (const ph of PHASES) {
  const c = fs.readFileSync(`${D}/comm-${ph}00275.bin`);
  const n = fs.readFileSync(`${D}/n275-${ph}00275.bin`);
  const o = fs.readFileSync(`${D}/ours-${ph}14002.bin`);
  let first = -1, diff = 0;
  for (let i = 0; i < Math.min(c.length, n.length); i++) if (c[i] !== n[i]) { diff++; if (first < 0) first = i; }
  const cStr = new Set(stringsFrom(c)), nStr = new Set(stringsFrom(n));
  const onlyNative = [...nStr].filter(s => !cStr.has(s) && /facial|P_0|Trace|Dolph/i.test(s));
  const oursStr = new Set(stringsFrom(o)), n273Str = new Set(stringsFrom(fs.readFileSync(`${D}/n273-1000273.bin`)));
  const oursOnly = [...oursStr].filter(s => !n273Str.has(s));
  const n273Only = [...n273Str].filter(s => !oursStr.has(s));
  derived.adefsAnalysis.phases[ph] = {
    comm: { decodedBytes: c.length, decodedSha256: sha(c) },
    native275: { decodedBytes: n.length, decodedSha256: sha(n) },
    ours: { decodedBytes: o.length, decodedSha256: sha(o) },
    commVsNative: { firstDiffOffset: first, diffBytesAtCommonOffsets: diff, byteDelta: c.length - n.length },
    commStringsMissingVsNative: onlyNative.slice(0, 12),
  };
  if (ph === '10') derived.adefsAnalysis.oursVsNative273Phase10 = { oursOnlyStrings: oursOnly, native273OnlyStrings: n273Only };
}

for (const ph of PHASES) {
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/${ph}00275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/${ph}00275.clips`);
  const byId = new Map(n275.map((r) => [r.id, r]));
  const ring = comm.find(r => {
    const name = nameByHash.get(hashKey(r.id));
    return name && /ringmat/i.test(name);
  });
  if (!ring) continue;
  const nat = byId.get(ring.id);
  const bits = [];
  for (let i = 0; i < ring.payload.length; i++) if (ring.payload[i] !== nat.payload[i]) bits.push({ offset: i, comm: ring.payload[i], native: nat.payload[i] });
  derived.ringMatFlagBits[ph] = { recordId: ring.id, name: nameByHash.get(hashKey(ring.id)), byteCount: bits.length, bits };
}

for (const ph of PHASES) {
  const comm = loadRecords(`${COMM}/Animation/CaeAdvanced/${ph}00275.clips`);
  const n275 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/${ph}00275.clips`);
  const byId = new Map(n275.map(r => [r.id, r]));
  const commRows = comm.map(r => {
    const n = byId.get(r.id);
    const name = nameByHash.get(hashKey(r.id)) || null;
    const status = r.payload.equals(n.payload) ? 'retained-identical' : (r.payload.length === n.payload.length && countDiff(r.payload, n.payload) <= 20 ? 'modified-few-bytes' : 'replaced-content');
    return { id: r.id, name, tracksComm: r.tracks, tracksNative: n.tracks, framesComm: r.frames, framesNative: n.frames, bytesComm: r.length, bytesNative: n.length, status, diffBytes: r.payload.length === n.payload.length ? countDiff(r.payload, n.payload) : null };
  });
  const ours = loadRecords(`${OURS}/Animation/CaeAdvanced/${ph}14002.clips`);
  const n273 = loadRecords(`${NATIVE}/Animation/CaeAdvanced/${ph}00273.clips`);
  const oursRows = ours.map((r, i) => {
    const n = n273[i];
    const name = nameByHash.get(hashKey(r.id)) || null;
    const bd = n ? bodyDiffCount(r.payload, n.payload) : null;
    const status = bd === 0 ? 'retained-native273-content-id-renamed' : (bd === null ? 'converted-content-length-changed' : `converted-content (body diff ${bd}B)`);
    return { id: r.id, name, tracks: r.tracks, frames: r.frames, bytesOurs: r.length, bytesNative273: n ? n.length : null, status };
  });
  derived.retainedSubstituted[ph] = { community275: commRows, ours14002: oursRows };
}

evidence.derived = derived;
fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 1));
console.log('derived section written to', EVIDENCE);
console.log('record name resolution phase 10 native275:');
for (const r of derived.recordNameResolution.entries['10'].native275) console.log(' ', r.id, r.name, r.tracks + 't', r.frames + 'f');
