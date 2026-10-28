'use strict';
// build-camera-candidate.js - gated camera-only candidate builder.
//
// HOLD: do not integrate the companion camera component until the lead accepts
//   1) camera-vs-root mapping,
//   2) third-track semantics,
//   3) native-retained camera track 2 semantics.
// Without an acceptance file this script only writes the review manifest
// (camera-integration/components.camera.json) and refuses to bake.
//
// usage:
//   node build-camera-candidate.js --prepare-only
//   node build-camera-candidate.js --accept camera-integration/acceptance.json [--build-id <id>]
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const L = require('./lib/integration.js');

const argOf = (flag, fallback) => { const index = process.argv.indexOf(flag); return index < 0 ? fallback : process.argv[index + 1]; };
const acceptPath = argOf('--accept', null);
const prepareOnly = process.argv.includes('--prepare-only');
const buildId = argOf('--build-id', 'p14002-camera-candidate-v1');
const CAMERA_CONFIG = path.join(__dirname, 'camera-integration', 'camera-input-contract.json');
const BASE_MANIFEST = path.join(__dirname, 'components.json');
const PREVIEW_MANIFEST = path.join(__dirname, 'camera-integration', 'components.camera.json');
const REFERENCE_BUILD = path.join(__dirname, 'builds', 'p14002-pairfix-v2');

function fail(message) { console.error('CAMERA BUILD REFUSED: ' + message); process.exit(1); }

if (!fs.existsSync(CAMERA_CONFIG)) fail('camera-integration/camera-components.json missing; run prepare-camera-components.js first');
const cameraConfig = L.readJson(CAMERA_CONFIG);
const base = L.readJson(BASE_MANIFEST);
if (!cameraConfig.allChecksPass) fail('camera component preparation did not pass its checks; resolve before integration');

let acceptanceOk = false;
if (acceptPath) {
  if (!fs.existsSync(acceptPath)) fail('acceptance file not found: ' + acceptPath);
  const acceptance = L.readJson(acceptPath);
  acceptanceOk = Boolean(acceptance && acceptance.accepted === true && acceptance.mapping === true && acceptance.thirdTrackNativeRetained === true && acceptance.nativeRetained === true);
} else if (!prepareOnly) {
  fail('lead acceptance file required (--accept <json>): mapping, third-track and native-retained semantics');
}

const merged = JSON.parse(JSON.stringify(base));
for (const phase of merged.phases) {
  const camera = cameraConfig.phases.find((entry) => entry.phase === phase.phase);
  if (!camera) fail('camera config missing phase ' + phase.phase);
  if (!fs.existsSync(camera.overlay.path)) fail('camera overlay missing: ' + camera.overlay.path);
  if (L.sha256(camera.overlay.path) !== camera.overlay.sha256) fail('camera overlay hash drift: ' + camera.overlay.path);
  if (camera.overlay.tracks !== 3) fail('camera overlay track count is not 3 for phase ' + phase.phase);
  if (camera.overlay.frameValue !== phase.expectedFrameValue) fail('camera overlay frames mismatch for phase ' + phase.phase);
  phase.overlays.push({
    component: 'camera',
    status: acceptanceOk ? 'candidate-lead-accepted' : 'candidate-pending-lead-acceptance',
    provenance: 'companion camera-c0: source camera section A tracks 0/1 converted; track 2 native-retained placeholder; unconverted source Camera02 pair not integrated',
    path: camera.overlay.path,
    sha256: camera.overlay.sha256,
  });
}
L.writeJsonBomFree(PREVIEW_MANIFEST, merged);
console.log('camera manifest preview written (no bake): ' + PREVIEW_MANIFEST + ' [' + (acceptanceOk ? 'lead-accepted' : 'pending acceptance') + ']');
if (prepareOnly) process.exit(0);
if (!acceptanceOk) fail('acceptance file must contain accepted:true, mapping:true, thirdTrackNativeRetained:true, nativeRetained:true');

const build = cp.spawnSync(process.execPath, [path.join(__dirname, 'build-prototype.js'), '--manifest', PREVIEW_MANIFEST, '--build-id', buildId, '--skip-verify'], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
process.stdout.write(build.stdout || '');
if (build.stderr) process.stderr.write(build.stderr);
if (build.status !== 0) process.exit(build.status || 1);

const buildRoot = path.join(__dirname, 'builds', buildId);
const verify = cp.spawnSync(process.execPath, [
  path.join(__dirname, 'verify-prototype.js'),
  path.join(buildRoot, 'aurora-2k25-replace-mod.cak'),
  '--build', buildRoot,
  '--reference-build', REFERENCE_BUILD,
  '--compare', path.join(REFERENCE_BUILD, 'aurora-2k25-replace-mod.cak'),
  '--expect-diff', 'clips',
], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
process.stdout.write(verify.stdout || '');
if (verify.stderr) process.stderr.write(verify.stderr);
if (verify.status !== 0) process.exit(verify.status || 1);
console.log('CAMERA CANDIDATE OK: ' + buildRoot);
