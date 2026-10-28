'use strict';
// Join lane-01 visual samples to lane-02 decoded frame values under the two specified
// anchor hypotheses. This is analysis-only: it never modifies a CAK or source artifact.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const VIDEO_CSV = path.join(ROOT, 'lane-01-video', 'pixel-measurements.csv');
const ANIM_CSV = path.join(ROOT, 'lane-02-animation-space', 'animation-space-series.csv');
const ANIM_JSON = path.join(ROOT, 'lane-02-animation-space', 'animation-space-series.json');
const OUT_JSON = path.join(__dirname, 'aligned-measurements.json');
const OUT_CSV = path.join(__dirname, 'aligned-measurements.csv');
const DURATION = 53.416667;
const PHASES = [
  { phase: 100, start: 0, end: 6.016667 },
  { phase: 110, start: 6.016667, end: 19.266667 },
  { phase: 120, start: 19.266667, end: 34.116667 },
  { phase: 130, start: 34.116667, end: 50.066667 },
  { phase: 140, start: 50.066667, end: DURATION },
];

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((r) => r.length === headers.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}
function num(v) { return v === '' || v == null ? null : Number(v); }
function vec(v) { return !v ? null : v.split('|').map(Number); }
function sub(a, b) { return a && b ? a.map((v, i) => +(v - b[i]).toFixed(6)) : null; }
function norm(a) { return a ? +Math.hypot(...a).toFixed(6) : null; }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(); }

const videoRows = parseCsv(fs.readFileSync(VIDEO_CSV, 'utf8'));
const animRows = parseCsv(fs.readFileSync(ANIM_CSV, 'utf8')).map((r) => ({
  sourceFrame: num(r.sourceFrame), sourceTimeSec: num(r.sourceTimeSec), phase: num(r.phase),
  phaseFrame: num(r.phaseFrame), root: [num(r.bodyRootX), num(r.bodyRootY), num(r.bodyRootZ)],
  camera: [num(r.cameraX), num(r.cameraY), num(r.cameraZ)], cameraRotation: [num(r.cameraRotX), num(r.cameraRotY), num(r.cameraRotZ)],
  target: [num(r.targetX), num(r.targetY), num(r.targetZ)], fovPosition: vec(r.fovTrack2Position), fovRotation: vec(r.fovTrack2Rotation),
  cameraRootDistance: num(r.cameraRootDistance), targetRootDistance: num(r.targetRootDistance), cameraTargetDistance: num(r.cameraTargetDistance),
}));
if (videoRows.length < 20 || animRows.length !== 3205) throw new Error(`Unexpected inputs: video=${videoRows.length}, animation=${animRows.length}`);
const fullJson = JSON.parse(fs.readFileSync(ANIM_JSON, 'utf8'));
if (!Array.isArray(fullJson.rows) || fullJson.rows.length !== animRows.length) throw new Error(`Animation CSV/JSON row count mismatch: CSV=${animRows.length}, JSON=${fullJson.rows && fullJson.rows.length}`);
for (let i = 0; i < animRows.length; i += 1) {
  const c = animRows[i], j = fullJson.rows[i];
  const same = c.sourceFrame === j.sourceFrame && c.phase === j.phase && c.phaseFrame === j.phaseFrame && c.sourceTimeSec === j.sourceTimeSec &&
    JSON.stringify(c.root) === JSON.stringify(j.bodyRoot.position) && JSON.stringify(c.camera) === JSON.stringify(j.camera.position) &&
    JSON.stringify(c.cameraRotation) === JSON.stringify(j.camera.rotation) && JSON.stringify(c.target) === JSON.stringify(j.target.position) &&
    JSON.stringify(c.fovPosition) === JSON.stringify(j.fovCamera.position) && JSON.stringify(c.fovRotation) === JSON.stringify(j.fovCamera.rotation) &&
    c.cameraRootDistance === j.distances.cameraToRoot && c.targetRootDistance === j.distances.targetToRoot && c.cameraTargetDistance === j.distances.cameraToTarget;
  if (!same) throw new Error(`Animation CSV/JSON mismatch at row ${i} (sourceFrame ${c.sourceFrame})`);
}

const hypotheses = [
  { id: 'ring-cut-to-p130-start', anchorVideoRange: [42, 43], anchorVideoSec: 42.5, anchorAnimationSec: 34.116667, anchorDescription: 'first ring cut (~42–43 s) = phase 130 start' },
  { id: 'stage-return-to-cycle-end', anchorVideoRange: [70, 72], anchorVideoSec: 71, anchorAnimationSec: DURATION, anchorDescription: 'stage return (~70–72 s) = 53.416667 s cycle end/reset' },
];

function mapTime(videoTime, h) {
  const raw = h.anchorAnimationSec + videoTime - h.anchorVideoSec;
  if (raw < 0) return { raw, cycle: -1, normalized: null, row: null };
  const cycle = Math.floor((raw + 1e-9) / DURATION);
  const normalized = raw - cycle * DURATION;
  const t = Math.min(normalized, DURATION - 1 / 60);
  let best = animRows[0];
  for (const item of animRows) if (Math.abs(item.sourceTimeSec - t) < Math.abs(best.sourceTimeSec - t)) best = item;
  return { raw, cycle, normalized, row: best };
}
function phaseAt(t) {
  if (t == null || t < 0 || t > DURATION) return null;
  return (PHASES.find((p) => t >= p.start - 1e-8 && t < p.end - 1e-8) || PHASES[PHASES.length - 1]).phase;
}

const all = [];
for (const h of hypotheses) {
  let previous = null;
  for (const v of videoRows) {
    const videoTime = num(v.video_time_s);
    const mapped = mapTime(videoTime, h);
    const uncertainty = (h.anchorVideoRange[1] - h.anchorVideoRange[0]) / 2;
    const bounds = [h.anchorVideoSec - uncertainty, h.anchorVideoSec + uncertainty]
      .map((a) => h.anchorAnimationSec + videoTime - a).sort((x, y) => x - y);
    const phasesPossible = [...new Set(bounds.map((x) => x < 0 ? null : phaseAt(((x % DURATION) + DURATION) % DURATION)))];
    const a = mapped.row;
    const sameContinuousPhase = Boolean(a && previous && previous.cycle === mapped.cycle && previous.row.phase === a.phase);
    const delta = (field) => sameContinuousPhase ? sub(a[field], previous.row[field]) : null;
    const row = {
      hypothesis: h.id, anchorDescription: h.anchorDescription, anchorVideoRangeSec: h.anchorVideoRange,
      nominalVideoToAnimationOffsetSec: +(h.anchorAnimationSec - h.anchorVideoSec).toFixed(6),
      anchorUncertaintySec: uncertainty, videoTimeSec: videoTime, videoFrame: num(v.frame_index),
      scene: v.scene, visibility: v.wrestler_visibility, bboxHeightPx: num(v.height_px), bboxErrorBoundPx: num(v.error_bound_px),
      bboxCenterPx: [num(v.center_x_px), num(v.center_y_px)], landmark: v.landmark_id || null,
      landmarkCenterPx: [num(v.landmark_center_x_px), num(v.landmark_center_y_px)],
      animationTimeUnwrappedSec: +mapped.raw.toFixed(6), animationTimeCycleLocalSec: mapped.normalized == null ? null : +mapped.normalized.toFixed(6),
      animationTimeUncertaintySec: [+(bounds[0]).toFixed(6), +(bounds[1]).toFixed(6)], possiblePhasesAtBounds: phasesPossible,
      cycleIndex: mapped.cycle < 0 ? null : mapped.cycle, postCycleLoopAssumption: mapped.cycle > 0,
      phase: a ? a.phase : null, phaseFrame: a ? a.phaseFrame : null, sourceFrame: a ? a.sourceFrame : null,
      selectedAnimationTimeSec: a ? a.sourceTimeSec : null,
      rootXYZ: a ? a.root : null, cameraXYZ: a ? a.camera : null, cameraRotationStored: a ? a.cameraRotation : null,
      targetXYZ: a ? a.target : null, track2PositionRaw: a ? a.fovPosition : null, track2RotationRaw: a ? a.fovRotation : null,
      cameraRootDistance: a ? a.cameraRootDistance : null, targetRootDistance: a ? a.targetRootDistance : null, cameraTargetDistance: a ? a.cameraTargetDistance : null,
      deltaSincePreviousVideoMeasurement: {
        sourceFrames: sameContinuousPhase ? a.sourceFrame - previous.row.sourceFrame : null,
        animationSeconds: sameContinuousPhase ? +(a.sourceTimeSec - previous.row.sourceTimeSec).toFixed(6) : null,
        rootXYZ: delta('root'), cameraXYZ: delta('camera'), cameraRotationStored: delta('cameraRotation'),
        targetXYZ: delta('target'), track2PositionRaw: delta('fovPosition'), track2RotationRaw: delta('fovRotation'),
        cameraRootDistance: sameContinuousPhase ? +(a.cameraRootDistance - previous.row.cameraRootDistance).toFixed(6) : null,
        targetRootDistance: sameContinuousPhase ? +(a.targetRootDistance - previous.row.targetRootDistance).toFixed(6) : null,
        cameraTargetDistance: sameContinuousPhase ? +(a.cameraTargetDistance - previous.row.cameraTargetDistance).toFixed(6) : null,
        unavailableReason: a ? (sameContinuousPhase ? null : 'first sample, unmapped predecessor, phase boundary, or loop boundary') : 'video timestamp precedes hypothesized animation start',
      },
    };
    all.push(row);
    previous = a ? { cycle: mapped.cycle, row: a } : null;
  }
}

const manifest = {
  schema: 'aurora-forge/size-depth-aligned-measurements/v1',
  candidatePreserved: { sha256: '985E735499DDB2869899217FB9F4D36C6A86BBFBA095E1DBDFAB99150391376D', bytes: 12265600 },
  sourceVideo: { path: 'D:/videos/sept-19-2026/2026-10-20_22-39-54.mp4', sha256: 'C4AD0F0D79A6FC19DC5037742F9E59E67E1AF3EB5AEA98FC917039F494B92F23' },
  inputFiles: [{ path: VIDEO_CSV, sha256: sha(VIDEO_CSV) }, { path: ANIM_CSV, sha256: sha(ANIM_CSV) }, { path: ANIM_JSON, sha256: sha(ANIM_JSON), rows: fullJson.rows.length }],
  timing: { fps: 60, sourceCycleDurationSec: DURATION, sourcePhaseStartsSec: PHASES.map((p) => ({ phase: p.phase, start: p.start, end: p.end })),
    method: 'For each lane-01 sample timestamp, map to nearest lane-02 sourceTimeSec row under each explicit anchor; unwrapped post-cycle times are reduced modulo 53.416667 and labeled as loop assumptions. Delta fields are null across phase/cycle boundaries.' },
  hypotheses: hypotheses.map((h) => ({ ...h, videoToAnimationOffsetSec: +(h.anchorAnimationSec - h.anchorVideoSec).toFixed(6), anchorTimeUncertaintySec: (h.anchorVideoRange[1] - h.anchorVideoRange[0]) / 2 })),
  interpretation: { units: 'decoded clip-space units; not meters', cameraRotation: 'stored three-component values; not degrees', track2: 'raw decoded position and rotation triples; scalar FOV/projection law unproven', visualBoxes: 'manual estimates from contact sheets; approximate bounds are recorded per video row' },
  rowCount: all.length, rows: all,
};
function csvCell(v) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.map((x) => x == null ? '' : x).join('|') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const columns = [
  'hypothesis','videoTimeSec','scene','visibility','bboxHeightPx','bboxErrorBoundPx','landmark','landmarkCenterPx',
  'nominalVideoToAnimationOffsetSec','anchorUncertaintySec','animationTimeUnwrappedSec','animationTimeCycleLocalSec','animationTimeUncertaintySec','possiblePhasesAtBounds','cycleIndex','postCycleLoopAssumption',
  'phase','phaseFrame','sourceFrame','selectedAnimationTimeSec','rootXYZ','cameraXYZ','cameraRotationStored','targetXYZ','track2PositionRaw','track2RotationRaw',
  'cameraRootDistance','targetRootDistance','cameraTargetDistance','deltaSourceFrames','deltaAnimationSeconds','deltaRootXYZ','deltaCameraXYZ','deltaCameraRotationStored','deltaTargetXYZ','deltaTrack2PositionRaw','deltaTrack2RotationRaw','deltaCameraRootDistance','deltaTargetRootDistance','deltaCameraTargetDistance','deltaUnavailableReason',
];
const csv = [columns.join(','), ...all.map((r) => {
  const d = r.deltaSincePreviousVideoMeasurement;
  const values = { ...r, deltaSourceFrames: d.sourceFrames, deltaAnimationSeconds: d.animationSeconds, deltaRootXYZ: d.rootXYZ,
    deltaCameraXYZ: d.cameraXYZ, deltaCameraRotationStored: d.cameraRotationStored, deltaTargetXYZ: d.targetXYZ,
    deltaTrack2PositionRaw: d.track2PositionRaw, deltaTrack2RotationRaw: d.track2RotationRaw,
    deltaCameraRootDistance: d.cameraRootDistance, deltaTargetRootDistance: d.targetRootDistance,
    deltaCameraTargetDistance: d.cameraTargetDistance, deltaUnavailableReason: d.unavailableReason };
  return columns.map((key) => csvCell(values[key])).join(',');
})].join('\n') + '\n';
fs.writeFileSync(OUT_CSV, csv, 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ rows: all.length, videoSamples: videoRows.length, animationFrames: animRows.length, outputCsv: OUT_CSV, outputJson: OUT_JSON, inputVideoCsvSha256: sha(VIDEO_CSV), inputAnimationCsvSha256: sha(ANIM_CSV), outputCsvSha256: sha(OUT_CSV), outputJsonSha256: sha(OUT_JSON) }, null, 2));
