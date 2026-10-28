'use strict';
// analyze-pair-candidates.js - read-only analysis of the native pair graph for the relocator design.
// Counts table candidates, uoffset candidates at every alignment, and which fields cross insertions.
const fs = require('fs');
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';

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
function tableValid(buf, p) {
  if (p < 0 || p + 4 > buf.length) return null;
  const vt = p - buf.readInt32LE(p);
  if (vt < 0 || vt + 4 > buf.length) return null;
  const vs = buf.readUInt16LE(vt);
  const size = buf.readUInt16LE(vt + 2);
  if (vs < 4 || vs > 132 || vs % 2 || vt + vs > buf.length || size < 4 || size > 512 || p + size > buf.length) return null;
  for (let q = vt + 4; q < vt + vs; q += 2) { const o = buf.readUInt16LE(q); if (o && (o < 4 || o >= size)) return null; }
  return { p, vt, vs, size };
}
function tableCandidates(buf) {
  const out = [];
  for (let p = 0; p + 4 <= buf.length; p += 4) { const t = tableValid(buf, p); if (t) out.push(t); }
  return out;
}
function vectorHeads(buf, stringSet, tableSet) {
  const set = new Set();
  for (let t = 0; t + 8 <= buf.length; t++) {
    const count = buf.readUInt32LE(t);
    if (count < 1 || count > 256) continue;
    if (t + 4 + count * 4 > buf.length) continue;
    const at0 = t + 4;
    const t0 = at0 + buf.readUInt32LE(at0);
    if (stringSet.has(t0) || tableSet.has(t0)) set.add(t);
  }
  return set;
}

const TOKEN = /(^|\D)273(?=\D|$)/g;
for (const d of [0, 1, 2, 3, 4]) {
  const buf = fs.readFileSync(NAT + '/1' + d + '00273.jsfb');
  const strings = scanStrings(buf);
  const tokenRe = /(^|\D)273(?=\D|$)/g;
  const changes = [];
  for (const s of strings) {
    tokenRe.lastIndex = 0;
    const nv = s.s.replace(tokenRe, (m, pre) => pre + '14002');
    if (nv !== s.s) changes.push({ dataAt: s.dataAt, delta: nv.length - s.len });
  }
  const insBefore = (x) => changes.reduce((n, c) => n + (c.dataAt + 0 <= x ? c.delta : 0), 0);
  const stringSet = new Set(strings.map((s) => s.lenAt));
  const tables = tableCandidates(buf);
  const tableSet = new Set(tables.map((t) => t.p));
  const vectors = vectorHeads(buf, stringSet, tableSet);
  let uoffsetCandidates = 0, uoffsetAligned = 0, uoffsetUnaligned = 0;
  const uoffsetNeed = [], uoffsetUnalignedNeed = [];
  for (let p = 0; p + 4 <= buf.length; p++) {
    const v = buf.readUInt32LE(p);
    if (!v) continue;
    const target = p + v;
    if (target <= p || target >= buf.length) continue;
    if (!stringSet.has(target) && !tableSet.has(target) && !vectors.has(target)) continue;
    uoffsetCandidates++;
    const delta = insBefore(target) - insBefore(p);
    if (p % 4 === 0) { uoffsetAligned++; if (delta) uoffsetNeed.push({ p, target, delta, kind: stringSet.has(target) ? 'string' : tableSet.has(target) ? 'table' : 'vector' }); }
    else { uoffsetUnaligned++; if (delta) uoffsetUnalignedNeed.push({ p, target, delta, kind: stringSet.has(target) ? 'string' : tableSet.has(target) ? 'table' : 'vector' }); }
  }
  let vtableNeed = 0;
  for (const t of tables) { const delta = insBefore(t.vt) - insBefore(t.p); if (delta) vtableNeed++; }
  console.log('p' + d, 'len', buf.length, 'strings', strings.length, 'changedStrings', changes.length,
    'tables', tables.length, 'vtable sofs needing patch', vtableNeed,
    'uoffset candidates', uoffsetCandidates, '(aligned', uoffsetAligned, ', unaligned', uoffsetUnaligned, ')',
    'aligned needing', uoffsetNeed.length, 'unaligned needing', uoffsetUnalignedNeed.length);
  if (uoffsetUnalignedNeed.length) console.log('  UNALIGNED NEEDING:', JSON.stringify(uoffsetUnalignedNeed));
  if (uoffsetNeed.length) console.log('  aligned needing (first 8):', JSON.stringify(uoffsetNeed.slice(0, 8)));
  console.log('  pairId@56', buf.readUInt32LE(56), 'f7@68', buf.readUInt32LE(68), 'f9@76', buf.readUInt32LE(76), 'size-132', buf.length - 132, 'tailStart', buf.length - buf.readUInt32LE(76));
}
