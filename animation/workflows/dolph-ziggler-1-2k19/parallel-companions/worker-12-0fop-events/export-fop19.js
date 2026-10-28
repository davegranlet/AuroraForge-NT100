#!/usr/bin/env node
'use strict';
// export-fop19.js — Worker 12 (worker-12-0fop-events) decoder/exporter for the original
// WWE 2K19 ".0fop" presentation/object file family.
//
// Scope and provenance:
//  - Reuses the canonical byte-accounting reader `animation/tools/fop19-account.js`
//    (corrected directory rules, 788-byte record model, key-region grammar and POF0
//    trailer decode). No shared tool is modified.
//  - Adds: directory-row export, manifest grouping, phase-slot annotation, per-field
//    raw offsets and a machine-readable consumer map hook (see fop-field-consumer-map.json).
//  - Read-only over the source fixtures. Writes only inside this lane folder.
//
// Usage:
//   node export-fop19.js            # export the default fixture set
//   node export-fop19.js <id>=<path> [<id>=<path> ...]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { accountFop, STRIDE } = require('C:/nt100-codebasemain/animation/tools/fop19-account.js');

const OUT_DIR = __dirname;
const EXPORT_DIR = path.join(OUT_DIR, 'fop19-export');

const DEFAULT_FIXTURES = [
  ['273', 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/00_F0114E878CB663FE.unpacked.0fop'],
  ['274', 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/274/00_5C44BF16F06CCC63.unpacked.0fop'],
  ['275', 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/275/00_872FC23259651A69.unpacked.0fop'],
  ['6100-victory', 'D:/AuroraForge-Aug26/_work/2k19-victory-6100-event/00_0CE8FE35827FD8DE.unpacked.0fop'],
];

// slotIndex -> entrance phase. 0 = section header record (phase-100 candidate);
// 5/10/15/20 = phase-110/120/130/140 candidates. Proven for 273 section 14 via the
// placement-rig cross-check (see verify-fop19-export.js); other rows are candidates.
const PHASE_SLOT = { 0: '100?', 5: '110?', 10: '120?', 15: '130?', 20: '140?' };

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function hex(buffer) {
  return Buffer.from(buffer).toString('hex').toUpperCase();
}

function exportFixture(id, file) {
  const bytes = fs.readFileSync(file);
  const acc = accountFop(bytes);
  const count = acc.count;
  const directoryEnd = acc.directoryEnd;

  const globalRowAt = 0x44;
  const globalRowWords = Array.from({ length: 8 }, (_, w) => bytes.readUInt32BE(globalRowAt + w * 4));
  const rows = [];
  for (let i = 1; i < count; i++) {
    const at = 0x44 + i * 32;
    rows.push({
      identifier: i,
      rowOffset: at,
      rowOffsetHex: `0x${at.toString(16).toUpperCase()}`,
      wordsBE: Array.from({ length: 8 }, (_, w) => bytes.readUInt32BE(at + w * 4)),
      wordNames: {
        w0_variantTag: bytes.readUInt32BE(at),
        w1_payloadOffset: bytes.readUInt32BE(at + 4),
        w2_sequenceId: bytes.readUInt32BE(at + 8),
        w3_objectRef: bytes.readUInt32BE(at + 12),
        w4_propertyFlags: bytes.readUInt32BE(at + 16),
        w5_propertyFlags2: bytes.readUInt32BE(at + 20),
        w6_sentinel: bytes.readUInt32BE(at + 24),
        w7_reserved: bytes.readUInt32BE(at + 28),
      },
    });
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    row.payloadOffset = row.wordsBE[1];
    row.spanBytes = (i + 1 < rows.length ? rows[i + 1].wordsBE[1] : bytes.length) - row.payloadOffset;
  }

  const sections = acc.sections.map((s) => {
    const headerAt = s.payloadOffset;
    const headerRaw = bytes.subarray(headerAt, headerAt + 20);
    const records = s.records.map((r) => {
      const recordAt = s.payloadOffset + r.record * STRIDE;
      const interpreted = r.interpreted || {};
      const slotIndex = interpreted.slotIndex !== undefined ? interpreted.slotIndex : (r.kind === 'slot' ? (bytes[recordAt + 9] | (bytes[recordAt + 8] << 8)) : null);
      return {
        record: r.record,
        kind: r.kind,
        recordOffset: recordAt,
        recordOffsetHex: `0x${recordAt.toString(16).toUpperCase()}`,
        marker: interpreted.marker !== undefined ? `0x${interpreted.marker.toString(16).toUpperCase()}` : null,
        slotIndex: slotIndex,
        phaseSlotCandidate: slotIndex === null ? null : (PHASE_SLOT[slotIndex] ?? null),
        flag: interpreted.flag !== undefined ? interpreted.flag : null,
        objectId: interpreted.objectId !== undefined ? interpreted.objectId : null,
        mirror: interpreted.mirror !== undefined ? interpreted.mirror : null,
        rawHeader20: hex(bytes.subarray(recordAt, recordAt + 20)),
        keyCount: r.keys ? r.keys.length : 0,
        keys: (r.keys || []).map((k) => ({ index: k.index, X: k.X, Y: k.Y, Z: k.Z, W: k.W, angle: k.angle, T: k.T })),
      };
    });
    // manifest grouping, mirroring the canonical section model (record 0 header; a
    // slotIndex-0 inline header starts a second manifest)
    const manifests = [];
    let current = null;
    for (const rec of records) {
      if (rec.record === 0 || (rec.kind === 'header' && rec.record > 0)) {
        current = { headerRecord: rec.record, objectId: rec.objectId, slots: [], keyRecords: [] };
        manifests.push(current);
        if (rec.keyCount) current.keyRecords.push(rec.record);
        continue;
      }
      if (current) {
        current.slots.push(rec.record);
        if (rec.keyCount) current.keyRecords.push(rec.record);
      }
    }
    return {
      identifier: s.identifier,
      directoryIndex: s.directoryIndex,
      payloadOffset: s.payloadOffset,
      payloadOffsetHex: `0x${s.payloadOffset.toString(16).toUpperCase()}`,
      spanBytes: s.spanBytes,
      recordCount: s.recordCount,
      trailerBytes: s.trailerBytes,
      header: {
        recordOffset: headerAt,
        declaredCount: bytes[headerAt + 1],
        sizeU24BE: (bytes[headerAt + 5] << 16) | (bytes[headerAt + 6] << 8) | bytes[headerAt + 7],
        flag: bytes[headerAt + 10],
        objectId: bytes.readUInt16BE(headerAt + 14),
        rawBytes0_20: hex(headerRaw),
      },
      manifests,
      records,
      trailer: s.trailer,
    };
  });

  const populatedRecords = [];
  for (const s of sections) {
    for (const rec of s.records) {
      if (rec.keyCount) populatedRecords.push({ section: s.identifier, record: rec.record, objectId: rec.objectId, slotIndex: rec.slotIndex, flag: rec.flag, keyCount: rec.keyCount });
    }
  }

  return {
    schema: 'worker12-fop19-export/v1',
    fixture: id,
    source: file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    directory: {
      countOffset: '0x40',
      declaredConstantAt0x14: bytes.readUInt32BE(0x14),
      countIncludingGlobal: count,
      directoryEnd,
      directoryEndHex: `0x${directoryEnd.toString(16).toUpperCase()}`,
      globalRow: { rowOffset: globalRowAt, wordsBE: globalRowWords, rawBytes32: hex(bytes.subarray(globalRowAt, globalRowAt + 32)) },
      rows,
    },
    headerEnvelope: {
      magic: bytes.toString('ascii', 0, 4),
      u32_0x04: bytes.readUInt32BE(0x04),
      tagBytes_0x08: bytes.toString('ascii', 8, 10),
      u32_0x0C: bytes.readUInt32BE(0x0C),
      u16_0x10: bytes.readUInt16BE(0x10),
      u32_0x14: bytes.readUInt32BE(0x14),
      motionId: bytes.readUInt16BE(0x20),
      internalName: bytes.subarray(0x22, 0x22 + 32).toString('ascii').replace(/\0+$/, '').trimEnd(),
      rawBytes0_0x44: hex(bytes.subarray(0, 0x44)),
    },
    semanticAnnotations: {
      slotIndexPhaseCandidates: PHASE_SLOT,
      populatedRecords,
      note: 'Populated keys are object-placement keyframes for the rope/rig objects; they are not event commands. See fop-field-consumer-map.json and RESULT.md.',
    },
    sections,
    residuals: acc.residuals,
  };
}

function main() {
  const args = process.argv.slice(2);
  const fixtures = args.length
    ? args.map((a) => {
      const eq = a.indexOf('=');
      if (eq < 0) throw new Error(`fixture argument must be <id>=<path>: ${a}`);
      return [a.slice(0, eq), a.slice(eq + 1)];
    })
    : DEFAULT_FIXTURES;

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const manifest = {
    schema: 'worker12-fop19-export-manifest/v1',
    generated: new Date().toISOString(),
    exporter: 'export-fop19.js',
    fixtures: [],
  };
  for (const [id, file] of fixtures) {
    if (!fs.existsSync(file)) {
      console.log(`skip ${id}: missing ${file}`);
      manifest.fixtures.push({ id, source: file, skipped: true, reason: 'missing' });
      continue;
    }
    const report = exportFixture(id, file);
    const out = path.join(EXPORT_DIR, `${id}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 1));
    manifest.fixtures.push({
      id,
      source: file,
      output: out,
      bytes: report.bytes,
      sha256: report.sha256,
      countIncludingGlobal: report.directory.countIncludingGlobal,
      sections: report.sections.length,
      populatedRecords: report.semanticAnnotations.populatedRecords.length,
      residualCount: report.residuals.length,
    });
    console.log(`exported ${id}: ${report.sections.length} sections, ${report.semanticAnnotations.populatedRecords.length} populated records, ${report.residuals.length} residuals -> ${out}`);
  }
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  console.log('manifest', manifestPath);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error('export-fop19 failed:', error.message); process.exitCode = 1; }
}

module.exports = { exportFixture, PHASE_SLOT, DEFAULT_FIXTURES };
