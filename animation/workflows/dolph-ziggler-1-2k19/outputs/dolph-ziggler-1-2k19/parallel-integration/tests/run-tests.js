'use strict';
// run-tests.js - lane self-tests. No game, no install; reads pinned inputs read-only.
//  1. fnvLower / clipNameId agreement on fixture names
//  2. AuroraCakHelper "decompress" schema (Program.cs fields) decodes all five tree
//     adefs payloads to the exact reviewed payload hashes (WO004/005 pins)
//  3. mergePhase determinism and byte-equality with the reviewed WO005 clips-fixed files
//  4. manifest pin coverage (every referenced input exists and matches its pin)
//  5. known keys: basename-derived archive key matches the reviewed 0xF784665E
const fs = require('fs');
const path = require('path');
const L = require('../lib/integration.js');
const clipsLayout = require(L.TOOLS + '/clips-layout.js');

let failures = 0;
function test(name, fn) {
  try { const detail = fn(); console.log('PASS ' + name + (detail ? ' :: ' + JSON.stringify(detail) : '')); }
  catch (error) { failures += 1; console.log('FAIL ' + name + ' :: ' + error.message); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const manifestPath = path.join(__dirname, '..', 'components.json');
const manifest = L.readJson(manifestPath);

test('fnv-lowercase-snake', () => {
  assert(L.H16(L.fnvLower('14002_a_00_m')) === '0x0E3033D0F024011B', 'fnv 14002_a_00_m mismatch');
  assert(clipsLayout.clipNameId('273_a_00_M_facial') === '0xC93E7DDB8B7141E1', 'clipNameId fixture mismatch');
  assert(L.H16(L.fnvLower('273_a_00_M_facial')) === clipsLayout.clipNameId('273_a_00_M_facial'), 'fnv vs clipNameId mismatch');
  return null;
});

test('adefs-helper-decompress-schema', () => {
  const results = [];
  for (const phase of manifest.phases) {
    const decoded = L.decodeAdefsPayload(phase.adefs.path);
    assert(decoded.sha256 === phase.adefs.expectedPayloadSha256, 'p' + phase.phase + ' payload ' + decoded.sha256 + ' != pin ' + phase.adefs.expectedPayloadSha256);
    results.push({ phase: phase.phase, expandedBytes: decoded.expandedBytes, sha256: decoded.sha256.slice(0, 16) });
  }
  return results;
});

test('body-only-merge-equals-reviewed-wo005', () => {
  const pins = manifest.build.reviewedClosurePins.wo005ClipsFixed;
  const results = [];
  for (const phase of manifest.phases) {
    const spec = { phase: phase.phase, phaseDir: phase.phaseDir, nativeContainer: phase.nativeContainer, adefs: phase.adefs, expectedFrameValue: phase.expectedFrameValue, overlays: phase.overlays.filter((overlay) => overlay.component === 'body') };
    const { buffer, report } = L.mergePhase(spec, 'phase ' + phase.phase);
    const archive = '1' + (phase.phase / 10 - 10) + '14002';
    assert(report.outputSha256 === pins[archive], 'p' + phase.phase + ' output ' + report.outputSha256 + ' != reviewed ' + pins[archive]);
    const again = L.mergePhase(spec, 'phase ' + phase.phase);
    assert(again.buffer.equals(buffer), 'p' + phase.phase + ' merge is not deterministic');
    results.push({ phase: phase.phase, sha256: report.outputSha256.slice(0, 16), overlays: report.overlays.map((overlay) => overlay.component + '@rec' + overlay.recordIndex) });
  }
  return results;
});

test('facial-overlay-changes-only-facial-record', () => {
  const WO005 = path.join(L.BASE, 'animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/clips-fixed');
  const results = [];
  for (const phase of manifest.phases) {
    const spec = { phase: phase.phase, phaseDir: phase.phaseDir, nativeContainer: phase.nativeContainer, adefs: phase.adefs, expectedFrameValue: phase.expectedFrameValue, overlays: phase.overlays };
    const { buffer, report } = L.mergePhase(spec, 'phase ' + phase.phase);
    const source = fs.readFileSync(path.join(WO005, phase.phaseDir + '14002.clips'));
    const wo005 = L.parseClips(source);
    const produced = L.parseClips(buffer);
    assert(produced.records.length === wo005.records.length, 'p' + phase.phase + ' record count differs from WO005');
    const facialRecordIndex = report.overlays.find((overlay) => overlay.component === 'facial').recordIndex;
    const bodyRecordIndex = report.overlays.find((overlay) => overlay.component === 'body').recordIndex;
    assert(facialRecordIndex !== bodyRecordIndex, 'p' + phase.phase + ' facial and body must be distinct records');
    const facialLedger = report.recordLedger.find((record) => record.index === facialRecordIndex);
    assert(facialLedger.source === 'facial-overlay', 'p' + phase.phase + ' facial ledger source mismatch');
    let onlyFacialDiffers = true;
    const differing = [];
    for (let index = 0; index < produced.records.length; index++) {
      const a = buffer.subarray(produced.records[index].offset + 8, produced.records[index].offset + produced.records[index].length);
      const b = source.subarray(wo005.records[index].offset + 8, wo005.records[index].offset + wo005.records[index].length);
      const same = a.equals(b);
      if (index === facialRecordIndex) { if (same) { onlyFacialDiffers = false; differing.push({ index, verdict: 'facial-identical' }); } }
      else if (!same) { onlyFacialDiffers = false; differing.push({ index, verdict: 'unexpected-diff' }); }
    }
    assert(onlyFacialDiffers, 'p' + phase.phase + ' ' + JSON.stringify(differing));
    assert(produced.records[facialRecordIndex].length !== wo005.records[facialRecordIndex].length, 'p' + phase.phase + ' facial payload length should change');
    assert(L.H16(produced.records[facialRecordIndex].id) === L.H16(wo005.records[facialRecordIndex].id), 'p' + phase.phase + ' facial record id must keep the 14002 re-key');
    results.push({ phase: phase.phase, facialRecordIndex, bodyRecordIndex, facialBytes: produced.records[facialRecordIndex].length, wo005FacialBytes: wo005.records[facialRecordIndex].length });
  }
  return results;
});

test('manifest-pins-current', () => {
  const refs = [];
  refs.push(manifest.build.source273, ...manifest.phases.flatMap((phase) => [phase.nativeContainer, phase.adefs, ...phase.overlays]), ...manifest.members);
  const drift = [];
  for (const ref of refs) {
    if (!ref.path) continue;
    if (!fs.existsSync(ref.path)) { drift.push({ path: ref.path, reason: 'missing' }); continue; }
    if (ref.sha256 && L.sha256(ref.path) !== String(ref.sha256).toLowerCase()) drift.push({ path: ref.path, reason: 'hash-drift' });
  }
  assert(drift.length === 0, JSON.stringify(drift));
  return { inputs: refs.length };
});

test('archive-key-basename-derived', () => {
  const key = L.keyV99.deriveArchiveKeyV99(manifest.build.basename);
  assert(key === Number(manifest.build.expectedArchiveKey), 'key 0x' + key.toString(16) + ' != expected ' + manifest.build.expectedArchiveKey);
  assert(key === 4152649310, 'key must equal the reviewed WO005 key');
  return { key: '0x' + key.toString(16).toUpperCase() };
});

test('no-hide-ctrl-source-inputs', () => {
  const refs = manifest.members.map((member) => member.path);
  const bad = refs.filter((ref) => /hidelink|hidectrldata|hide_ctrl|(^|\\)hide\\/i.test(ref));
  assert(bad.length === 0, JSON.stringify(bad));
  return null;
});

L.cleanScratchRoot();
console.log(failures ? 'TESTS FAILED: ' + failures : 'ALL TESTS PASS');
process.exitCode = failures ? 1 : 0;
