'use strict';

// Compare converted and native 2K26 clip-local J_Root/J_anim_origin curves.
// This is a read-only diagnostic: it does not edit clips or infer scene units.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const TRACKS = {
  J_Root: '0x1F4DA262FC146772',
  J_anim_origin: '0x11558A1746547CA2',
};

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function decodeTrack(file, id) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const matches = layout.records.flatMap(record => {
    const index = record.trackIdentifiers.indexOf(id);
    return index < 0 ? [] : [{ record, index }];
  });
  if (matches.length !== 1) throw new Error(`${file}: expected one ${id} track, found ${matches.length}`);
  const { record, index } = matches[0];
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const channel = groupIndex => {
    const descriptors = readTrackDescriptors(parsed, index).slice(groupIndex * 3, groupIndex * 3 + 3);
    const values = evalGroup(stream, parsed.bones[index].groups[groupIndex], descriptors, record.frameValue)
      ?? Array.from({ length: record.frameValue }, () => descriptors.map(item => item.rest));
    if (values.length !== record.frameValue || values.some(v => v.length !== 3 || v.some(x => !Number.isFinite(x)))) {
      throw new Error(`${file}: invalid group ${groupIndex} samples for ${id}`);
    }
    return values;
  };
  return {
    path: path.resolve(file), sha256: sha256(bytes), recordIndex: record.index, recordId: record.id,
    trackId: id, trackIndex: index, frameCount: record.frameValue, fps: record.fps,
    position: channel(0), rotationHalfLog: channel(1),
  };
}

function sampleLinear(values, t) {
  const at = t * (values.length - 1), lo = Math.floor(at), hi = Math.min(values.length - 1, lo + 1), f = at - lo;
  return values[lo].map((v, axis) => v * (1 - f) + values[hi][axis] * f);
}
function quaternion(halfLog) {
  const angle = Math.hypot(...halfLog);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const factor = Math.sin(angle) / angle;
  return [Math.cos(angle), ...halfLog.map(v => v * factor)];
}
function angularDistance(a, b) {
  const qa = quaternion(a), qb = quaternion(b);
  const dot = Math.min(1, Math.abs(qa.reduce((sum, v, i) => sum + v * qb[i], 0)));
  return 2 * Math.acos(dot);
}
function vectorStats(values) {
  const n = values.length;
  return {
    first: values[0], last: values.at(-1),
    min: [0, 1, 2].map(a => Math.min(...values.map(v => v[a]))),
    max: [0, 1, 2].map(a => Math.max(...values.map(v => v[a]))),
    mean: [0, 1, 2].map(a => values.reduce((s, v) => s + v[a], 0) / n),
  };
}
function compareCurve(converted, native, kind, sampleCount = Math.max(converted.position.length, native.position.length)) {
  const positionalErrors = [], rebasedErrors = [], angularErrors = [];
  const startDelta = converted.position[0].map((v, a) => v - native.position[0][a]);
  const n = Math.max(2, Math.min(sampleCount, 10001));
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const cp = sampleLinear(converted.position, t), np = sampleLinear(native.position, t);
    positionalErrors.push(Math.hypot(...cp.map((v, a) => v - np[a])));
    rebasedErrors.push(Math.hypot(...cp.map((v, a) => v - startDelta[a] - np[a])));
    angularErrors.push(angularDistance(sampleLinear(converted.rotationHalfLog, t), sampleLinear(native.rotationHalfLog, t)) * 180 / Math.PI);
  }
  const summary = values => ({
    rmse: Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length),
    max: Math.max(...values), p95: [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * 0.95)],
  });
  return {
    converted: { frames: converted.frameCount, fps: converted.fps, index: converted.trackIndex, position: vectorStats(converted.position) },
    native: { frames: native.frameCount, fps: native.fps, index: native.trackIndex, position: vectorStats(native.position) },
    normalizedTimelinePositionError: summary(positionalErrors),
    normalizedTimelineErrorAfterSubtractingFrameZeroDelta: summary(rebasedErrors),
    normalizedTimelineRotationAngularErrorDegrees: summary(angularErrors),
    frameZeroPositionDeltaConvertedMinusNative: startDelta,
    samples: [0, 0.25, 0.5, 0.75, 1].map(t => ({
      t,
      convertedPosition: sampleLinear(converted.position, t),
      nativePosition: sampleLinear(native.position, t),
      rotationErrorDegrees: angularDistance(sampleLinear(converted.rotationHalfLog, t), sampleLinear(native.rotationHalfLog, t)) * 180 / Math.PI,
    })),
    note: `Comparison for ${kind}; normalized-time and constant-offset metrics are diagnostics, not proof of runtime placement or identical source choreography.`,
  };
}
function analyze(convertedPath, nativePath) {
  const tracks = {};
  for (const [name, id] of Object.entries(TRACKS)) {
    const converted = decodeTrack(convertedPath, id), native = decodeTrack(nativePath, id);
    tracks[name] = compareCurve(converted, native, name);
    tracks[name].inputs = {
      converted: { path: converted.path, sha256: converted.sha256, recordId: converted.recordId },
      native: { path: native.path, sha256: native.sha256, recordId: native.recordId },
    };
  }
  return {
    schema: 'aurora-forge/root-origin-trajectory-comparison/v1',
    method: 'Resolve J_Root and J_anim_origin by exact FNV-1a64 track ID, decode position and rotation groups with Aurora CLIPS readers, resample both curves on normalized clip time, and measure direct versus frame-zero-translation-adjusted errors.',
    converted: path.resolve(convertedPath), native: path.resolve(nativePath), tracks,
    limits: [
      'Clip-local curves only; engine actor, place, and parent transforms are excluded.',
      'Normalized time is a comparison aid and does not retime or authorize retiming the source motion.',
      'A constant translation fit is diagnostic evidence only and does not establish the correct Ring anchor.',
    ],
  };
}
function main(argv) {
  const get = name => { const i = argv.indexOf(name); return i < 0 ? '' : argv[i + 1]; };
  const converted = get('--converted'), native = get('--native'), out = get('--out');
  if (!converted || !native || !out) throw new Error('Usage: node compare-root-origin-trajectories.js --converted <clips> --native <clips> --out <report.json>');
  const report = analyze(converted, native);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ out: path.resolve(out), tracks: Object.fromEntries(Object.entries(report.tracks).map(([name, value]) => [name, {
    delta0: value.frameZeroPositionDeltaConvertedMinusNative,
    direct: value.normalizedTimelinePositionError,
    afterOffset: value.normalizedTimelineErrorAfterSubtractingFrameZeroDelta,
    rotation: value.normalizedTimelineRotationAngularErrorDegrees,
  }])) }, null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Root/origin trajectory comparison failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { analyze, compareCurve, decodeTrack };
