'use strict';
// fop19-account.js - exhaustive byte accounting for Yukes "0FOP" entrance/victory files.
// Model (rework of work order 001, per OPENCODE-WORK-ORDER-001-REVIEW.md):
//   file:      "0FOP" magic, header (0x00..0x43), directory (rows preceded by fixup u32s),
//              sections = 788-byte records, POF0 relocation trailer on the last section.
//   record:    fields rel0..19 (header-style or slot-style), pad rel20..23,
//              keyframe region rel24..787 = tuples of 6 x f32BE [X, Y, Z, W, angle, T].
//   trailer:   8-byte preamble [u32 0x00000000, u16 0x270F, u16 0x0000], pad,
//              "POF0" magic, u32BE payload length, delta-encoded fixup offset payload.
// No nonzero byte may go unaccounted: see `residual`.
const fs = require('fs');

const STRIDE = 788;
const GLOBAL_DIR_ROW_BASE = 0x44;
const COUNT_OFFSET = 0x40;
const PAD_OFFSET = 20, PAD_LEN = 4, KEY_OFFSET = 24, KEY_LEN = 6;

const FIXTURES = 'C:/Users/dgran/Documents/Codex/2026-10-12/act-as-an-expert-modder-for-2/outputs/dolph-ziggler-1-2k19/fop-directory-verification.json';

const SLOT_FIELDS = [
  { off: 4, len: 2, name: 'marker' },
  { off: 9, len: 1, name: 'slotIndex' },
  { off: 10, len: 1, name: 'flag' },
  { off: 14, len: 2, name: 'objectId' },
  { off: 19, len: 1, name: 'mirror' },
];
const HEADER_FIELDS = [
  { off: 1, len: 1, name: 'declaredCount?' },
  { off: 4, len: 2, name: 'marker' },
  { off: 5, len: 3, name: 'sizeBE?' },
  { off: 10, len: 1, name: 'flag' },
  { off: 14, len: 2, name: 'objectId' },
];

// ---------- POF0 codec (port of Yukes pof0.py decode) ----------
function decodePof0(payload) {
  const slots = [];
  let cur = 0;
  let i = 0;
  while (i < payload.length) {
    const b0 = payload[i];
    const sel = b0 >> 6;
    const lo = b0 & 0x3f;
    if (b0 === 0) { i += 1; continue; }
    let val;
    if (sel === 1) { val = lo; i += 1; }
    else if (sel === 2) { val = (lo << 8) | payload[i + 1]; i += 2; }
    else if (sel === 3) { val = (lo << 24) | (payload[i + 1] << 16) | (payload[i + 2] << 8) | payload[i + 3]; i += 4; }
    else { val = lo; i += 1; }
    cur += val * 4;
    slots.push(cur);
  }
  return slots;
}

// Expected fixup slot set: {0x0C, 0x14, 0x40} + last u32 of every directory row (global at 0x44 + 32k).
function expectedPof0Slots(count) {
  const out = [0x0c, 0x14, 0x40];
  for (let k = 0; k < count; k++) out.push(GLOBAL_DIR_ROW_BASE + k * 32 + 28);
  return out;
}

// ---------- directory (verified logic from read-fop-directory.js) ----------
function readDirectory(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 0x84 || bytes.toString('ascii', 0, 4) !== '0FOP') throw Error('Invalid 0FOP');
  const count = bytes.readUInt32BE(COUNT_OFFSET);
  if (count < 2 || count > 4096) throw Error('Invalid directory count');
  const directoryEnd = GLOBAL_DIR_ROW_BASE + count * 32;
  if (directoryEnd > bytes.length) throw Error('Directory exceeds input');
  const entries = [];
  for (let i = 1; i < count; i++) {
    const offset = GLOBAL_DIR_ROW_BASE + i * 32;
    const words = Array.from({ length: 8 }, (_, j) => bytes.readUInt32BE(offset + j * 4));
    if (words[1] < directoryEnd || words[1] >= bytes.length) throw Error('Payload pointer overlaps directory or exceeds file');
    entries.push({ directoryIndex: i, rowOffset: offset, wordsBE: words, payloadOffset: words[1], identifier: words[2] });
  }
  if (entries[0].payloadOffset !== directoryEnd) throw Error('First payload does not follow directory');
  for (let i = 0; i < entries.length; i++) {
    const next = i + 1 < entries.length ? entries[i + 1].payloadOffset : bytes.length;
    if (next <= entries[i].payloadOffset) throw Error('Non-monotonic payload pointers');
    entries[i].spanBytes = next - entries[i].payloadOffset;
  }
  return { count, directoryEnd, entries };
}

function readUIntBE(buf, off, len) { let v = 0; for (let i = 0; i < len; i++) v = (v << 8) | buf[off + i]; return v; }

// ---------- record accounting ----------
function accountRecord(rec, kind) {
  const fields = kind === 'header' ? HEADER_FIELDS : SLOT_FIELDS;
  const interpreted = {};
  const covered = new Set();
  for (const f of fields) {
    const v = rec.length >= f.off + f.len ? readUIntBE(rec, f.off, f.len) : 0;
    interpreted[f.name] = v;
    for (let i = f.off; i < f.off + f.len; i++) covered.add(i);
  }
  const padNonzero = [];
  for (let i = PAD_OFFSET; i < PAD_OFFSET + PAD_LEN; i++) { covered.add(i); if (rec[i] !== 0) padNonzero.push([i, rec[i]]); }
  const keys = [];
  let keyCount = 0;
  for (let k = 0; KEY_OFFSET + (k + 1) * KEY_LEN * 4 <= rec.length; k++) {
    const off = KEY_OFFSET + k * KEY_LEN * 4;
    for (let i = off; i < off + KEY_LEN * 4; i++) covered.add(i);
    const vals = [];
    let nonzero = false;
    for (let i = 0; i < KEY_LEN; i++) {
      const b = off + i * 4;
      vals.push(rec.readFloatBE(b));
      if (rec[b] || rec[b + 1] || rec[b + 2] || rec[b + 3]) nonzero = true;
    }
    if (nonzero) keys.push({ index: k, X: vals[0], Y: vals[1], Z: vals[2], W: vals[3], angle: vals[4], T: vals[5] });
    keyCount += 1;
  }
  if (keys.length) interpreted.keys = keys;
  // key-tail spill: a 32nd key start at rel768..787 (X,Y,Z,W,angle); its T (rel+4) is
  // observed written at the NEXT record's rel0..3 (cross-record, resolved in accountFop).
  let spill = null;
  const spillOff = KEY_OFFSET + keyCount * KEY_LEN * 4;
  if (spillOff < rec.length) {
    for (let i = spillOff; i < rec.length; i++) covered.add(i);
    let nonzero = false;
    const vals = [];
    for (let i = 0; i < Math.min(KEY_LEN, Math.floor((rec.length - spillOff) / 4)); i++) {
      const b = spillOff + i * 4;
      vals.push(rec.readFloatBE(b));
      if (rec[b] || rec[b + 1] || rec[b + 2] || rec[b + 3]) nonzero = true;
    }
    if (nonzero) {
      spill = { index: keyCount, X: vals[0], Y: vals[1], Z: vals[2], W: vals[3], angle: vals[4], T: null };
      keys.push(spill);
    }
  }
  const residual = [];
  for (let i = 0; i < rec.length; i++) if (rec[i] !== 0 && !covered.has(i)) residual.push([i, rec[i]]);
  return { interpreted, padNonzero, keySlots: keyCount, keys, spill, residual };
}

// ---------- full file accounting ----------
function accountFop(bytes) {
  const dir = readDirectory(bytes);
  const sections = [];
  const residuals = [];
  for (const e of dir.entries) {
    const base = e.payloadOffset;
    const span = e.spanBytes;
    const recordCount = Math.floor(span / STRIDE);
    const trailerBytes = span % STRIDE;
    if (base + span > bytes.length) throw Error(`truncated: section ${e.identifier} ends past EOF`);
    const recs = [];
    const recAccs = [];
    for (let r = 0; r < recordCount; r++) {
      const rec = bytes.subarray(base + r * STRIDE, base + (r + 1) * STRIDE);
      const marker = readUIntBE(rec, 4, 2);
      const slot = rec[9];
      const kind = r === 0 ? 'header' : (slot === 0 && marker === 0x270f ? 'header' : 'slot');
      const acc = accountRecord(rec, kind);
      recAccs.push(acc);
      recs.push({ record: r, kind, interpreted: acc.interpreted, padNonzero: acc.padNonzero, keySlots: acc.keySlots, keys: acc.keys, spill: acc.spill });
    }
    // spill resolution: a key tail at rel768..787 has its T written at the NEXT record's rel0..3
    for (let r = 0; r + 1 < recordCount; r++) {
      const sp = recAccs[r].spill;
      if (!sp) continue;
      const tAbs = base + (r + 1) * STRIDE;
      sp.T = bytes.readFloatBE(tAbs);
      recAccs[r + 1].residual = recAccs[r + 1].residual.filter(([o]) => o >= 4);
      recAccs[r + 1].spillTCovered = [0, 1, 2, 3];
    }
    for (let r = 0; r < recordCount; r++) {
      const acc = recAccs[r];
      for (const [o, v] of acc.residual) residuals.push({ section: e.identifier, record: r, offsetInRecord: o, absOffset: base + r * STRIDE + o, hex: '0x' + v.toString(16).padStart(2, '0') });
      for (const [o, v] of acc.padNonzero) residuals.push({ section: e.identifier, record: r, offsetInRecord: o, absOffset: base + r * STRIDE + o, hex: '0x' + v.toString(16).padStart(2, '0'), note: 'pad20-23 nonzero' });
    }
    let trailer = null;
    if (trailerBytes > 0) {
      const t = bytes.subarray(base + recordCount * STRIDE, base + span);
      const preamble = { zero0: t.readUInt32BE(0), marker: t.readUInt16BE(4), zero6: t.readUInt16BE(6) };
      const mi = t.indexOf(Buffer.from('POF0'));
      if (mi < 0) throw Error(`trailer of section ${e.identifier} has no POF0 magic`);
      const pad = mi - 8;
      const payloadLen = t.readUInt32BE(mi + 4);
      const payload = t.subarray(mi + 8);
      if (payload.length < payloadLen) throw Error(`trailer payload truncated: ${payload.length} < ${payloadLen}`);
      const slots = decodePof0(payload.subarray(0, payloadLen));
      const expected = expectedPof0Slots(dir.count);
      const slotsMatch = slots.length === expected.length && slots.every((s, i) => s === expected[i]);
      const accounted = 8 + pad + 4 + 4 + payloadLen;
      trailer = {
        bytes: t.length, preamble, pad, pof0Offset: mi, payloadLen, payloadActual: payload.length,
        pof0Slots: slots, slotsMatchExpected: slotsMatch, expectedSlots: expected,
        residualTrailerBytes: t.length - accounted, accountedBytes: accounted,
      };
      if (t.length !== accounted) residuals.push({ section: e.identifier, record: 'trailer', absOffset: base + recordCount * STRIDE + accounted, hex: 'trailer-residual', note: `${t.length - accounted} bytes beyond accounted trailer` });
    }
    sections.push({ directoryIndex: e.directoryIndex, identifier: e.identifier, payloadOffset: base, spanBytes: span, recordCount, trailerBytes, trailer, records: recs });
  }
  return { fileBytes: bytes.length, count: dir.count, directoryEnd: dir.directoryEnd, sections, residuals };
}

// ---------- tests ----------
function runFixtures() {
  const fx = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
  let pass = 0;
  const report = [];
  for (const f of fx) {
    const bytes = fs.readFileSync(f.file);
    let acc;
    try { acc = accountFop(bytes); } catch (e) { console.log(`${f.id}: ERROR ${e.message} -> FAIL`); continue; }
    const tr = acc.sections[acc.sections.length - 1].trailer;
    const trailerClean = tr.residualTrailerBytes === 0 && tr.slotsMatchExpected;
    const residualCount = acc.residuals.length;
    // keys must have non-decreasing T per record
    let keysOk = true;
    for (const s of acc.sections) for (const rec of s.records) {
      if (rec.keys && rec.keys.length > 1) for (let i = 1; i < rec.keys.length; i++) if (rec.keys[i].T < rec.keys[i - 1].T) keysOk = false;
    }
    const ok = residualCount === 0 && trailerClean && keysOk;
    if (ok) pass += 1;
    let keyTotal = 0;
    for (const s of acc.sections) for (const rec of s.records) keyTotal += (rec.keys ? rec.keys.length : 0);
    console.log(`${f.id}: dirCount ${acc.count} dirEnd ${acc.directoryEnd} | residual ${residualCount} | keys ${keyTotal} monotone ${keysOk} | trailer payloadLen ${tr.payloadLen} slotsMatch ${tr.slotsMatchExpected} clean ${tr.residualTrailerBytes === 0} -> ${ok ? 'PASS' : 'FAIL'}`);
    if (residualCount) console.log('   residual sample:', JSON.stringify(acc.residuals.slice(0, 10)));
    report.push({ id: f.id, residualCount, keyTotal, slotsMatch: tr.slotsMatchExpected, payloadLen: tr.payloadLen });
  }
  console.log(`accounting: ${pass}/${fx.length} passed`);
  process.exitCode = pass === fx.length ? 0 : 1;
}

function runTruncationTests() {
  const fx = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
  const f = fx.find((x) => x.id === 273);
  const bytes = fs.readFileSync(f.file);
  const cuts = [16, 0x44, 0x240, Math.floor(bytes.length / 2), bytes.length - 40, bytes.length - 8];
  let pass = 0;
  for (const cut of cuts) {
    try { accountFop(bytes.subarray(0, cut)); console.log(`    cut@${cut}: parsed (accepted)`); }
    catch (e) { console.log(`    cut@${cut}: rejected gracefully -> ${e.message}`); pass += 1; }
  }
  console.log(`truncation: ${pass}/${cuts.length} rejected gracefully`);
  process.exitCode = pass === cuts.length ? 0 : 1;
}

if (require.main === module) {
  if (process.argv.includes('--fixtures')) runFixtures();
  else if (process.argv.includes('--truncation')) runTruncationTests();
  else {
    const target = process.argv[2];
    if (!target) { console.log('usage: node fop19-account.js --fixtures | --truncation | <file.0fop> [--json out.json]'); process.exit(1); }
    const acc = accountFop(fs.readFileSync(target));
    const outIdx = process.argv.indexOf('--json');
    if (outIdx > 0 && process.argv[outIdx + 1]) { fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify(acc, null, 1)); console.log('wrote ' + process.argv[outIdx + 1]); }
    else {
      const tr = acc.sections[acc.sections.length - 1].trailer;
      console.log(JSON.stringify({ fileBytes: acc.fileBytes, count: acc.count, directoryEnd: acc.directoryEnd, residualCount: acc.residuals.length, trailer: { payloadLen: tr.payloadLen, slotsMatch: tr.slotsMatchExpected, clean: tr.residualTrailerBytes === 0 } }, null, 1));
    }
  }
}

module.exports = { accountFop, decodePof0, readDirectory, expectedPof0Slots, STRIDE };
