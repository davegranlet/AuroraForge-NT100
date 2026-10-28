'use strict';
// camera-contract-tests.js - offline validation of the prepared camera-only integration path.
// No bake, no install: verifies the contract pins, match logic, preview manifest and the
// acceptance gate (the builder must refuse without lead acceptance).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const L = require('../lib/integration.js');

let failures = 0;
function test(name, fn) {
  try { const detail = fn(); console.log('PASS ' + name + (detail ? ' :: ' + JSON.stringify(detail) : '')); }
  catch (error) { failures += 1; console.log('FAIL ' + name + ' :: ' + error.message); }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const LANE = path.join(__dirname, '..');
const CAM = path.join(LANE, 'camera-integration');
const contract = () => L.readJson(path.join(CAM, 'camera-input-contract.json'));
const V2 = path.join(LANE, 'builds', 'p14002-pairfix-v2');

test('contract-all-checks-pass', () => {
  const report = contract();
  assert(report.allChecksPass === true, 'contract checks not all passing');
  assert(report.status.startsWith('prepared-not-integrated'), 'status must remain prepared-not-integrated');
  assert(report.releaseGate.accepted === false, 'release gate must be closed');
  return { phases: report.phases.length, v2Cak: report.pins.v2CakSha256.slice(0, 16) };
});

test('v2-pins-current', () => {
  const report = contract();
  assert(L.sha256(path.join(V2, 'aurora-2k25-replace-mod.cak')) === report.pins.v2CakSha256, 'v2 CAK hash drift');
  for (const phase of report.phases) {
    const file = path.join(V2, 'staging', ...phase.archive.split('/'));
    assert(L.sha256(file) === report.pins.v2Clips[String(phase.phase)].sha256, 'v2 clips drift p' + phase.phase);
  }
  return null;
});

test('overlay-pins-and-match', () => {
  const report = contract();
  const results = [];
  for (const phase of report.phases) {
    assert(fs.existsSync(phase.overlay.path), 'overlay missing: ' + phase.overlay.path);
    assert(L.sha256(phase.overlay.path) === phase.overlay.sha256, 'overlay container hash drift p' + phase.phase);
    const buf = fs.readFileSync(phase.overlay.path);
    const parsed = L.parseClips(buf);
    assert(parsed.records.length === 1, 'overlay must be single-record p' + phase.phase);
    assert(parsed.records[0].trackIdentifiers.length === 3, 'overlay must have 3 tracks p' + phase.phase);
    assert(parsed.records[0].frameValue === phase.overlay.frameValue, 'overlay frames drift p' + phase.phase);
    assert(L.H16(BigInt(parsed.records[0].id)) === phase.overlay.recordId, 'overlay id drift p' + phase.phase);
    const payload = buf.subarray(parsed.records[0].offset, parsed.records[0].offset + parsed.records[0].length);
    assert(L.sha256(payload) === phase.overlay.payloadSha256, 'overlay payload drift p' + phase.phase);
    const v2Buf = fs.readFileSync(path.join(V2, 'staging', ...phase.archive.split('/')));
    const v2 = L.parseClips(v2Buf);
    const v2Camera = v2.records[phase.currentCameraRecord.index];
    assert(v2Camera.id === phase.currentCameraRecord.id, 'current camera record index/id drift p' + phase.phase);
    const set = new Set(v2Camera.trackIdentifiers);
    assert(parsed.records[0].trackIdentifiers.every((track) => set.has(track)) && parsed.records[0].trackIdentifiers.length === v2Camera.trackIdentifiers.length, 'track-set mismatch p' + phase.phase);
    assert(v2Camera.frameValue === phase.currentCameraRecord.frames, 'current camera frames drift p' + phase.phase);
    results.push({ phase: phase.phase, recordIndex: phase.currentCameraRecord.index, recordId: phase.currentCameraRecord.id, overlaySha: phase.overlay.sha256.slice(0, 16) });
  }
  return results;
});

test('preview-manifest-shape', () => {
  const manifest = L.readJson(path.join(CAM, 'components.camera.json'));
  const base = L.readJson(path.join(LANE, 'components.json'));
  assert(manifest.phases.length === base.phases.length, 'phase count differs');
  for (const phase of manifest.phases) {
    const basePhase = base.phases.find((entry) => entry.phase === phase.phase);
    assert(phase.overlays.length === basePhase.overlays.length + 1, 'expected exactly one new overlay in p' + phase.phase);
    const camera = phase.overlays.find((overlay) => overlay.component === 'camera');
    assert(Boolean(camera), 'camera overlay missing in p' + phase.phase);
    assert(camera.status === 'candidate-pending-lead-acceptance' || camera.status === 'candidate-lead-accepted', 'camera overlay status invalid in p' + phase.phase);
    for (const original of basePhase.overlays) {
      const kept = phase.overlays.find((overlay) => overlay.component === original.component);
      assert(kept && kept.sha256 === original.sha256 && kept.path === original.path, 'existing overlay changed in p' + phase.phase);
    }
  }
  return null;
});

test('acceptance-gate-refuses-without-lead', () => {
  const buildRootBefore = fs.existsSync(path.join(LANE, 'builds', 'p14002-camera-candidate-gate-test'));
  assert(!buildRootBefore, 'gate-test build dir already exists');
  const run = cp.spawnSync(process.execPath, [path.join(LANE, 'build-camera-candidate.js'), '--build-id', 'p14002-camera-candidate-gate-test'], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  assert(run.status !== 0, 'builder must refuse without acceptance');
  assert(/lead acceptance file required/i.test(String(run.stderr)), 'expected acceptance refusal, got: ' + String(run.stderr).slice(0, 200));
  assert(!fs.existsSync(path.join(LANE, 'builds', 'p14002-camera-candidate-gate-test')), 'builder must not bake without acceptance');
  return null;
});

test('prepare-only-does-not-bake', () => {
  const run = cp.spawnSync(process.execPath, [path.join(LANE, 'build-camera-candidate.js'), '--prepare-only'], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  assert(run.status === 0, 'prepare-only failed: ' + String(run.stderr).slice(0, 200));
  assert(fs.existsSync(path.join(CAM, 'components.camera.json')), 'preview manifest missing');
  return null;
});

console.log(failures ? 'CAMERA CONTRACT TESTS FAILED: ' + failures : 'ALL CAMERA CONTRACT TESTS PASS');
process.exitCode = failures ? 1 : 0;
