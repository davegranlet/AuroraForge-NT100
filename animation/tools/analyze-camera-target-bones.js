'use strict';

// Aurora read-only diagnostic: measure a clips record's tgt.Camera point
// against the performer root channel only. Other skeleton channels are local
// bone-space transforms and cannot be compared without composing hierarchy.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const TARGET_ID = '0x5A3744A0D6E080B1';
const ROOT_NAME = 'J_Root';

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function fnv1a64(text) {
  let hash = 0xCBF29CE484222325n;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001B3n);
  }
  return `0x${hash.toString(16).toUpperCase().padStart(16, '0')}`;
}
function vectorTrack(bytes, layout, recordIndex, trackId, label) {
  const record = layout.records.find(item => item.index === recordIndex);
  if (!record) throw new Error(`${label}: record ${recordIndex} not found`);
  const matches = record.trackIdentifiers.flatMap((id, index) => id.toUpperCase() === trackId.toUpperCase() ? [index] : []);
  if (matches.length !== 1) throw new Error(`${label}: expected one ${trackId} track in record ${recordIndex}; found ${matches.length}`);
  const parsed = parseClipsRecordBuffer(bytes, recordIndex);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, matches[0]).slice(0, 3);
  const decoded = evalGroup(stream, parsed.bones[matches[0]].groups[0], descriptors, record.frameValue);
  const values = decoded || Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest));
  if (values.length !== record.frameValue || values.some(v => v.length < 3 || v.some(n => !Number.isFinite(n)))) {
    throw new Error(`${label}: failed to decode finite position samples for ${trackId}`);
  }
  return { values, frames: record.frameValue, fps: record.fps, recordId: record.id };
}
function summary(values) {
  const min = [0, 1, 2].map(axis => Math.min(...values.map(v => v[axis])));
  const max = [0, 1, 2].map(axis => Math.max(...values.map(v => v[axis])));
  const mean = [0, 1, 2].map(axis => values.reduce((sum, v) => sum + v[axis], 0) / values.length);
  const d = values.map(v => Math.hypot(...v));
  const sorted = [...d].sort((a, b) => a - b);
  return {
    deltaMin: min, deltaMax: max, deltaMean: mean,
    distance: { min: Math.min(...d), median: sorted[Math.floor((sorted.length - 1) / 2)], mean: d.reduce((a, b) => a + b, 0) / d.length, max: Math.max(...d) },
    samples: [0, Math.floor((values.length - 1) / 2), values.length - 1].map(frame => ({ frame, delta: values[frame], distance: d[frame] })),
  };
}
function run(argv) {
  const get = flag => { const i = argv.indexOf(flag); return i < 0 ? '' : argv[i + 1]; };
  const candidate = get('--candidate'), native = get('--native'), out = get('--out');
  if (!candidate || !native || !out) throw new Error('Usage: node analyze-camera-target-bones.js --candidate <clips> --candidate-body-record <i> --candidate-camera-record <i> --native <clips> --native-body-record <i> --native-camera-record <i> --out <new-report.json>');
  if (fs.existsSync(out)) throw new Error(`refusing to overwrite ${out}`);
  const integer = flag => { const value = get(flag); if (!/^\d+$/.test(value)) throw new Error(`${flag} must be a nonnegative integer`); return Number(value); };
  const analyze = (file, bodyRecord, cameraRecord, label) => {
    const bytes = fs.readFileSync(file), layout = parseFile(file, { includeRaw: false });
    const target = vectorTrack(bytes, layout, cameraRecord, TARGET_ID, label);
    const root = vectorTrack(bytes, layout, bodyRecord, fnv1a64(ROOT_NAME), label);
    if (root.frames !== target.frames || root.fps !== target.fps) throw new Error(`${label}: root/target timeline mismatch`);
    return {
      label, file: path.resolve(file), sha256: sha256(bytes), bodyRecordIndex: bodyRecord, cameraRecordIndex: cameraRecord,
      frames: target.frames, fps: target.fps, bodyRecordId: layout.records.find(r => r.index === bodyRecord)?.id,
      targetTrack: { id: TARGET_ID, recordId: target.recordId },
      rootTrack: { name: ROOT_NAME, id: fnv1a64(ROOT_NAME), recordId: root.recordId },
      targetMinusRoot: summary(root.values.map((v, frame) => target.values[frame].map((n, axis) => n - v[axis]))),
    };
  };
  const report = {
    schema: 'aurora-forge/camera-target-to-root-channel/v2',
    method: 'Decode c0 tgt.Camera and J_Root position channels, then summarize their within-clip relative offset. Does not compare local child-bone transforms or infer runtime binding.',
    candidate: analyze(candidate, integer('--candidate-body-record'), integer('--candidate-camera-record'), 'converted 2K19 Victory 6100'),
    native: analyze(native, integer('--native-body-record'), integer('--native-camera-record'), 'native 2K26 Victory 6100'),
    limits: ['This is a within-clip relative-channel measurement, not proof that the game binds tgt.Camera to J_Root or uses an identical post-clip world/place transform.', 'Hips and foot tracks are excluded because they require composing the skeleton hierarchy into root/world space.'],
  };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[process.argv.indexOf('--out') + 1], candidate: report.candidate.targetMinusRoot.distance, native: report.native.targetMinusRoot.distance }, null, 2));
  } catch (error) { console.error(`camera target/bone analysis failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { fnv1a64, run, summary };
