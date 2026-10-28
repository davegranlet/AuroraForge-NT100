'use strict';

// Lane 02 focused decode: reuse the canonical record layout and timing-group
// decoder; never write outside this isolated lane.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const LANE = __dirname;
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));

const DOLPH = path.join(ROOT, 'animation', 'workflows', 'dolph-ziggler-1-2k19', 'outputs', 'dolph-ziggler-1-2k19');
const PARALLEL = path.join(DOLPH, 'parallel-integration');
const LANE04 = path.join(PARALLEL, 'work-order-20261020', 'lane-04-integration');
const BUILD = path.join(LANE04, 'builds', 'p14002-0fae-ropes-only-lane04-20261020');
const CANDIDATE_CAK = path.join(BUILD, 'aurora-2k25-replace-mod.cak');
const CANDIDATE_STAGE = path.join(BUILD, 'staging');
const BASELINE_STAGE = path.join(LANE04, 'baseline-audit', 'staging');
const BUILD_INTENT_PATH = path.join(BUILD, 'build-intent.json');
const BUILD_REPORT_PATH = path.join(BUILD, 'build-report.json');
const VERIFY_PATH = path.join(LANE04, 'LANE-04-VERIFICATION.json');
const DELTA_PATH = path.join(BUILD, 'LANE-04-DELTA.json');
const EXPECTED_CAK = '985E735499DDB2869899217FB9F4D36C6A86BBFBA095E1DBDFAB99150391376D';
const EXPECTED_MANIFEST = '23DB2A677F57E14122AA08F82B39FD1DD18AD02386EA28E96DD21D4A7CE1CCCC';
const ROOT_ID = '0x1F4DA262FC146772';
const CAMERA_ID = '0x54D1B2A64667E32E';
const TARGET_ID = '0x5A3744A0D6E080B1';
const FOV_ID = '0x188FD8CF51F19C95';
const PHASES = [
  { phase: 100, file: '1014002.clips', expectedFrames: 361 },
  { phase: 110, file: '1114002.clips', expectedFrames: 795 },
  { phase: 120, file: '1214002.clips', expectedFrames: 891 },
  { phase: 130, file: '1314002.clips', expectedFrames: 957 },
  { phase: 140, file: '1414002.clips', expectedFrames: 201 },
];

const sha = (data) => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const shaFile = (file) => sha(fs.readFileSync(file));
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const round = (n) => Number.isFinite(n) ? Number(n.toFixed(6)) : null;
const norm = (v) => v && Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
const vectorDelta = (a, b) => a && b ? a.map((x, i) => round(x - b[i])) : null;
const distance = (a, b) => a && b ? round(Math.sqrt(a.reduce((sum, x, i) => sum + (x - b[i]) ** 2, 0))) : null;
const safeRel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function assert(condition, message) { if (!condition) throw new Error(message); }

function getDesc(rec, index) {
  const e = rec.raw.group78[index];
  return {
    scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0),
    width: parseInt(e.hex.slice(2, 4), 16),
    rest: e.candidate.f32le[1],
  };
}

function decodeRecord(rec, buf) {
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const offset = parseInt(g90.relativeOffset, 16);
  const stream = buf.subarray(rec.offset + offset, rec.offset + offset + g90.bytes);
  const reader = new BitReader(stream);
  const tracks = [];
  for (let track = 0; track < rec.trackIdentifiers.length; track++) {
    const desc = Array.from({ length: 6 }, (_, s) => getDesc(rec, track * 6 + s));
    const posGroup = parseTimingGroup(reader, rec.frameValue, desc.slice(0, 3).map((d) => d.width));
    const position = posGroup.skipped
      ? Array.from({ length: rec.frameValue }, () => desc.slice(0, 3).map((d) => d.rest))
      : evalGroup(stream, posGroup, desc.slice(0, 3), rec.frameValue);
    const rotGroup = parseTimingGroup(reader, rec.frameValue, desc.slice(3, 6).map((d) => d.width));
    const rotation = rotGroup.skipped
      ? Array.from({ length: rec.frameValue }, () => desc.slice(3, 6).map((d) => d.rest))
      : evalGroup(stream, rotGroup, desc.slice(3, 6), rec.frameValue);
    tracks.push({ track, id: rec.trackIdentifiers[track], position, rotation, posGroup, rotGroup, descriptors: desc });
  }
  assert(reader.pos <= stream.length * 8, `record ${rec.id}: timing parser exceeded group90`);
  return { tracks, consumedBits: reader.pos, totalBits: stream.length * 8 };
}

function trackById(decoded, id, label) {
  const found = decoded.tracks.filter((t) => t.id.toUpperCase() === id.toUpperCase());
  assert(found.length === 1, `${label}: expected one track ${id}, found ${found.length}`);
  return found[0];
}

function getStagingClip(root, file) {
  const p = path.join(root, 'Animation', 'CaeAdvanced', file);
  assert(fs.existsSync(p), `missing staged input ${p}`);
  return { path: p, bytes: fs.readFileSync(p) };
}

function vectorRows(arr) { return arr ? arr.map((v) => v.map(round)) : null; }

function topSteps(rows, field, limit = 5) {
  return rows
    .filter((r) => r.steps[field] && r.steps[field].delta !== null)
    .map((r) => ({ frame: r.phaseFrame, t: r.phaseTimeSec, delta: r.steps[field].delta, magnitude: r.steps[field].magnitude }))
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, limit);
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) value = value.join('|');
  else if (typeof value === 'object') value = JSON.stringify(value);
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function flattenRow(r) {
  const cols = {
    phase: r.phase,
    phaseFrame: r.phaseFrame,
    sourceFrame: r.sourceFrame,
    phaseTimeSec: r.phaseTimeSec,
    sourceTimeSec: r.sourceTimeSec,
    bodyRootX: r.bodyRoot.position[0], bodyRootY: r.bodyRoot.position[1], bodyRootZ: r.bodyRoot.position[2],
    bodyRootDX: r.bodyRoot.delta?.[0], bodyRootDY: r.bodyRoot.delta?.[1], bodyRootDZ: r.bodyRoot.delta?.[2],
    bodyRootVX: r.bodyRoot.velocityPerSec?.[0], bodyRootVY: r.bodyRoot.velocityPerSec?.[1], bodyRootVZ: r.bodyRoot.velocityPerSec?.[2],
    cameraX: r.camera.position[0], cameraY: r.camera.position[1], cameraZ: r.camera.position[2],
    cameraRotX: r.camera.rotation?.[0], cameraRotY: r.camera.rotation?.[1], cameraRotZ: r.camera.rotation?.[2],
    cameraRotDX: r.camera.rotationDelta?.[0], cameraRotDY: r.camera.rotationDelta?.[1], cameraRotDZ: r.camera.rotationDelta?.[2],
    cameraRotVX: r.camera.rotationVelocityPerSec?.[0], cameraRotVY: r.camera.rotationVelocityPerSec?.[1], cameraRotVZ: r.camera.rotationVelocityPerSec?.[2],
    cameraDX: r.camera.delta?.[0], cameraDY: r.camera.delta?.[1], cameraDZ: r.camera.delta?.[2],
    cameraVX: r.camera.velocityPerSec?.[0], cameraVY: r.camera.velocityPerSec?.[1], cameraVZ: r.camera.velocityPerSec?.[2],
    targetX: r.target.position[0], targetY: r.target.position[1], targetZ: r.target.position[2],
    targetDX: r.target.delta?.[0], targetDY: r.target.delta?.[1], targetDZ: r.target.delta?.[2],
    targetVX: r.target.velocityPerSec?.[0], targetVY: r.target.velocityPerSec?.[1], targetVZ: r.target.velocityPerSec?.[2],
    fovTrack2Position: r.fovCamera.position,
    fovTrack2Rotation: r.fovCamera.rotation,
    fovTrack2PositionDelta: r.fovCamera.positionDelta,
    fovTrack2PositionVelocityPerSec: r.fovCamera.positionVelocityPerSec,
    fovTrack2RotationDelta: r.fovCamera.rotationDelta,
    fovTrack2RotationVelocityPerSec: r.fovCamera.rotationVelocityPerSec,
    cameraRootDistance: r.distances.cameraToRoot,
    targetRootDistance: r.distances.targetToRoot,
    cameraTargetDistance: r.distances.cameraToTarget,
    candidateLargeCameraStep: r.steps.cameraPosition?.magnitude,
  };
  return cols;
}

function main() {
  const buildIntent = json(BUILD_INTENT_PATH);
  const buildReport = json(BUILD_REPORT_PATH);
  const verification = json(VERIFY_PATH);
  const deltaReport = json(DELTA_PATH);
  const manifestPath = buildIntent.manifest;
  assert(fs.existsSync(manifestPath), `missing build manifest ${manifestPath}`);
  const manifestHash = shaFile(manifestPath);
  const candidateHash = shaFile(CANDIDATE_CAK);
  assert(candidateHash === EXPECTED_CAK, `candidate SHA mismatch: ${candidateHash}`);
  assert(verification.candidate.sha256.toUpperCase() === EXPECTED_CAK, 'lane-04 verification candidate hash differs');
  assert(buildReport.cakSha256.toUpperCase() === EXPECTED_CAK, 'build report candidate hash differs');
  assert(buildIntent.manifestHash.toUpperCase() === EXPECTED_MANIFEST, 'build-intent manifest hash differs from pin');
  assert(manifestHash === EXPECTED_MANIFEST, `actual component manifest hash differs: ${manifestHash}`);
  assert(verification.candidate.buildManifestSha256.toUpperCase() === EXPECTED_MANIFEST, 'lane-04 verification manifest pin differs');
  assert(buildReport.manifestHash.toUpperCase() === EXPECTED_MANIFEST, 'build report manifest pin differs');
  assert(deltaReport.candidate.sha256.toUpperCase() === EXPECTED_CAK, 'delta report candidate hash differs');

  const evidencePaths = [
    BUILD_INTENT_PATH, BUILD_REPORT_PATH, VERIFY_PATH, DELTA_PATH, manifestPath,
    path.join(DOLPH, 'haiku-273', 'final-qa', 'decode-opening-depth.js'),
    path.join(DOLPH, 'haiku-273', 'final-qa', 'opening-depth-data.json'),
    path.join(DOLPH, 'haiku-273', 'final-qa', 'OPENING-DEPTH-REVIEW.md'),
    path.join(PARALLEL, 'lead-followup-2026-10-18', '01-lead-synthesis-result.md'),
    path.join(PARALLEL, 'lead-camera-distance-2026-10-19', 'camera-body-distance-comparison.json'),
    path.join(ROOT, 'animation', 'tools', 'clips-layout.js'),
    path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'),
    path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'),
    path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'),
  ];
  const inputHashes = Object.fromEntries(evidencePaths.map((p) => [safeRel(p), shaFile(p)]));
  inputHashes[safeRel(CANDIDATE_CAK)] = candidateHash;

  const expectedMembers = new Map(buildIntent.members.map((m) => [m.archive, m]));
  const rows = [];
  const phaseMetadata = [];
  let sourceFrameStart = 0;
  let sourceTimeStart = 0;

  for (const phase of PHASES) {
    const archiveName = `Animation/CaeAdvanced/${phase.file}`;
    const manifestMember = expectedMembers.get(archiveName);
    assert(manifestMember, `build-intent has no ${archiveName} member`);
    const candidateClip = getStagingClip(CANDIDATE_STAGE, phase.file);
    const baselineClip = getStagingClip(BASELINE_STAGE, phase.file);
    const candidateClipHash = sha(candidateClip.bytes);
    const baselineClipHash = sha(baselineClip.bytes);
    assert(candidateClipHash === manifestMember.sha256.toUpperCase(), `${phase.file}: candidate staging SHA != build-intent member SHA`);
    const cand = parse(candidateClip.bytes, { includeRaw: true });
    const base = parse(baselineClip.bytes, { includeRaw: true });
    const bodyRec = cand.records.filter((r) => r.trackIdentifiers.includes(ROOT_ID));
    const camRec = cand.records.filter((r) => r.trackIdentifiers.includes(CAMERA_ID) && r.trackIdentifiers.includes(TARGET_ID) && r.trackIdentifiers.includes(FOV_ID));
    assert(bodyRec.length === 1, `${phase.file}: expected unique root body record, got ${bodyRec.length}`);
    assert(camRec.length === 1, `${phase.file}: expected unique Camera/tgt.Camera/fov.Camera record, got ${camRec.length}`);
    const body = bodyRec[0];
    const camera = camRec[0];
    assert(body.frameValue === phase.expectedFrames && camera.frameValue === phase.expectedFrames, `${phase.file}: frame count mismatch`);
    const baseBody = base.records.find((r) => r.id === body.id && r.trackIdentifiers.join('|') === body.trackIdentifiers.join('|'));
    const baseCamera = base.records.find((r) => r.id === camera.id && r.trackIdentifiers.join('|') === camera.trackIdentifiers.join('|'));
    assert(baseBody && baseCamera, `${phase.file}: candidate body/camera identity not found in 0FAE baseline`);
    assert(baseBody.sha256 === body.sha256, `${phase.file}: body payload differs from 0FAE baseline`);
    assert(baseCamera.sha256 === camera.sha256, `${phase.file}: camera payload differs from 0FAE baseline`);

    const bodyDecoded = decodeRecord(body, candidateClip.bytes);
    const cameraDecoded = decodeRecord(camera, candidateClip.bytes);
    const root = trackById(bodyDecoded, ROOT_ID, `${phase.file} body root`);
    const cameraTrack = trackById(cameraDecoded, CAMERA_ID, `${phase.file} camera pose`);
    const targetTrack = trackById(cameraDecoded, TARGET_ID, `${phase.file} camera target`);
    const fovTrack = trackById(cameraDecoded, FOV_ID, `${phase.file} fov.Camera`);
    assert(root.position && root.position.length === phase.expectedFrames, `${phase.file}: root position unavailable`);
    assert(cameraTrack.position && cameraTrack.rotation, `${phase.file}: Camera position/rotation unavailable`);
    assert(targetTrack.position, `${phase.file}: tgt.Camera position unavailable`);
    assert(fovTrack.position || fovTrack.rotation, `${phase.file}: fov.Camera track has no decoded values`);
    for (const values of [root.position, cameraTrack.position, cameraTrack.rotation, targetTrack.position, fovTrack.position, fovTrack.rotation]) {
      if (values) assert(values.length === phase.expectedFrames, `${phase.file}: decoded series frame count mismatch`);
    }

    const localRows = [];
    for (let f = 0; f < phase.expectedFrames; f++) {
      const before = f > 0 ? f - 1 : null;
      const bodyPos = root.position[f];
      const camPos = cameraTrack.position[f];
      const camRot = cameraTrack.rotation[f];
      const targetPos = targetTrack.position[f];
      const fovPos = fovTrack.position ? fovTrack.position[f] : null;
      const fovRot = fovTrack.rotation ? fovTrack.rotation[f] : null;
      const bodyDelta = before === null ? null : vectorDelta(bodyPos, root.position[before]);
      const cameraDelta = before === null ? null : vectorDelta(camPos, cameraTrack.position[before]);
      const cameraRotDelta = before === null ? null : vectorDelta(camRot, cameraTrack.rotation[before]);
      const targetDelta = before === null ? null : vectorDelta(targetPos, targetTrack.position[before]);
      const fovPosDelta = before === null || !fovPos ? null : vectorDelta(fovPos, fovTrack.position[before]);
      const fovRotDelta = before === null || !fovRot ? null : vectorDelta(fovRot, fovTrack.rotation[before]);
      const row = {
        phase: phase.phase,
        phaseFrame: f,
        sourceFrame: sourceFrameStart + f,
        phaseTimeSec: round(f / 60),
        sourceTimeSec: round(sourceTimeStart + f / 60),
        videoTimeSec: null,
        bodyRoot: {
          track: root.track,
          id: root.id,
          position: bodyPos.map(round),
          delta: bodyDelta,
          velocityPerSec: bodyDelta && bodyDelta.map((x) => round(x * 60)),
        },
        camera: {
          track: cameraTrack.track,
          id: cameraTrack.id,
          position: camPos.map(round),
          rotation: camRot && camRot.map(round),
          delta: cameraDelta,
          velocityPerSec: cameraDelta && cameraDelta.map((x) => round(x * 60)),
          rotationDelta: cameraRotDelta,
          rotationVelocityPerSec: cameraRotDelta && cameraRotDelta.map((x) => round(x * 60)),
        },
        target: {
          track: targetTrack.track,
          id: targetTrack.id,
          position: targetPos.map(round),
          delta: targetDelta,
          velocityPerSec: targetDelta && targetDelta.map((x) => round(x * 60)),
        },
        fovCamera: {
          track: fovTrack.track,
          id: fovTrack.id,
          position: fovPos && fovPos.map(round),
          rotation: fovRot && fovRot.map(round),
          positionDelta: fovPosDelta,
          positionVelocityPerSec: fovPosDelta && fovPosDelta.map((x) => round(x * 60)),
          rotationDelta: fovRotDelta,
          rotationVelocityPerSec: fovRotDelta && fovRotDelta.map((x) => round(x * 60)),
        },
        distances: {
          cameraToRoot: distance(camPos, bodyPos),
          targetToRoot: distance(targetPos, bodyPos),
          cameraToTarget: distance(camPos, targetPos),
        },
        steps: {
          bodyRootPosition: bodyDelta && { delta: bodyDelta, magnitude: round(norm(bodyDelta)) },
          cameraPosition: cameraDelta && { delta: cameraDelta, magnitude: round(norm(cameraDelta)) },
          cameraRotation: cameraRotDelta && { delta: cameraRotDelta, magnitude: round(norm(cameraRotDelta)) },
          targetPosition: targetDelta && { delta: targetDelta, magnitude: round(norm(targetDelta)) },
          fovCameraPosition: fovPosDelta && { delta: fovPosDelta, magnitude: round(norm(fovPosDelta)) },
          fovCameraRotation: fovRotDelta && { delta: fovRotDelta, magnitude: round(norm(fovRotDelta)) },
        },
      };
      localRows.push(row);
    }
    rows.push(...localRows);
    phaseMetadata.push({
      phase: phase.phase,
      file: phase.file,
      frames: phase.expectedFrames,
      fps: 60,
      sourceFrameStart,
      sourceTimeStartSec: round(sourceTimeStart),
      durationSec: round(phase.expectedFrames / 60),
      candidateClipSha256: candidateClipHash,
      baseline0FAEClipSha256: baselineClipHash,
      bodyRecord: { id: body.id, index: body.index, sha256: body.sha256, baselineRecordSha256: baseBody.sha256, track62Index: root.track },
      cameraRecord: {
        id: camera.id, index: camera.index, sha256: camera.sha256, baselineRecordSha256: baseCamera.sha256,
        trackIds: camera.trackIdentifiers,
      },
      decoderBits: {
        bodyGroup90Bits: bodyDecoded.totalBits,
        bodyConsumedBits: bodyDecoded.consumedBits,
        cameraGroup90Bits: cameraDecoded.totalBits,
        cameraConsumedBits: cameraDecoded.consumedBits,
      },
      endpoints: {
        rootStart: vectorRows([root.position[0]])[0], rootEnd: vectorRows([root.position.at(-1)])[0],
        cameraStart: vectorRows([cameraTrack.position[0]])[0], cameraEnd: vectorRows([cameraTrack.position.at(-1)])[0],
        cameraRotationStart: vectorRows([cameraTrack.rotation[0]])[0], cameraRotationEnd: vectorRows([cameraTrack.rotation.at(-1)])[0],
        targetStart: vectorRows([targetTrack.position[0]])[0], targetEnd: vectorRows([targetTrack.position.at(-1)])[0],
        fovTrack2PositionStart: fovTrack.position && vectorRows([fovTrack.position[0]])[0],
        fovTrack2PositionEnd: fovTrack.position && vectorRows([fovTrack.position.at(-1)])[0],
        fovTrack2RotationStart: fovTrack.rotation && vectorRows([fovTrack.rotation[0]])[0],
        fovTrack2RotationEnd: fovTrack.rotation && vectorRows([fovTrack.rotation.at(-1)])[0],
      },
      distanceRanges: Object.fromEntries(['cameraToRoot', 'targetToRoot', 'cameraToTarget'].map((key) => {
        const a = localRows.map((r) => r.distances[key]);
        return [key, { start: a[0], min: round(Math.min(...a)), median: round([...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]), max: round(Math.max(...a)), end: a.at(-1) }];
      })),
      largestWithinPhaseSteps: {
        bodyRootPosition: topSteps(localRows, 'bodyRootPosition'),
        cameraPosition: topSteps(localRows, 'cameraPosition'),
        cameraRotation: topSteps(localRows, 'cameraRotation'),
        targetPosition: topSteps(localRows, 'targetPosition'),
        fovCameraPosition: topSteps(localRows, 'fovCameraPosition'),
        fovCameraRotation: topSteps(localRows, 'fovCameraRotation'),
      },
    });
    sourceFrameStart += phase.expectedFrames;
    sourceTimeStart += phase.expectedFrames / 60;
  }

  assert(rows.length === 3205, `unexpected output frame count ${rows.length}`);
  const metadata = {
    schema: 'aurora-forge-lane02-animation-space/v1',
    generatedAt: new Date().toISOString(),
    candidate: { sha256: candidateHash, bytes: fs.statSync(CANDIDATE_CAK).size, manifestSha256: manifestHash, path: safeRel(CANDIDATE_CAK) },
    baseline: { cakSha256: verification.baseline.sha256.toUpperCase(), role: verification.baseline.role },
    sourceVideo: {
      path: 'D:/videos/sept-19-2026/2026-10-20_22-39-54.mp4',
      sha256: 'C4AD0F0D79A6FC19DC5037742F9E59E67E1AF3EB5AEA98FC917039F494B92F23',
      durationSec: 91.75,
      video: 'H.264 2560x1440, 60 fps, 5505 frames',
      audio: 'AAC stereo 48 kHz, 91.712 s',
      observedIntervalsSec: [{ start: 36, end: 64, description: 'ring-camera segment reviewed at 0.5-second sampling; repeated off-angle/empty ring and performer often absent or at edge' }],
      animationTimeAlignment: null,
    },
    inputHashes,
    channelIds: { bodyRootCarrier: ROOT_ID, camera: CAMERA_ID, target: TARGET_ID, fov: FOV_ID },
    trackSemantics: {
      bodyRootCarrier: 'source-273-derived body clip track 62; identity and carrier designation inherited from existing decode report',
      camera: 'Camera pose: decoded position and 3-component stored rotation series',
      target: 'tgt.Camera target point: decoded position series',
      fov: 'fov.Camera named channel: raw decoded track-2 position/rotation groups are both retained here; exact scalar component/projection semantics remain unproven',
    },
    decode: { fps: 60, sampling: 'every frame, 0-based within each phase', phaseCount: phaseMetadata.length, frameRows: rows.length, distanceUnits: 'decoded clip-space units; no meter conversion asserted', crossPhaseDeltas: 'not computed; each phase starts with null deltas to prevent joining phase cuts', withinPhaseDiscontinuities: 'all per-frame deltas retained; largest steps are separately ranked, not automatically labeled as camera cuts' },
    phases: phaseMetadata,
    rows,
  };

  const jsonPath = path.join(LANE, 'animation-space-series.json');
  const csvPath = path.join(LANE, 'animation-space-series.csv');
  fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2), 'utf8');
  const flat = rows.map(flattenRow);
  const headers = Object.keys(flat[0]);
  fs.writeFileSync(csvPath, `${headers.join(',')}\n${flat.map((r) => headers.map((h) => csvCell(r[h])).join(',')).join('\n')}\n`, 'utf8');
  const outputs = [jsonPath, csvPath].map((p) => ({ path: path.basename(p), bytes: fs.statSync(p).size, sha256: shaFile(p) }));
  const hashesPath = path.join(LANE, 'OUTPUT-HASHES.json');
  fs.writeFileSync(hashesPath, JSON.stringify({ schema: 'aurora-forge-lane02-output-hashes/v1', outputs }, null, 2), 'utf8');
  console.log(JSON.stringify({ status: 'PASS', candidateHash, manifestHash, sourceFrames: rows.length, phaseFrames: phaseMetadata.map((p) => [p.phase, p.frames]), outputs }, null, 2));
}

try { main(); }
catch (error) { console.error(`lane-02 animation-space decode failed: ${error.stack || error.message}`); process.exitCode = 1; }
