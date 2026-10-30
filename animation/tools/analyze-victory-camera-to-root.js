'use strict';

// Read-only Aurora analysis of the 2K26 Camera/tgt.Camera coordinates relative
// to J_Root in native and converted Victory clips. No clip or game data is edited.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
const CAMERA_IDS = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1'];

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function decodePosition(file, trackId) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const matches = layout.records.flatMap(record => {
    const trackIndex = record.trackIdentifiers.indexOf(trackId);
    return trackIndex < 0 ? [] : [{ record, trackIndex }];
  });
  if (matches.length !== 1) throw new Error(file + ': expected exactly one ' + trackId + ' track, found ' + matches.length);
  const { record, trackIndex } = matches[0];
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(0, 3);
  const values = evalGroup(stream, parsed.bones[trackIndex].groups[0], descriptors, record.frameValue);
  if (!values || values.length !== record.frameValue) throw new Error(file + ': could not decode ' + trackId + ' positions');
  return { values, recordIndex: record.index, recordId: record.id, frameCount: record.frameValue, fps: record.fps, sha256: sha256(bytes), file: path.resolve(file) };
}
function decodeGroup(file, trackId, groupIndex) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const matches = layout.records.flatMap(record => {
    const trackIndex = record.trackIdentifiers.indexOf(trackId);
    return trackIndex < 0 ? [] : [{ record, trackIndex }];
  });
  if (matches.length !== 1) throw new Error(file + ': expected exactly one ' + trackId + ' track, found ' + matches.length);
  const { record, trackIndex } = matches[0];
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const decoded = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue);
  const values = decoded || Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest));
  if (values.length !== record.frameValue) throw new Error(file + ': could not decode group ' + groupIndex + ' for ' + trackId);
  return { values, recordIndex: record.index, frameCount: record.frameValue };
}
function summarize(values) {
  const min = [0, 1, 2].map(a => Math.min(...values.map(v => v[a])));
  const max = [0, 1, 2].map(a => Math.max(...values.map(v => v[a])));
  const mean = [0, 1, 2].map(a => values.reduce((s, v) => s + v[a], 0) / values.length);
  return { min, max, mean, first: values[0], middle: values[Math.floor((values.length - 1) / 2)], last: values.at(-1) };
}
function summarizeScalar(values) {
  return {
    min: Math.min(...values), max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    first: values[0], middle: values[Math.floor((values.length - 1) / 2)], last: values.at(-1),
  };
}
function distance(a, b) { return Math.hypot(...a.map((v, i) => v - b[i])); }
function normalize(v) {
  const length = Math.hypot(...v);
  if (length < 1e-12) throw new Error('Camera and target positions coincide');
  return v.map(value => value / length);
}
function rotationVectorToQuaternion(vector) {
  const angle = Math.hypot(...vector);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(angle) / angle;
  return [Math.cos(angle), vector[0] * s, vector[1] * s, vector[2] * s];
}
function rotateVector(q, v) {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
function cameraAimSummary(camera, target) {
  const directions = camera.map((p, i) => target[i].map((v, axis) => v - p[axis]));
  const ranges = directions.map(d => Math.hypot(...d));
  const yaw = directions.map(d => Math.atan2(d[0], d[2]) * 180 / Math.PI);
  const pitch = directions.map(d => Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180 / Math.PI);
  const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    targetMinusCamera: summarize(directions),
    range: { min: Math.min(...ranges), max: Math.max(...ranges), mean: mean(ranges) },
    yawDegrees: summarizeScalar(yaw),
    pitchDegrees: summarizeScalar(pitch),
    note: 'Record-space target-minus-camera direction; renderer use of tgt.Camera as look-at remains unproven.',
  };
}
function cameraOrientationAlignment(cameraRotation, camera, target) {
  const axes = [
    ['+X', [1, 0, 0]], ['-X', [-1, 0, 0]],
    ['+Y', [0, 1, 0]], ['-Y', [0, -1, 0]],
    ['+Z', [0, 0, 1]], ['-Z', [0, 0, -1]],
  ];
  const scores = axes.map(([axis, basis]) => {
    const errors = camera.map((position, frame) => {
      const q = rotationVectorToQuaternion(cameraRotation[frame]);
      const forward = rotateVector(q, basis);
      const towardTarget = target[frame].map((value, i) => value - position[i]);
      const fl = Math.hypot(...forward), tl = Math.hypot(...towardTarget);
      const dot = forward.reduce((sum, value, i) => sum + value * towardTarget[i], 0) / (fl * tl);
      return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
    });
    return { localAxis: axis, meanAngularErrorDegrees: errors.reduce((a, b) => a + b, 0) / errors.length,
      medianAngularErrorDegrees: errors.slice().sort((a, b) => a - b)[Math.floor(errors.length / 2)],
      first: errors[0], middle: errors[Math.floor((errors.length - 1) / 2)], last: errors.at(-1) };
  }).sort((a, b) => a.meanAngularErrorDegrees - b.meanAngularErrorDegrees);
  return { candidates: scores, note: 'Diagnostic only: rotation-vector convention and renderer forward axis are not independently confirmed; compares all six local basis directions.' };
}
function cameraRotationStepSummary(cameraRotation) {
  const angles = [];
  for (let frame = 1; frame < cameraRotation.length; frame += 1) {
    const a = rotationVectorToQuaternion(cameraRotation[frame - 1]);
    const b = rotationVectorToQuaternion(cameraRotation[frame]);
    const dot = Math.min(1, Math.abs(a.reduce((sum, value, i) => sum + value * b[i], 0)));
    angles.push(2 * Math.acos(dot) * 180 / Math.PI);
  }
  const ordered = angles.slice().sort((a, b) => a - b);
  const percentile = p => ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * p))];
  const topSteps = angles.map((degrees, index) => ({ frame: index + 1, degrees }))
    .sort((a, b) => b.degrees - a.degrees).slice(0, 12);
  return {
    degreesPerFrame: {
      mean: angles.reduce((a, b) => a + b, 0) / angles.length,
      median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99),
      max: ordered.at(-1),
    },
    framesOver5Degrees: angles.filter(value => value > 5).length,
    framesOver15Degrees: angles.filter(value => value > 15).length,
    topSteps,
    note: 'Adjacent decoded camera-orientation samples; rates are descriptive and are not a universal jitter threshold.',
  };
}
function cameraAimDirectionStepSummary(camera, target) {
  const directions = camera.map((position, frame) => normalize(target[frame].map((value, axis) => value - position[axis])));
  const angles = [];
  for (let frame = 1; frame < directions.length; frame += 1) {
    const dot = Math.max(-1, Math.min(1, directions[frame - 1].reduce((sum, value, axis) => sum + value * directions[frame][axis], 0)));
    angles.push(Math.acos(dot) * 180 / Math.PI);
  }
  const ordered = angles.slice().sort((a, b) => a - b);
  const percentile = p => ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * p))];
  return {
    degreesPerFrame: { mean: angles.reduce((a, b) => a + b, 0) / angles.length, median: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: ordered.at(-1) },
    topSteps: angles.map((degrees, index) => ({ frame: index + 1, degrees })).sort((a, b) => b.degrees - a.degrees).slice(0, 12),
    note: 'Adjacent target-minus-camera direction samples; detects source-path shot changes or discontinuities independently of camera rotation.',
  };
}
function analyze(label, clipsPath) {
  const root = decodePosition(clipsPath, ROOT_ID);
  const camera = decodePosition(clipsPath, CAMERA_IDS[0]);
  const target = decodePosition(clipsPath, CAMERA_IDS[1]);
  const cameraRotation = decodeGroup(clipsPath, CAMERA_IDS[0], 1);
  const targetRotation = decodeGroup(clipsPath, CAMERA_IDS[1], 1);
  if (root.frameCount !== camera.frameCount || root.frameCount !== target.frameCount) throw new Error(label + ': root/camera timelines differ');
  if (root.frameCount !== cameraRotation.frameCount || root.frameCount !== targetRotation.frameCount) throw new Error(label + ': root/camera rotation timelines differ');
  const cameraRelative = camera.values.map((p, f) => p.map((v, a) => v - root.values[f][a]));
  const targetRelative = target.values.map((p, f) => p.map((v, a) => v - root.values[f][a]));
  const cameraRootDistance = camera.values.map((p, f) => distance(p, root.values[f]));
  const targetRootDistance = target.values.map((p, f) => distance(p, root.values[f]));
  return {
    label, clipsPath: path.resolve(clipsPath), sha256: root.sha256,
    frameCount: root.frameCount, fps: root.fps,
    recordIndexes: { body: root.recordIndex, camera: camera.recordIndex },
    root: summarize(root.values),
    camera: summarize(camera.values),
    target: summarize(target.values),
    cameraAim: cameraAimSummary(camera.values, target.values),
    cameraRotationToTarget: cameraOrientationAlignment(cameraRotation.values, camera.values, target.values),
    cameraRotationStep: cameraRotationStepSummary(cameraRotation.values),
    cameraAimDirectionStep: cameraAimDirectionStepSummary(camera.values, target.values),
    cameraRotation: summarize(cameraRotation.values),
    targetRotation: summarize(targetRotation.values),
    cameraRelativeToRoot: summarize(cameraRelative),
    targetRelativeToRoot: summarize(targetRelative),
    distances: {
      cameraToRoot: { min: Math.min(...cameraRootDistance), max: Math.max(...cameraRootDistance), mean: cameraRootDistance.reduce((a, b) => a + b, 0) / cameraRootDistance.length },
      targetToRoot: { min: Math.min(...targetRootDistance), max: Math.max(...targetRootDistance), mean: targetRootDistance.reduce((a, b) => a + b, 0) / targetRootDistance.length },
    },
    sampleFrames: [0, Math.floor((root.frameCount - 1) / 2), root.frameCount - 1].map(frame => ({
      frame, root: root.values[frame], camera: camera.values[frame], target: target.values[frame],
      cameraMinusRoot: cameraRelative[frame], targetMinusRoot: targetRelative[frame],
    })),
  };
}
function run(argv) {
  const get = name => { const i = argv.indexOf(name); return i < 0 ? '' : argv[i + 1]; };
  const candidate = get('--candidate'), native = get('--native'), out = get('--out');
  if (!candidate || !native || !out) throw new Error('Usage: node analyze-victory-camera-to-root.js --candidate <converted-clips> --native <native-6100-clips> --out <new-report.json>');
  if (fs.existsSync(out)) throw new Error('refusing to overwrite ' + out);
  const report = {
    schema: 'aurora-forge/victory-camera-to-root-analysis/v1',
    method: 'Decode J_Root, Camera and tgt.Camera position tracks plus Camera rotation; compare clip-local relationships, rotation-to-target alignment, and adjacent-frame direction/rotation steps. No runtime world transform or renderer forward-axis contract is assumed.',
    candidate: analyze('converted 2K19 Victory 6100', candidate),
    native: analyze('native 2K26 Victory 6100', native),
    limits: ['J_Root clip coordinates may receive post-clip placement in the engine.', 'This analysis does not prove that the renderer consumes tgt.Camera as the final look-at point.'],
  };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({
      output: process.argv[process.argv.indexOf('--out') + 1],
      candidate: { root: report.candidate.root, camera: report.candidate.camera, target: report.candidate.target, distances: report.candidate.distances },
      native: { root: report.native.root, camera: report.native.camera, target: report.native.target, distances: report.native.distances },
    }, null, 2));
  } catch (error) { console.error('Victory camera/root analysis failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { analyze, decodePosition, run, summarize };
