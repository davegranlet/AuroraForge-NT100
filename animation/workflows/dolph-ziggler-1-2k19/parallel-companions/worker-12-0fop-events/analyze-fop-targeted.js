'use strict';
// analyze-fop-targeted.js — targeted semantic verification of the source 2K19 273 .0fop
// section/slot records. Reuses the corrected directory rules and the established slot
// layout (probe-fop-objects.js / fop19-sections.js); does NOT re-derive byte layout.
// Goal: classify every field, prove which fields carry data, and dump raw records for
// independent reopen. Read-only over the source; writes only inside this lane folder.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FOP = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/00_F0114E878CB663FE.unpacked.0fop';
const OUT = __dirname;
const STRIDE = 788;
const SLOT_MARKER = 0x270f;

const bytes = fs.readFileSync(FOP);
const sha = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
if (bytes.toString('ascii', 0, 4) !== '0FOP') throw new Error('not 0FOP');
const countIncludingGlobal = bytes.readUInt32BE(0x40);
const directoryEnd = 0x44 + countIncludingGlobal * 32;

const rows = [];
for (let i = 1; i < countIncludingGlobal; i++) {
  const at = 0x44 + i * 32;
  rows.push({ identifier: i, rowOffset: at, wordsBE: Array.from({ length: 8 }, (_, w) => bytes.readUInt32BE(at + w * 4)) });
}
for (let i = 0; i < rows.length; i++) {
  rows[i].payloadOffset = rows[i].wordsBE[1];
  rows[i].spanBytes = (i + 1 < rows.length ? rows[i + 1].wordsBE[1] : bytes.length) - rows[i].payloadOffset;
}

function relReadU8(base, rel) { return bytes[base + rel]; }
function relReadU16(base, rel) { return bytes.readUInt16BE(base + rel); }
function relReadU32(base, rel) { return bytes.readUInt32BE(base + rel); }
function relReadF32(base, rel) { return bytes.readFloatBE(base + rel); }

const sections = [];
for (const row of rows) {
  const base = row.payloadOffset;
  const records = Math.floor(row.spanBytes / STRIDE);
  const h = base;
  const header = {
    declaredCount: relReadU8(h, 1),
    sizeU24BE: (relReadU8(h, 5) << 16) | (relReadU8(h, 6) << 8) | relReadU8(h, 7),
    flag: relReadU8(h, 10),
    objectId: relReadU16(h, 14),
    words0_8: Array.from({ length: 8 }, (_, i) => relReadU8(h, i)),
  };
  const slots = [];
  for (let s = 1; s < records; s++) {
    const at = base + s * STRIDE;
    const marker = relReadU16(at, 4);
    const inlineHeader = marker === SLOT_MARKER && relReadU16(at, 8) === 0;
    const timeline = [];
    for (let o = 24; o + 24 <= STRIDE; o += 24) {
      const x = relReadF32(at, o), y = relReadF32(at, o + 4), z = relReadF32(at, o + 8);
      const pad = relReadU32(at, o + 12);
      const rot = relReadF32(at, o + 16);
      const time = relReadF32(at, o + 20);
      if (x !== 0 || y !== 0 || z !== 0 || rot !== 0 || time !== 0) {
        timeline.push({ rel: o, x, y, z, pad, rotation: rot, time });
      }
    }
    slots.push({
      record: s,
      marker: marker.toString(16).padStart(4, '0'),
      inlineHeader,
      slotIndexU16: relReadU16(at, 8),
      flag: relReadU8(at, 10),
      objId12: relReadU16(at, 12),
      objId14: relReadU16(at, 14),
      mirrorU32: relReadU32(at, 16),
      u32_20: relReadU32(at, 20),
      firstTuple: timeline.length ? timeline[0] : null,
      tupleCount: timeline.length,
      timeline,
      nonzeroBefore24: bytes.subarray(at, at + 24).toString('hex'),
    });
  }
  sections.push({ ...row, header, records, slots });
}

const report = {
  schema: 'worker12-fop-targeted-analysis/v1',
  source: FOP,
  sourceBytes: bytes.length,
  sourceSha256: sha,
  directory: { countIncludingGlobal, directoryEnd },
  sections: sections.map((s) => ({
    identifier: s.identifier,
    payloadOffset: s.payloadOffset,
    spanBytes: s.spanBytes,
    records: s.records,
    header: s.header,
    slotSummary: s.slots.map((sl) => ({
      record: sl.record, marker: sl.marker, inlineHeader: sl.inlineHeader,
      slotIndexU16: sl.slotIndexU16, flag: sl.flag, objId12: sl.objId12, objId14: sl.objId14,
      mirrorU32: sl.mirrorU32, u32_20: sl.u32_20, tupleCount: sl.tupleCount,
      timeline: sl.timeline,
    })),
  })),
};
fs.writeFileSync(path.join(OUT, 'fop-targeted-analysis.json'), JSON.stringify(report, null, 1));

// Compact console summary
for (const s of report.sections) {
  const flagged = s.slotSummary.filter((x) => x.flag).map((x) => x.record);
  const populated = s.slotSummary.filter((x) => x.tupleCount > 0).map((x) => `${x.record}[${x.tupleCount}]`);
  console.log(`sec ${String(s.identifier).padStart(2)} off=${s.payloadOffset} span=${s.spanBytes} recs=${s.records} hdr=${JSON.stringify(s.header)}`);
  console.log(`    flagged@${flagged.join(',') || '-'} populated=${populated.join(',') || '-'} objId12=${[...new Set(s.slotSummary.map(x=>x.objId12))].join('/')} objId14=${[...new Set(s.slotSummary.map(x=>x.objId14))].join('/')} markers=${[...new Set(s.slotSummary.map(x=>x.marker))].join('/')} slotIdx=${[...new Set(s.slotSummary.map(x=>x.slotIndexU16))].join('/')}`);
}
console.log('written', path.join(OUT, 'fop-targeted-analysis.json'));
