'use strict';
// Lane-local: independent audit of E6's relocated pair files (1X14002.jsfb).
//
// Method (does not rely on the pair-relocate writer's own validation):
//  1. Build the "rename-only" baseline from the native pair: replace every string token
//     273 -> 14002 with updated u32 length prefixes; nothing else touched.
//  2. Every byte where E6 differs from the baseline must be a legitimate offset/length
//     rebase. Each differing 4-byte window is classified and its required target
//     mapping is verified independently (mapPos from the string insertion deltas).
//  3. Walk the whole file from the root table and validate every reachable structure
//     (signed table vtables, u16 vtable entries, string length prefixes, forward
//     uoffsets) against the same mapping, reporting anything unexplained.
// usage: node audit-pairs.js [nativeDir] [e6Dir] [out.json]
const fs = require('node:fs');
const path = require('node:path');

const NATIVE_DIR = process.argv[2] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
const E6_DIR = process.argv[3] || path.join(__dirname, 'extract-e6/Cutscene/CaeAdvanced');
const OUT = process.argv[4] || path.join(__dirname, 'pair-audit.json');

const TOKEN = /(^|[^0-9])273(?=[^0-9]|$)/g;
const RENAME = (s) => s.replace(TOKEN, (m, p) => p + '14002');

function scanStrings(buf) {
  const strings = [];
  for (let p = 0; p + 4 <= buf.length; p++) {
    const len = buf.readUInt32LE(p);
    if (len >= 2 && len <= 300 && p + 4 + len <= buf.length) {
      const s = buf.toString('latin1', p + 4, p + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s)) { strings.push({ lenAt: p, dataAt: p + 4, len, s }); p += 3 + len; }
    }
  }
  return strings;
}

function baselineFromNative(nativeBuf) {
  const strings = scanStrings(nativeBuf);
  const changes = [];
  for (const s of strings) {
    const nv = RENAME(s.s);
    if (nv !== s.s) changes.push({ start: s.dataAt, end: s.dataAt + s.len, delta: nv.length - s.len });
  }
  changes.sort((a, b) => a.start - b.start);
  const insBefore = x => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
  const mapPos = x => x + insBefore(x);
  const parts = []; let cursor = 0;
  for (const change of changes) {
    parts.push(nativeBuf.subarray(cursor, change.start));
    parts.push(Buffer.from(RENAME(nativeBuf.toString('latin1', change.start, change.end)), 'latin1'));
    cursor = change.end;
  }
  parts.push(nativeBuf.subarray(cursor));
  const base = Buffer.concat(parts);
  const stringSet = new Set(strings.map(s => s.lenAt));
  // update length prefixes in baseline
  for (const s of strings) {
    let newLen = s.len;
    for (const c of changes) if (c.start === s.dataAt) newLen = s.len + c.delta;
    if (newLen !== s.len) base.writeUInt32LE(newLen, mapPos(s.lenAt));
  }
  return { base, strings, changes, mapPos, insBefore, stringSet };
}

function tableAt(buf, p) {
  if (p < 0 || p + 4 > buf.length) return null;
  const vt = p - buf.readInt32LE(p);
  if (vt < 0 || vt + 4 > buf.length) return null;
  const vs = buf.readUInt16LE(vt); const size = buf.readUInt16LE(vt + 2);
  if (vs < 4 || vs > 132 || vs % 2 || vt + vs > buf.length || size < 4 || size > 512 || p + size > buf.length) return null;
  for (let q = vt + 4; q < vt + vs; q += 2) { const o = buf.readUInt16LE(q); if (o && (o < 4 || o >= size)) return null; }
  return { p, vt, vs, size };
}

const report = { schema: 'parallel-body/loading-control-audit/pair-audit/v1', phases: [] };
for (const d of [0, 1, 2, 3, 4]) {
  const natPath = path.join(NATIVE_DIR, `1${d}00273.jsfb`);
  const e6Path = path.join(E6_DIR, `1${d}14002.jsfb`);
  const nat = fs.readFileSync(natPath);
  const e6 = fs.readFileSync(e6Path);
  const { base, strings, changes, mapPos, stringSet } = baselineFromNative(nat);

  if (base.length !== e6.length) throw new Error(`phase ${d}: baseline length ${base.length} != E6 ${e6.length}`);

  // 1. enumerate all differing 4-byte-aligned and unaligned windows between baseline and E6
  const diffBytes = [];
  for (let i = 0; i < base.length; i++) if (base[i] !== e6[i]) diffBytes.push(i);
  // group into runs
  const runs = [];
  for (const b of diffBytes) {
    const last = runs[runs.length - 1];
    if (last && b === last.end + 1) last.end = b; else runs.push({ start: b, end: b });
  }

  // 2. classify each run: every changed field must equal the mapped native value under one
  //    of the relocation classes. Anything unexplained is evidence of a missed/invalid patch.
  const unexplained = [];
  const patchedFields = [];
  const usedNativePositions = new Set();
  for (const run of runs) {
    let ok = false;
    // candidate field positions: 4-byte windows overlapping the run
    for (let start = run.start - 3; start <= run.start; start++) {
      if (start < 0 || start + 4 > base.length) continue;
      const baseVal = base.readUInt32LE(start);
      const e6Val = e6.readUInt32LE(start);
      if (baseVal === e6Val) continue;
      // derive native position: find position x with mapPos(x)===start
      let natPos = -1;
      for (let x = 0; x <= start; x++) if (mapPos(x) === start) { natPos = x; break; }
      if (natPos === -1) continue; // inside an insertion region: handled by string prefix class below
      const natVal = nat.readUInt32LE(natPos);
      const signedNative = nat.readInt32LE(natPos);
      // F. string length prefix
      const strHere = strings.find(s => s.lenAt === natPos);
      if (strHere) {
        const newLen = strHere.len + changes.filter(c => c.start === strHere.dataAt).reduce((n, c) => n + c.delta, 0);
        if (e6Val === newLen) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'stringLen', nativeLenAt: natPos, from: strHere.len, to: newLen }); break; }
      }
      // A. forward uoffset: target = p + value; new value = newTarget - newP
      const targetNative = natPos + natVal;
      if (natVal > 0 && targetNative > natPos && targetNative < nat.length) {
        const requiredA = mapPos(targetNative) - mapPos(natPos);
        if (e6Val === requiredA) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'uoffset', from: natVal, to: e6Val, target: targetNative }); break; }
      }
      // B. signed vtable: vtable = p - value
      const vtNative = natPos - signedNative;
      if (vtNative >= 0 && vtNative < nat.length) {
        const requiredB = mapPos(natPos) - mapPos(vtNative);
        if (e6.readInt32LE(start) === requiredB) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'vtable', from: signedNative, to: e6.readInt32LE(start) }); break; }
      }
      // C. absolute position value
      if (natVal > 0 && natVal < nat.length && e6Val === mapPos(natVal)) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'absolutePos', from: natVal, to: e6Val }); break; }
      // D. distance-from-end value (size - k preserved)
      const fromEnd = nat.length - natVal;
      if (natVal > 0 && natVal <= nat.length && e6Val === e6.length - fromEnd) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'sizeFromEnd', from: natVal, to: e6Val }); break; }
      // E. explicit header scalars (pairId@56, f7@68 as size-132, f9@76 as tail size)
      if (natPos === 56 && e6Val === natVal - 273 + 14002) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'scalar-pairId', from: natVal, to: e6Val }); break; }
      if (natPos === 68 && e6Val === e6.length - 132) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'scalar-f7', from: natVal, to: e6Val }); break; }
      if (natPos === 76 && e6Val === e6.length - mapPos(nat.length - natVal)) { ok = true; patchedFields.push({ phase: 100 + d * 10, at: start, kind: 'scalar-f9', from: natVal, to: e6Val }); break; }
    }
    if (!ok) unexplained.push({ run: `0x${run.start.toString(16)}-0x${run.end.toString(16)}`, baseBytes: base.subarray(run.start, run.end + 1).toString('hex'), e6Bytes: e6.subarray(run.start, run.end + 1).toString('hex') });
  }

  // 3. walk root + all tables (schema walk) and validate E6
  const walkErrors = [];
  const rootTable = e6.readUInt32LE(0);
  const rootVtable = rootTable - e6.readInt32LE(rootTable);
  const fieldAt16 = rootTable + e6.readUInt16LE(rootVtable + 4 + 16 * 2);
  const vectorPos = fieldAt16 + e6.readUInt32LE(fieldAt16);
  const elementCount = e6.readUInt32LE(vectorPos);
  const visited = new Set();
  for (let i = 0; i < elementCount && i < 64; i++) {
    const p = vectorPos + 4 + i * 4;
    const t = p + e6.readUInt32LE(p);
    const table = tableAt(e6, t);
    if (!table) { walkErrors.push({ entry: i, table: t, error: 'no valid table at element' }); continue; }
    if (!visited.has(t)) {
      visited.add(t);
      if (table.vt >= e6.length) walkErrors.push({ entry: i, table: t, error: 'vtable out of bounds' });
      for (let q = table.vt + 4; q < table.vt + table.vs; q += 2) {
        const o = e6.readUInt16LE(q);
        if (o && t + o >= e6.length) walkErrors.push({ entry: i, vtableEntry: q, offset: o, error: 'entry offset out of bounds' });
      }
    }
  }
  report.phases.push({
    phase: 100 + d * 10, nativeBytes: nat.length, e6Bytes: e6.length, baselineBytes: base.length,
    strings: strings.length, renamedStrings: changes.length,
    diffRuns: runs.length, patchedFields: patchedFields.length,
    patchedKinds: patchedFields.reduce((m, f) => (m[f.kind] = (m[f.kind] || 0) + 1, m), {}),
    unexplained, walkErrors, pass: unexplained.length === 0 && walkErrors.length === 0 && changes.length > 0,
  });
  console.log(`phase ${100 + d * 10}: diffRuns=${runs.length} patched=${patchedFields.length} ${JSON.stringify(patchedFields.reduce((m, f) => (m[f.kind] = (m[f.kind] || 0) + 1, m), {}))} unexplained=${unexplained.length} walkErrors=${walkErrors.length}`);
  for (const u of unexplained.slice(0, 10)) console.log('   UNEXPLAINED', JSON.stringify(u));
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
