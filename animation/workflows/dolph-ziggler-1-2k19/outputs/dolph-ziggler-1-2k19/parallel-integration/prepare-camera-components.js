'use strict';
// prepare-camera-components.js - build the camera-only integration input path and contract.
// Read-only against the companion lane's camera outputs; writes only inside this lane.
// Does NOT integrate anything: the produced camera-components.json stays gated until the lead
// accepts the camera-vs-root mapping, the third-track, and the native-retained semantics.
const fs = require('fs');
const path = require('path');
const L = require('./lib/integration.js');

const LANE = __dirname;
const OUT_DIR = path.join(LANE, 'camera-integration');
const V2_BUILD = path.join(LANE, 'builds', 'p14002-pairfix-v2');
const V2_CAK = path.join(V2_BUILD, 'aurora-2k25-replace-mod.cak');
const COMPANIONS = path.join(LANE, '..', 'parallel-companions');
const CAMERA_MANIFEST = path.join(COMPANIONS, 'output', 'camera-manifest.json');
const CAMERA_DIR = path.join(COMPANIONS, 'output', 'camera-c0');
const CAMERA_ROUNDTRIP = path.join(COMPANIONS, 'camera-roundtrip-report.json');

const report = {
  schema: 'aurora-forge-camera-integration/v1',
  generated: new Date().toISOString(),
  status: 'prepared-not-integrated (awaiting lead acceptance of mapping / third-track / native-retained semantics)',
  releaseGate: {
    accepted: false,
    requiredAcceptance: ['camera-vs-root mapping', 'third track semantics', 'native-retained camera track 2 semantics'],
    note: 'build-camera-candidate.js refuses to run without an acceptance file containing accepted:true and all three booleans true',
  },
  pins: {},
  phases: [],
};

if (!fs.existsSync(V2_CAK)) throw new Error('v2 build missing: ' + V2_CAK);
if (!fs.existsSync(CAMERA_MANIFEST)) throw new Error('companion camera manifest missing: ' + CAMERA_MANIFEST);

const cameraManifest = L.readJson(CAMERA_MANIFEST);
const manifest = L.readJson(path.join(LANE, 'components.json'));
const v2Verification = L.readJson(path.join(V2_BUILD, 'verification.json'));
const cameraRoundtrip = fs.existsSync(CAMERA_ROUNDTRIP) ? L.readJson(CAMERA_ROUNDTRIP) : null;

report.pins = {
  v2CakSha256: L.sha256(V2_CAK),
  v2VerificationPassed: v2Verification.passed + '/' + (v2Verification.passed + v2Verification.failed),
  source273: manifest.build.source273,
  v2Clips: Object.fromEntries(manifest.phases.map((phase) => [String(phase.phase), { archive: phase.clipsArchive, sha256: L.sha256(path.join(V2_BUILD, 'staging', ...phase.clipsArchive.split('/'))) }])),
  cameraManifest: { path: CAMERA_MANIFEST, sha256: L.sha256(CAMERA_MANIFEST), schema: cameraManifest.schema },
  cameraRoundtrip: cameraRoundtrip ? { path: CAMERA_ROUNDTRIP, sha256: L.sha256(CAMERA_ROUNDTRIP), pass: cameraRoundtrip.pass } : null,
};

const outPhases = [];
let failed = 0;
for (const phase of manifest.phases) {
  const camera = cameraManifest.phases.find((entry) => entry.phase === phase.phase);
  if (!camera) { report.phases.push({ phase: phase.phase, error: 'missing companion camera phase' }); failed += 1; continue; }
  const companionFile = camera.outputFile;
  if (!fs.existsSync(companionFile)) { report.phases.push({ phase: phase.phase, error: 'missing companion camera output: ' + companionFile }); failed += 1; continue; }
  const companionBuf = fs.readFileSync(companionFile);
  const companionSha = L.sha256(companionBuf);
  const companion = L.parseClips(companionBuf);
  const native = L.parseClipsFile(phase.nativeContainer.path);
  const v2 = L.parseClipsFile(path.join(V2_BUILD, 'staging', ...phase.clipsArchive.split('/')));

  const templateId = camera.template.id;
  const nativeCamera = native.records.find((record) => L.H16(BigInt(record.id)) === templateId);
  const uniqueMatches = native.records.filter((record) => {
    const set = new Set(record.trackIdentifiers);
    const candidateSet = new Set(companion.records[0].trackIdentifiers);
    return record.trackIdentifiers.length === companion.records[0].trackIdentifiers.length && companion.records[0].trackIdentifiers.every((track) => set.has(track));
  });

  // v2 camera record: same track-id set as the native camera record (unchanged by body/facial).
  const v2Matches = nativeCamera ? v2.records.filter((record) => {
    const set = new Set(record.trackIdentifiers);
    const nativeSet = new Set(nativeCamera.trackIdentifiers);
    return record.trackIdentifiers.length === nativeCamera.trackIdentifiers.length && nativeCamera.trackIdentifiers.every((track) => set.has(track));
  }) : [];
  const v2Camera = v2Matches.length === 1 ? v2Matches[0] : null;
  const v2Buf = fs.readFileSync(path.join(V2_BUILD, 'staging', ...phase.clipsArchive.split('/')));
  const v2CameraPayload = v2Camera ? v2Buf.subarray(v2Camera.offset, v2Camera.offset + v2Camera.length) : null;
  const companionPayload = companionBuf.subarray(companion.records[0].offset, companion.records[0].offset + companion.records[0].length);
  const companionPayloadSha = L.sha256(companionPayload);

  const recordField = (buffer, record, offset) => buffer.readUInt32LE(record.offset + offset);
  const checks = {
    companionSingleRecord: companion.records.length === 1,
    companionTracks3: companion.records[0].trackIdentifiers.length === 3,
    companionIdIsTemplate: L.H16(BigInt(companion.records[0].id)) === templateId,
    companionFramesMatch: companion.records[0].frameValue === phase.expectedFrameValue,
    companionPayloadShaMatchesManifest: companionPayloadSha.toUpperCase() === String(camera.outputSha256).toUpperCase(),
    companionPayloadBytesMatchManifest: companionPayload.length === camera.outputBytes,
    nativeTemplateExists: Boolean(nativeCamera),
    companionTrackSetMatchesNativeCamera: uniqueMatches.length === 1,
    v2CameraRecordFound: Boolean(v2Camera),
    v2CameraFramesMatch: v2Camera ? v2Camera.frameValue === phase.expectedFrameValue : false,
    roundtripPass: cameraRoundtrip ? cameraRoundtrip.phases.find((entry) => entry.phase === phase.phase)?.pass === true : null,
  };
  const phaseOk = Object.values(checks).every((value) => value !== false);
  if (!phaseOk) failed += 1;

  const entry = {
    phase: phase.phase,
    phaseDir: phase.phaseDir,
    status: 'candidate-pending-lead-acceptance',
    component: 'camera',
    archive: phase.clipsArchive,
    overlay: {
      path: companionFile,
      sha256: companionSha,
      payloadSha256: companionPayloadSha,
      bytes: companionBuf.length,
      payloadBytes: companionPayload.length,
      tracks: companion.records[0].trackIdentifiers.length,
      frameValue: companion.records[0].frameValue,
      recordId: L.H16(BigInt(companion.records[0].id)),
    },
    currentCameraRecord: v2Camera ? {
      index: v2Camera.index,
      id: v2Camera.id,
      nativeId: nativeCamera ? nativeCamera.id : null,
      trackIdentifiers: v2Camera.trackIdentifiers,
      frames: v2Camera.frameValue,
      fps: v2Camera.fps,
      length: v2Camera.length,
      counts: { tracks: recordField(v2Buf, v2Camera, 0x20), g38: recordField(v2Buf, v2Camera, 0x38), g60: recordField(v2Buf, v2Camera, 0x60), g78: recordField(v2Buf, v2Camera, 0x78), g90: recordField(v2Buf, v2Camera, 0x90), usedBits: recordField(v2Buf, v2Camera, 0x9c) },
      payloadSha256: L.sha256(v2CameraPayload),
    } : null,
    companionRecord: {
      columns: camera.tracks,
      unconverted: camera.unconverted,
      bitLength: camera.bitLength,
      groupBytes: camera.groupBytes,
      payloadSha256: L.sha256(companionPayload),
      payloadBytesBeyondId: companionPayload.length,
    },
    sourcePin: camera.source,
    templatePin: camera.template,
    checks,
    openSemantics: [
      'camera-vs-root mapping: source camera section A tracks 0/1 -> target camera tracks 0/1 (companion correlation evidence; lead acceptance required)',
      'third track: target camera track 2 is NATIVE-RETAINED placeholder, not source-derived (lead acceptance required)',
      'unconverted source Camera02 pair (section B) exported verbatim, not integrated',
    ],
  };
  outPhases.push(entry);
  report.phases.push(entry);
  const ok = Object.entries(checks).map(([key, value]) => key + '=' + (value === null ? 'n/a' : value ? 'ok' : 'FAIL')).join(' ');
  console.log('phase ' + phase.phase + ': ' + ok);
}

report.allChecksPass = failed === 0;
report.phases = outPhases;
report.integrationPath = {
  builder: path.join(LANE, 'build-camera-candidate.js'),
  verifier: path.join(LANE, 'verify-prototype.js'),
  acceptanceFile: '<lead-supplied acceptance.json>',
  verifierContract: [
    'reference diff vs builds/p14002-pairfix-v2 must be exactly the five 1X14002.clips (--expect-diff clips)',
    'untouched records in each clips file must be byte-identical beyond the id field to the v2 build (--reference-build)',
    'camera overlay payloads must be byte-identical beyond the id field to the pinned camera-c0 components',
    'all standard checks: 37 payload extraction hashes + TDB, ids/durations, pair typed audit, registries, SDB, no-Hide',
  ],
};
fs.mkdirSync(OUT_DIR, { recursive: true });
L.writeJsonBomFree(path.join(OUT_DIR, 'camera-input-contract.json'), report);
L.writeJsonBomFree(path.join(OUT_DIR, 'camera-components.json'), {
  schema: 'aurora-forge-integration-camera-components/v1',
  generated: report.generated,
  status: report.status,
  allChecksPass: report.allChecksPass,
  pins: report.pins,
  releaseGate: report.releaseGate,
  phases: outPhases.map((entry) => ({ phase: entry.phase, phaseDir: entry.phaseDir, component: 'camera', status: entry.status, path: entry.overlay.path, sha256: entry.overlay.sha256, tracks: entry.overlay.tracks, frameValue: entry.overlay.frameValue })),
});
console.log(failed === 0 ? 'camera integration input prepared (NOT integrated): ' + path.join(OUT_DIR, 'camera-input-contract.json') : 'CAMERA PREP FAILED: ' + failed + ' phase(s)');
process.exitCode = failed === 0 ? 0 : 1;
