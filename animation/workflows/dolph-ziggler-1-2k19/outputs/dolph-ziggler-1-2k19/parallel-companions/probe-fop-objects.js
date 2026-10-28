'use strict';
// probe-fop-objects.js — corrected-directory extraction of the original 2K19 entrance
// 273 0FOP object/section manifests and their 20 slot records. Extracts BE float tuples
// and detects monotone time-like fields per section. Read-only; writes fop-object-slots.json.
//
// Corrected directory rules (fop-event-mapping-notes.md, lead-verified):
//   count including global row = readUInt32BE(0x40); non-global rows are 32 bytes each
//   from 0x64; directory end = 0x44 + count*32. Slot record stride is 788 bytes;
//   record 0 of a section is the object header; slot records carry 0x270F at rel 4..5.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FOP = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/00_F0114E878CB663FE.unpacked.0fop';
const STRIDE = 788;
const SLOT_MARKER = 0x270f;

const bytes = fs.readFileSync(FOP);
if (bytes.toString('ascii', 0, 4) !== '0FOP') throw new Error('not a 0FOP payload');
const countIncludingGlobal = bytes.readUInt32BE(0x40);
const directoryEnd = 0x44 + countIncludingGlobal * 32;

const rows = [];
for (let i = 1; i < countIncludingGlobal; i++) {
  const at = 0x44 + i * 32;
  rows.push({
    identifier: i,
    payloadOffset: bytes.readUInt32BE(at + 4),
    word3: bytes.readUInt32BE(at + 12),
    word4: bytes.readUInt32BE(at + 16),
    word5: bytes.readUInt32BE(at + 20),
  });
}
if (rows.length < 2) throw new Error('unexpected directory size');
if (rows[0].payloadOffset !== directoryEnd) throw new Error(`first payload ${rows[0].payloadOffset} != directory end ${directoryEnd}`);
for (let i = 1; i < rows.length; i++) rows[i].spanBytes = rows[i].payloadOffset - rows[i - 1].payloadOffset;
rows[0].spanBytes = rows[1].payloadOffset - rows[0].payloadOffset;
rows[rows.length - 1].spanBytes = bytes.length - rows[rows.length - 1].payloadOffset;

const f32 = (o) => bytes.readFloatBE(o);
const u32 = (o) => bytes.readUInt32BE(o);

// Slot record measured layout (raw-byte verified 2026-10-16):
//   rel 4..5  0x270F marker
//   rel 8..9  slot index (u16 BE), rel 10 flag, rel 12..13 objectId (u16 BE),
//   rel 16..19 slot mirror (u32 BE)
//   timeline tuples start at rel 24, stride 24 bytes: [x f32, y f32, z f32, pad,
//   rotation f32, time f32]. Only the object sections (13/14) carry populated tuples
//   in the 273 fixture; other sections keep them zero.
function slotFields(recStart) {
  const rel = (r) => recStart + r;
  const timeline = [];
  for (let o = 24; o + 24 <= 788; o += 24) {
    const x = f32(rel(o)), y = f32(rel(o + 4)), z = f32(rel(o + 8)), rot = f32(rel(o + 16)), time = f32(rel(o + 20));
    if (x !== 0 || y !== 0 || z !== 0 || rot !== 0 || time !== 0) timeline.push({ rel: o, x, y, z, rotation: rot, time });
  }
  return {
    flag: bytes[rel(10)],
    objectId: bytes.readUInt16BE(rel(12)),
    slotIndex: bytes.readUInt16BE(rel(8)),
    mirror: u32(rel(16)),
    u32_20: u32(rel(20)), u32_24: u32(rel(24)), u32_28: u32(rel(28)), u32_32: u32(rel(32)), u32_36: u32(rel(36)), u32_40: u32(rel(40)),
    timeline,
  };
}

function monotoneCheck(series) {
  let inc = true, dec = true, strictInc = true, strictDec = true;
  for (let i = 1; i < series.length; i++) {
    if (!(series[i] >= series[i - 1])) inc = false;
    if (!(series[i] <= series[i - 1])) dec = false;
    if (!(series[i] > series[i - 1])) strictInc = false;
    if (!(series[i] < series[i - 1])) strictDec = false;
  }
  return { inc, dec, strictInc, strictDec };
}

const sections = rows.map((row) => {
  const base = row.payloadOffset;
  const span = row.spanBytes;
  const records = Math.floor(span / STRIDE);
  const trailerBytes = span % STRIDE;
  const headerRec = base;
  const header = {
    declaredCount: bytes[headerRec + 1],
    sizeBE: (bytes[headerRec + 5] << 16) | (bytes[headerRec + 6] << 8) | bytes[headerRec + 7],
    flag: bytes[headerRec + 10],
    objectId: bytes.readUInt16BE(headerRec + 14),
  };
  const slots = [];
  for (let s = 1; s < records; s++) {
    const at = base + s * STRIDE;
    const marker = bytes.readUInt16BE(at + 4);
    const f = slotFields(at);
    if (f.slotIndex === 0 && marker === SLOT_MARKER) {
      slots.push({ record: s, inlineHeader: true, ...f });
    } else {
      slots.push({ record: s, inlineHeader: false, ...f });
    }
  }
  const keys = ['u32_20', 'u32_24', 'u32_28', 'u32_32', 'u32_36', 'u32_40'];
  const timeCandidates = [];
  for (const key of keys) {
    const series = slots.filter((s) => !s.inlineHeader).map((s) => s[key]);
    const mono = monotoneCheck(series);
    if (mono.strictInc || mono.inc) {
      const diffs = series.slice(1).map((v, i) => v - series[i]);
      const uniqueDiffs = [...new Set(diffs)];
      timeCandidates.push({ field: key, first: series[0], last: series[series.length - 1], monotone: mono, uniqueDiffs });
    }
  }
  const floatTuples = slots.filter((s) => !s.inlineHeader && s.timeline.length).map((s) => ({ slot: s.slotIndex, flag: s.flag, timeline: s.timeline }));
  return { identifier: row.identifier, objectIdCandidate: row.word3, words: [row.word4, row.word5], payloadOffset: base, spanBytes: span, records, trailerBytes, header, timeCandidates, floatTuples, slots };
});

const report = {
  schema: 'aurora-forge-parallel-companions/fop-object-slots-v1',
  generated: new Date().toISOString(),
  file: FOP.replace(/\\/g, '/'),
  fileBytes: bytes.length,
  fileSha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
  directory: { countIncludingGlobal, directoryEnd },
  sections,
};
fs.writeFileSync(path.join(__dirname, 'fop-object-slots.json'), JSON.stringify(report, null, 1));
for (const s of sections) {
  const tc = s.timeCandidates.map((t) => `${t.field}[${t.first}..${t.last}]`).join(' ');
  console.log(`section ${String(s.identifier).padStart(2)} obj=${s.objectIdCandidate} span=${s.spanBytes} records=${s.records} trailer=${s.trailerBytes} | time-like: ${tc || '(none)'}`);
}
