#!/usr/bin/env node
'use strict';
// verify-fop19-export.js — independent reopen/parse/field comparison for the lane
// exporter, plus the 273 rope-rig cross-check that proves the semantics of the
// populated section-14 tuples. This script re-reads the raw source bytes and
// re-runs the canonical byte accountant; it does not trust the exported JSON.
//
// Usage:
//   node verify-fop19-export.js            # all exported fixtures in fop19-export/
//   node verify-fop19-export.js 273        # one fixture
// Exit code 0 = all checks pass; 1 = at least one failure.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { accountFop, STRIDE } = require('C:/nt100-codebasemain/animation/tools/fop19-account.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const LANE = __dirname;
const EXPORT_DIR = path.join(LANE, 'fop19-export');
const RIG_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const RIG_FILES = {
  entry_4: `${RIG_DIR}/4_01_2E5C63AF9B533D50.unpacked_entry_4_(OODL).bin`,
  entry_5: `${RIG_DIR}/5_01_2E5C63AF9B533D50.unpacked_entry_5_(OODL).bin`,
};

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(); }

function keyRead(raw, recordAt, index) {
  // canonical grammar: 6 x f32BE at rel 24 + index*24; spill key index 31 uses rel 768
  // for X..angle and the next record's rel 0 for T.
  const base = recordAt + 24 + index * 24;
  const read = (at) => raw.readFloatBE(at);
  if (index < 31) return { X: read(base), Y: read(base + 4), Z: read(base + 8), W: read(base + 12), angle: read(base + 16), T: read(base + 20) };
  return { X: read(recordAt + 768), Y: read(recordAt + 772), Z: read(recordAt + 776), W: read(recordAt + 780), angle: read(recordAt + 784), T: raw.readFloatBE(recordAt + STRIDE) };
}

function placementSeries(track) {
  const [scale, ax, ay, az] = track.quantizationCandidates;
  const series = [];
  let x = ax, y = ay, z = az;
  for (let i = 0; i < track.secondary.keys.length; i++) {
    const k = track.secondary.keys[i];
    if (i > 0) { x += k.packed[0] * scale; y += k.packed[1] * scale; z += k.packed[2] * scale; }
    series.push({ frame: k.frame, x, y, z });
  }
  return series;
}

function rigSeries() {
  const out = {};
  for (const [name, file] of Object.entries(RIG_FILES)) {
    if (!fs.existsSync(file)) { out[name] = null; continue; }
    const bytes = fs.readFileSync(file);
    const sections = decode(bytes);
    out[name] = { sha256: sha256(bytes), phases: [] };
    for (const s of sections) {
      const placement = s.tracks.find((t) => t.type === 0x5300);
      if (!placement) continue;
      out[name].phases.push({
        frameCount: placement.frameCount,
        hash: placement.hash,
        quantization: placement.quantizationCandidates,
        series: placementSeries(placement),
      });
    }
  }
  return out;
}

function verifyOptionalRigCheck(report, raw, checks) {
  if (report.fixture !== '273') return null;
  const rigs = rigSeries();
  if (!rigs.entry_4 || !rigs.entry_5) return { status: 'skipped', reason: 'rig fixtures missing' };

  const results = [];
  const map = [
    { manifestObject: 25013, rig: 'entry_4', anchorPhase: 0, phaseSlot: 15, phase: 130, frameCount: 956 },
    { manifestObject: 25014, rig: 'entry_5', anchorPhase: 0, phaseSlot: 15, phase: 130, frameCount: 956 },
  ];
  const endpoints = [
    { manifestObject: 25013, rig: 'entry_4', slot: 20, phase: 140, phaseIndex: 1 },
    { manifestObject: 25014, rig: 'entry_5', slot: 20, phase: 140, phaseIndex: 1 },
  ];

  for (const spec of map) {
    const rig = rigs[spec.rig];
    const phaseA = rig.phases[spec.anchorPhase];
    const [scale] = phaseA.quantization;
    for (const section of report.sections) {
      for (const rec of section.records) {
        const manifestMatches = rec.objectId === spec.manifestObject || (rec.kind === 'header' && section.header.objectId === spec.manifestObject);
        if (!manifestMatches || rec.slotIndex !== spec.phaseSlot || rec.keyCount === 0) continue;
        for (const key of rec.keys) {
          const at = phaseA.series.find((s) => s.frame === key.T);
          if (!at) {
            results.push({ manifestObject: spec.manifestObject, record: rec.record, T: key.T, pass: false, reason: 'no rig key at frame' });
            continue;
          }
          const dx = Math.abs(key.X - at.x);
          const dy = Math.abs(key.Y - (-at.y));
          const dz = Math.abs(key.Z - at.z);
          const pass = dx <= 1e-3 && dy <= 1e-3 && dz <= Math.abs(scale) + 1e-3;
          results.push({ manifestObject: spec.manifestObject, rig: spec.rig, phase: spec.phase, record: rec.record, T: key.T, dx, dy, dz, tolerance: Math.abs(scale) + 1e-3, pass });
        }
      }
    }
  }
  for (const spec of endpoints) {
    const rig = rigs[spec.rig];
    const phaseB = rig.phases[spec.phaseIndex];
    const anchor = phaseB.quantization;
    for (const section of report.sections) {
      for (const rec of section.records) {
        if (rec.objectId !== spec.manifestObject || rec.slotIndex !== spec.slot || rec.keyCount === 0) continue;
        for (const key of rec.keys) {
          const dx = Math.abs(key.X - anchor[1]);
          const dy = Math.abs(key.Y - (-anchor[2]));
          const dz = Math.abs(key.Z - anchor[3]);
          const pass = key.T === 0 && dx <= 1e-3 && dy <= 1e-3 && dz <= 1e-3;
          results.push({ manifestObject: spec.manifestObject, rig: spec.rig, phase: spec.phase, record: rec.record, T: key.T, dx, dy, dz, tolerance: 1e-3, pass });
        }
      }
    }
  }
  const pass = results.every((r) => r.pass);
  checks.push({ name: 'rig-cross-check-273', pass, detail: results });
  return { status: pass ? 'pass' : 'fail', results };
}

function verifyFixture(id) {
  const checks = [];
  const exportPath = path.join(EXPORT_DIR, `${id}.json`);
  const report = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const raw = fs.readFileSync(report.source);
  checks.push({ name: 'sha256', pass: sha256(raw) === report.sha256, expected: report.sha256, actual: sha256(raw) });
  checks.push({ name: 'bytes', pass: raw.length === report.bytes, expected: report.bytes, actual: raw.length });
  checks.push({ name: 'magic', pass: raw.toString('ascii', 0, 4) === '0FOP' });
  checks.push({ name: 'residuals', pass: Array.isArray(report.residuals) && report.residuals.length === 0, count: report.residuals.length });

  // directory re-derivation
  const count = raw.readUInt32BE(0x40);
  checks.push({ name: 'directory-count', pass: count === report.directory.countIncludingGlobal, expected: report.directory.countIncludingGlobal, actual: count });
  const directoryEnd = 0x44 + count * 32;
  checks.push({ name: 'directory-end', pass: directoryEnd === report.directory.directoryEnd, expected: report.directory.directoryEnd, actual: directoryEnd });
  checks.push({ name: 'constant-0x14', pass: raw.readUInt32BE(0x14) === report.directory.declaredConstantAt0x14 });
  const globalWords = Array.from({ length: 8 }, (_, w) => raw.readUInt32BE(0x44 + w * 4));
  checks.push({ name: 'global-row', pass: JSON.stringify(globalWords) === JSON.stringify(report.directory.globalRow.wordsBE) });
  let rowsOk = true;
  for (const row of report.directory.rows) {
    const words = Array.from({ length: 8 }, (_, w) => raw.readUInt32BE(row.rowOffset + w * 4));
    if (JSON.stringify(words) !== JSON.stringify(row.wordsBE)) rowsOk = false;
    if (words[1] !== row.payloadOffset || words[2] !== row.identifier) rowsOk = false;
    if (words[1] !== row.payloadOffset) rowsOk = false;
  }
  checks.push({ name: 'directory-rows', pass: rowsOk, rows: report.directory.rows.length });
  checks.push({ name: 'first-payload-equals-directory-end', pass: report.directory.rows[0].payloadOffset === directoryEnd });

  // envelope
  checks.push({ name: 'envelope-name', pass: report.headerEnvelope.internalName.length > 0, name: report.headerEnvelope.internalName, motionId: report.headerEnvelope.motionId });
  checks.push({ name: 'envelope-raw', pass: report.headerEnvelope.rawBytes0_0x44 === Buffer.from(raw.subarray(0, 0x44)).toString('hex').toUpperCase() });

  // records and keys re-derived from raw bytes
  let headerOk = true, recordOk = true, keyOk = true, keyTotal = 0, keyMismatch = [];
  const acc = accountFop(raw);
  checks.push({ name: 'account-residuals', pass: acc.residuals.length === 0, count: acc.residuals.length });
  for (const section of report.sections) {
    if (section.header.rawBytes0_20 !== Buffer.from(raw.subarray(section.payloadOffset, section.payloadOffset + 20)).toString('hex').toUpperCase()) headerOk = false;
    for (const rec of section.records) {
      const at = rec.recordOffset;
      const marker = raw.readUInt16BE(at + 4);
      const slotIndex = raw[at + 9];
      const flag = raw[at + 10];
      const objectId = raw.readUInt16BE(at + 14);
      const mirror = raw[at + 19];
      const kindHeaders = rec.kind === 'header' ? true : (marker === 0x270f || marker === 0);
      const ok = kindHeaders
        && (rec.slotIndex === null || rec.slotIndex === slotIndex)
        && rec.flag === flag
        && (rec.objectId === null || rec.objectId === objectId)
        && (rec.mirror === null || rec.mirror === mirror);
      if (!ok) { recordOk = false; keyMismatch.push({ section: section.identifier, record: rec.record, reason: 'record field mismatch' }); }
      for (let k = 0; k < rec.keyCount; k++) {
        const ext = rec.keys[k];
        const rawKey = keyRead(raw, at, ext.index);
        keyTotal += 1;
        const same = ['X', 'Y', 'Z', 'W', 'angle', 'T'].every((f) => Object.is(rawKey[f], ext[f]) || Math.abs(rawKey[f] - ext[f]) < 1e-6);
        if (!same) { keyOk = false; keyMismatch.push({ section: section.identifier, record: rec.record, key: ext.index, rawKey, ext }); }
      }
    }
  }
  checks.push({ name: 'section-headers', pass: headerOk });
  checks.push({ name: 'record-fields', pass: recordOk });
  checks.push({ name: 'keys', pass: keyOk, keyTotal, mismatches: keyMismatch.slice(0, 5) });

  // trailer re-check from canonical accounting
  const lastSection = report.sections[report.sections.length - 1];
  if (lastSection.trailer) {
    const accTrailer = acc.sections[acc.sections.length - 1].trailer;
    checks.push({ name: 'trailer-pof0', pass: accTrailer.slotsMatchExpected && accTrailer.residualTrailerBytes === 0, payloadLen: accTrailer.payloadLen });
  }

  const rig = verifyOptionalRigCheck(report, raw, checks);
  const pass = checks.every((c) => c.pass);
  return { fixture: id, pass, checks, rigCheck: rig };
}

function main() {
  const only = process.argv[2];
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('run export-fop19.js first');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const results = [];
  for (const fx of manifest.fixtures) {
    if (fx.skipped) continue;
    if (only && fx.id !== only) continue;
    results.push(verifyFixture(fx.id));
  }
  const out = {
    schema: 'worker12-fop19-export-verification/v1',
    generated: new Date().toISOString(),
    verifier: 'verify-fop19-export.js',
    pass: results.every((r) => r.pass),
    fixtures: results,
  };
  fs.writeFileSync(path.join(LANE, 'verification-fop19-export.json'), JSON.stringify(out, null, 1));
  for (const r of results) {
    const failed = r.checks.filter((c) => !c.pass).map((c) => c.name);
    console.log(`${r.fixture}: ${r.pass ? 'PASS' : 'FAIL'} (${r.checks.length} checks)${failed.length ? ' failed: ' + failed.join(', ') : ''}`);
  }
  console.log('overall', out.pass ? 'PASS' : 'FAIL', '-> verification-fop19-export.json');
  process.exitCode = out.pass ? 0 : 1;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error('verify-fop19-export failed:', error.message); process.exitCode = 1; }
}

module.exports = { verifyFixture };
