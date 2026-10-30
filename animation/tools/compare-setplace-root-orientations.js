'use strict';

// Compare source-converted and native Victory J_Root rotations at corresponding
// SetPlace segments. This is clip-local evidence only; it does not infer arena
// placement or prescribe changing source choreography.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parse } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
const SAMPLE_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function halfLogToQuat(v) {
  const angle = Math.hypot(...v);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const scale = Math.sin(angle) / angle;
  return [Math.cos(angle), ...v.map(value => value * scale)];
}
function normalize(q) {
  const length = Math.hypot(...q);
  return q.map(value => value / (length || 1));
}
function slerp(a0, b0, t) {
  const a = normalize(a0), b = normalize(b0);
  let dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  let target = b;
  if (dot < 0) { dot = -dot; target = b.map(value => -value); }
  if (dot > 0.9995) return normalize(a.map((value, index) => value + t * (target[index] - value)));
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const denominator = Math.sin(theta);
  const left = Math.sin((1 - t) * theta) / denominator;
  const right = Math.sin(t * theta) / denominator;
  return a.map((value, index) => left * value + right * target[index]);
}
function angularDifferenceDegrees(a, b) {
  const dot = Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0));
  return 2 * Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}
function readRootRotations(filePath) {
  const bytes = fs.readFileSync(filePath);
  const layout = parse(bytes, { includeRaw: false });
  const hits = layout.records.flatMap(record => {
    const trackIndex = record.trackIdentifiers.indexOf(ROOT_ID);
    return trackIndex < 0 ? [] : [{ record, trackIndex }];
  });
  if (hits.length !== 1) throw new Error(`${filePath}: expected one ${ROOT_ID} record, found ${hits.length}`);
  const { record, trackIndex } = hits[0];
  const decoded = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const descriptors = readTrackDescriptors(decoded, trackIndex).slice(3, 6);
  const rotations = evalGroup(stream, decoded.bones[trackIndex].groups[1], descriptors, record.frameValue);
  if (!rotations || rotations.length !== record.frameValue || rotations.some(row => row.length !== 3 || row.some(value => !Number.isFinite(value)))) {
    throw new Error(`${filePath}: root rotation track failed to decode`);
  }
  return { path: filePath, sha256: sha256(bytes), recordId: record.id, frames: record.frameValue, rotations };
}
function sampleQuat(rows, frame) {
  const at = Math.max(0, Math.min(rows.length - 1, frame));
  const low = Math.floor(at), high = Math.min(rows.length - 1, low + 1);
  return slerp(halfLogToQuat(rows[low]), halfLogToQuat(rows[high]), at - low);
}
function analyze(native, converted, rebase) {
  if (!Array.isArray(rebase.segments) || rebase.segments.length < 2) throw new Error('Rebase report must contain at least two ordered SetPlace segments');
  const segments = rebase.segments.map((segment, index) => {
    const next = rebase.segments[index + 1];
    const nativeStart = segment.nativeFrame;
    const nativeEnd = next ? next.nativeFrame : native.frames - 1;
    const convertedStart = segment.convertedFrame;
    const convertedEnd = next ? next.convertedFrame : converted.frames - 1;
    if (![nativeStart, nativeEnd, convertedStart, convertedEnd].every(Number.isFinite) || nativeEnd < nativeStart || convertedEnd < convertedStart) {
      throw new Error(`Invalid SetPlace timing at segment ${index}`);
    }
    const samples = SAMPLE_FRACTIONS.map(fraction => {
      const nativeFrame = nativeStart + (nativeEnd - nativeStart) * fraction;
      const convertedFrame = convertedStart + (convertedEnd - convertedStart) * fraction;
      const nativeQuat = sampleQuat(native.rotations, nativeFrame);
      const convertedQuat = sampleQuat(converted.rotations, convertedFrame);
      return { fraction, nativeFrame, convertedFrame, nativeQuat, convertedQuat,
        angularDifferenceDegrees: angularDifferenceDegrees(nativeQuat, convertedQuat) };
    });
    return { index, place: segment.name, nativeStart, nativeEnd, convertedStart, convertedEnd, samples,
      maxAngularDifferenceDegrees: Math.max(...samples.map(sample => sample.angularDifferenceDegrees)) };
  });
  const all = segments.flatMap(segment => segment.samples.map(sample => sample.angularDifferenceDegrees));
  return {
    schema: 'aurora-forge/setplace-root-orientation-comparison/v1',
    method: 'Decode J_Root rotation group as half-log quaternion vectors, sample both timelines at equal normalized progress within corresponding SetPlace segments, then measure shortest quaternion angular distance.',
    native: { path: native.path, sha256: native.sha256, recordId: native.recordId, frames: native.frames },
    converted: { path: converted.path, sha256: converted.sha256, recordId: converted.recordId, frames: converted.frames },
    setPlaceRebaseReport: rebase.inputs,
    segments,
    summary: { sampleCount: all.length, meanAngularDifferenceDegrees: all.reduce((sum, value) => sum + value, 0) / all.length,
      maxAngularDifferenceDegrees: Math.max(...all) },
    limits: [
      'This compares encoded clip-local J_Root orientations at corresponding event progress; it does not prove the runtime parent transform or establish that native orientation is the desired source choreography.',
      'A difference may reflect intentionally different motion, retiming, or interpolation and is not by itself authorization to rotate the converted body.',
    ],
  };
}
function run(argv) {
  const [nativePath, convertedPath, rebasePath, outputPath] = argv;
  if (![nativePath, convertedPath, rebasePath, outputPath].every(Boolean)) {
    throw new Error('Usage: node compare-setplace-root-orientations.js <native.clips> <converted.clips> <setplace-rebase.json> <new-report.json>');
  }
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);
  const rebase = JSON.parse(fs.readFileSync(rebasePath, 'utf8'));
  const report = analyze(readRootRotations(nativePath), readRootRotations(convertedPath), rebase);
  fs.mkdirSync(require('node:path').dirname(require('node:path').resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ out: process.argv[5], summary: report.summary,
      segments: report.segments.map(segment => ({ place: segment.place, maxAngularDifferenceDegrees: segment.maxAngularDifferenceDegrees,
        boundaryDegrees: segment.samples[0].angularDifferenceDegrees })) }, null, 2));
  } catch (error) {
    console.error(`SetPlace root orientation comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { analyze, readRootRotations, sampleQuat, halfLogToQuat, angularDifferenceDegrees, run };
