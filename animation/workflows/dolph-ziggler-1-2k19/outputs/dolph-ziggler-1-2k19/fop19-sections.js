#!/usr/bin/env node
'use strict';
// fop19-sections.js — bounded parser for original 2K19 .0fop object/section manifests.
//
// Verified layout (Work Order 001, 2026-10-15):
//   - 0FOP header; directory row count at 0x40 (INCLUDES one global row at 0x44);
//     non-global rows are 32 bytes each from 0x64; directoryEnd = 0x44 + count*32;
//     row words (BE): [type 0x00150000 | payloadOffset | identifier | 0 | 256/0 | 0 | 0xFFFFFFFF | 0]
//   - each section payload = one 788-byte header record + N 788-byte slot records
//     header record fields (rel): 1 = recordCount (u8), 5..7 = section data size (u24 BE),
//       10 = flag, 14..15 = objectId (u16 BE)
//     slot record fields (rel): 4..5 = 0x270F marker, 9 = slot index (u8),
//       14..15 = objectId, 19 = slot index mirror
//   - semantics of objectIds and slot indices are NOT established (manifest stubs)
//
// Usage:
//   node fop19-sections.js <file.0fop> [--json <out.json>]
//   node fop19-sections.js --fixtures
const fs = require('fs');
const { readDirectory } = require('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/read-fop-directory.js');

const STRIDE = 788;
const SLOT_MARKER = 0x270f;

function parseFopSections(bytes) {
  const dir = readDirectory(bytes);
  const sections = dir.entries.map((e) => {
    const base = e.payloadOffset;
    const span = e.spanBytes;
    const recordCount = Math.floor(span / STRIDE);
    const trailerBytes = span % STRIDE;
    const h = bytes.subarray(base, base + STRIDE);
    const header = {
      declaredCount: h[1],
      sizeBE: (h[5] << 16) | (h[6] << 8) | h[7],
      flag: h[10],
      objectId: (h[14] << 8) | h[15],
    };
    const raw = [];
    for (let r = 1; r < recordCount; r++) {
      const rec = bytes.subarray(base + r * STRIDE, base + (r + 1) * STRIDE);
      raw.push({
        record: r,
        marker: (rec[4] << 8) | rec[5],
        slotIndex: rec[9],
        objectId: (rec[14] << 8) | rec[15],
        mirror: rec[19],
        flag: rec[10],
      });
    }
    // group into object manifests: the section's first record (r=0) is the object header;
    // a packed inline record with slotIndex 0 (and the 0x270F marker) starts a second manifest.
    const manifests = [];
    let current = { objectId: header.objectId, headerRecord: 0, headerStyle: 'section', slots: [], flags: [], markerClass: 'none', anomalies: [] };
    manifests.push(current);
    for (const rec of raw) {
      if (rec.slotIndex === 0 && rec.marker === SLOT_MARKER) {
        current = { objectId: rec.objectId, headerRecord: rec.record, headerStyle: 'inline', slots: [], flags: [], markerClass: 'none', anomalies: [] };
        manifests.push(current);
        continue; // slot-0 record = the object header, not a pose/timed slot
      }
      if (rec.objectId !== current.objectId) current.anomalies.push({ record: rec.record, issue: 'objectId changed mid-manifest', got: rec.objectId });
      if (rec.marker === SLOT_MARKER) current.markerClass = '0x270F';
      current.slots.push(rec.slotIndex);
      if (rec.mirror !== rec.slotIndex) current.anomalies.push({ record: rec.record, issue: 'slotIndex != mirror' });
      if (rec.flag) current.flags.push(rec.slotIndex);
    }
    return {
      directoryIndex: e.directoryIndex, identifier: e.identifier, rowWordsBE: e.wordsBE,
      payloadOffset: base, spanBytes: span, recordCount, trailerBytes, header, manifests,
    };
  });
  return { countIncludingGlobal: dir.countIncludingGlobal, directoryEnd: dir.directoryEnd, sections };
}

function summary(parsed) {
  const objects = [];
  for (const s of parsed.sections) for (const m of s.manifests) objects.push({ objectId: m.objectId, section: s.identifier, markerClass: m.markerClass, slots: m.slots.length });
  return {
    countIncludingGlobal: parsed.countIncludingGlobal,
    directoryEnd: parsed.directoryEnd,
    objectCount: objects.length,
    objects,
    sections: parsed.sections.map((s) => ({
      id: s.identifier, headerObject: s.header.objectId, span: s.spanBytes, records: s.recordCount,
      declaredCount: s.header.declaredCount, headerFlag: s.header.flag, trailer: s.trailerBytes,
      manifests: s.manifests.map((m) => `${m.objectId}${m.markerClass === 'none' ? '(unmarked)' : ''}:${m.slots.length} slots${m.flags.length ? ' flags@' + m.flags.join(',') : ''}${m.anomalies.length ? ' ANOM' + m.anomalies.length : ''}`),
    })),
  };
}

if (require.main === module) {
  if (process.argv.includes('--fixtures')) {
    const fx = JSON.parse(fs.readFileSync('C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/fop-directory-verification.json', 'utf8'));
    let pass = 0;
    for (const f of fx) {
      const bytes = fs.readFileSync(f.file);
      const parsed = parseFopSections(bytes);
      const s = summary(parsed);
      const okCount = parsed.countIncludingGlobal === f.countIncludingGlobal;
      const okEnd = parsed.directoryEnd === f.directoryEnd;
      const expectedObjects = f.countIncludingGlobal; // = nonGlobalCount + 1, packed tail included
      const seqOk = parsed.sections.every((sec) => sec.manifests.every((m) => m.slots.length === 0 || (m.slots.length === 20 && m.slots.every((v, i) => v === i + 1))));
      const mirrorOk = parsed.sections.every((sec) => sec.manifests.every((m) => m.anomalies.length === 0));
      const idsSequential = s.objects.length === expectedObjects && s.objects.every((o, i) => o.objectId === 25000 + i);
      const ok = okCount && okEnd && seqOk && mirrorOk && idsSequential;
      if (ok) pass += 1;
      console.log(`${f.id}: count ${parsed.countIncludingGlobal}/${f.countIncludingGlobal} end ${parsed.directoryEnd}/${f.directoryEnd} | objects ${s.objects.length}/${expectedObjects} [25000..${25000 + s.objects.length - 1}] sequential ${idsSequential} | slot sequences ${seqOk} mirrors ${mirrorOk} -> ${ok ? 'PASS' : 'FAIL'}`);
      for (const sec of s.sections) console.log(`    sec ${String(sec.id).padStart(2)}: header ${sec.headerObject} span ${sec.span} trailer ${sec.trailer} declared ${sec.declaredCount} flag ${sec.headerFlag} | ${sec.manifests.join(' | ')}`);
    }
    console.log(`fixtures: ${pass}/${fx.length} passed`);
    process.exitCode = pass === fx.length ? 0 : 1;
  } else {
    const file = process.argv[2];
    if (!file) { console.error('Usage: node fop19-sections.js <file.0fop> [--json out.json] | --fixtures'); process.exit(2); }
    const parsed = parseFopSections(fs.readFileSync(file));
    const jIdx = process.argv.indexOf('--json');
    if (jIdx > 0 && process.argv[jIdx + 1]) {
      fs.writeFileSync(process.argv[jIdx + 1], JSON.stringify(parsed, null, 1));
      console.log('written', process.argv[jIdx + 1]);
    } else {
      console.log(JSON.stringify(summary(parsed), null, 1));
    }
  }
}

module.exports = { parseFopSections, summary, STRIDE };
