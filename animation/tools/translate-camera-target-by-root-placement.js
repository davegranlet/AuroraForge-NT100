'use strict';

// Aurora Forge diagnostic writer: when a SetPlace correction translates the
// performer root piecewise, apply the identical translation to the paired
// Camera/tgt.Camera position tracks. This preserves their decoded relative
// framing while moving the actor and camera rig together. It does not infer
// engine anchor semantics; output must pass offline archive checks and owner
// runtime preview before acceptance.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse, build } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');
const { parseTimingGroup } = require('./clips-codec/parse-timing-group');
const { copyBits } = require('./clips-codec/copy-bits');
const { concatWriters } = require('./clips-codec/concat-writers');
const { encodeDenseGroup } = require('./clips-codec/encode-dense-group');
const { fitDescriptor } = require('./clips-codec/fit-descriptor');

const ROOT_ID = '0x1F4DA262FC146772';
const CAMERA_ID = '0x54D1B2A64667E32E';
const TARGET_ID = '0x5A3744A0D6E080B1';

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function descriptor(raw, offset) {
  const value = { scale: raw.readInt8(offset), width: raw[offset + 1], rest: raw.readFloatLE(offset + 4) };
  if (value.width > 32 || !Number.isFinite(value.rest)) throw new Error(`invalid descriptor at ${offset}`);
  return value;
}
function uniqueRecord(layout, id, label) {
  const hits = layout.records.flatMap(record => {
    const index = record.trackIdentifiers.indexOf(id);
    return index < 0 ? [] : [{ record, index }];
  });
  if (hits.length !== 1) throw new Error(`${label}: expected one ${id}, found ${hits.length}`);
  return hits[0];
}
function readGroup(bytes, record, trackIndex, groupIndex) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const decoded = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue);
  return decoded ?? Array.from({ length: record.frameValue }, () => descriptors.map(item => item.rest));
}
function writePositionGroups(inputBytes, layout, record, trackIndexes, deltas) {
  const raw = Buffer.from(inputBytes.subarray(record.offset, record.offset + record.length));
  const parsed = parseClipsRecordBuffer(inputBytes, record.index);
  const descSection = record.sections.find(section => section.name === 'group78 descriptors');
  const streamSection = record.sections.find(section => section.name === 'group90');
  if (!descSection || !streamSection) throw new Error('clip record is missing group78/group90 sections');
  const descriptorBase = Number.parseInt(descSection.relativeOffset, 16);
  const streamBase = Number.parseInt(streamSection.relativeOffset, 16);
  const stream = raw.subarray(streamBase, streamBase + streamSection.bytes);
  const bitReader = new (require('./clips-codec/bit-reader').BitReader)(stream);
  const descriptors = Array.from({ length: descSection.count }, (_, index) => descriptor(raw, descriptorBase + index * 8));
  const changed = new Set(trackIndexes.map(index => `${index}:0`));
  const writers = [], descriptorChanges = [];
  let maxQuantizationError = 0;
  for (let track = 0; track < record.trackIdentifiers.length; track += 1) {
    for (let group = 0; group < 2; group += 1) {
      const first = track * 6 + group * 3;
      const channelDescriptors = descriptors.slice(first, first + 3);
      const timing = parseTimingGroup(bitReader, record.frameValue, channelDescriptors.map(item => item.width));
      if (!changed.has(`${track}:${group}`)) {
        writers.push(copyBits(stream, timing.start, timing.end));
        continue;
      }
      const before = readGroup(inputBytes, record, track, group);
      const rows = before.map((row, frame) => row.map((value, axis) => value + deltas[frame][axis]));
      const fitted = channelDescriptors.map((item, axis) => fitDescriptor(rows.map(row => row[axis]), item));
      const encoded = encodeDenseGroup(rows, fitted);
      if (encoded.clampCount) throw new Error(`position encoding clamped ${encoded.clampCount} samples in track ${track}`);
      for (let axis = 0; axis < 3; axis += 1) {
        const d = fitted[axis];
        for (let frame = 0; frame < rows.length; frame += 1) {
          const decoded = d.width ? d.rest + Math.round((rows[frame][axis] - d.rest) / (2 ** d.scale)) * (2 ** d.scale) : d.rest;
          maxQuantizationError = Math.max(maxQuantizationError, Math.abs(decoded - rows[frame][axis]));
        }
        const at = descriptorBase + (first + axis) * 8, old = descriptors[first + axis];
        if (old.scale !== d.scale || old.width !== d.width || old.rest !== d.rest) {
          raw.writeInt8(d.scale, at); raw.writeUInt8(d.width, at + 1); raw.writeFloatLE(d.rest, at + 4);
          descriptorChanges.push({ trackId: record.trackIdentifiers[track], axis, before: old, after: d });
        }
      }
      writers.push(encoded);
    }
  }
  const bones = concatWriters(writers), tail = copyBits(stream, bitReader.pos, stream.length * 8);
  const combined = concatWriters([bones, tail]), usedBits = combined.bitLength(), packed = combined.flush();
  const newStream = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  const prefix = Buffer.from(raw.subarray(0, streamBase));
  prefix.writeUInt32LE(newStream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
  prefix.writeUInt32LE(bones.bitLength(), 0x9c);
  return { bytes: Buffer.concat([prefix, newStream]), maxQuantizationError, descriptorChanges };
}

function run({ basePath, rebasedPath, outputPath, reportPath }) {
  for (const value of [basePath, rebasedPath, outputPath, reportPath]) if (!value) throw new Error('base, rebased, output, and report paths are required');
  for (const value of [outputPath, reportPath]) if (fs.existsSync(value)) throw new Error(`refusing to overwrite ${value}`);
  const baseBytes = fs.readFileSync(basePath), rebasedBytes = fs.readFileSync(rebasedPath);
  const baseLayout = parse(baseBytes, { includeRaw: false }), layout = parse(rebasedBytes, { includeRaw: false });
  if (baseLayout.records.length !== layout.records.length) throw new Error('base/rebased record counts differ');
  for (let i = 0; i < layout.records.length; i += 1) {
    if (baseLayout.records[i].id !== layout.records[i].id || baseLayout.records[i].trackIdentifiers.join(',') !== layout.records[i].trackIdentifiers.join(',')) throw new Error(`record layout differs at index ${i}`);
    if (baseLayout.records[i].frameValue !== layout.records[i].frameValue) throw new Error(`timeline differs at record ${i}`);
  }
  const baseRoot = uniqueRecord(baseLayout, ROOT_ID, 'base body');
  const rebasedRoot = uniqueRecord(layout, ROOT_ID, 'rebased body');
  if (baseRoot.record.index !== rebasedRoot.record.index || baseRoot.record.trackIdentifiers.length !== 64) throw new Error('expected matching 64-track body record');
  const baseRootPos = readGroup(baseBytes, baseRoot.record, baseRoot.index, 0);
  const newRootPos = readGroup(rebasedBytes, rebasedRoot.record, rebasedRoot.index, 0);
  const deltas = baseRootPos.map((row, frame) => row.map((value, axis) => newRootPos[frame][axis] - value));
  let variationWithinDelta = 0;
  for (let frame = 1; frame < deltas.length; frame += 1) for (let axis = 0; axis < 3; axis += 1) variationWithinDelta = Math.max(variationWithinDelta, Math.abs(deltas[frame][axis] - deltas[frame - 1][axis]));
  if (!Number.isFinite(variationWithinDelta)) throw new Error('non-finite root placement delta');

  const camera = uniqueRecord(layout, CAMERA_ID, 'Camera position');
  const target = uniqueRecord(layout, TARGET_ID, 'tgt.Camera position');
  if (camera.record.index !== target.record.index) throw new Error('Camera and tgt.Camera are not in the same clip record');
  if (camera.record.frameValue !== deltas.length) throw new Error('camera and body frame counts differ');
  const rewritten = writePositionGroups(rebasedBytes, layout, camera.record, [camera.index, target.index], deltas);
  const outputRecord = layout.records[camera.record.index];
  const records = layout.records.map(record => record.index === outputRecord.index ? rewritten.bytes : rebasedBytes.subarray(record.offset, record.offset + record.length));
  const output = build(records), outLayout = parse(output, { includeRaw: false }), outRecord = outLayout.records[outputRecord.index];

  const cameraBefore = readGroup(rebasedBytes, outputRecord, camera.index, 0), targetBefore = readGroup(rebasedBytes, outputRecord, target.index, 0);
  const cameraAfter = readGroup(output, outRecord, camera.index, 0), targetAfter = readGroup(output, outRecord, target.index, 0);
  let cameraDeltaError = 0, targetDeltaError = 0, unchangedRecordCount = 0;
  for (let frame = 0; frame < deltas.length; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
    cameraDeltaError = Math.max(cameraDeltaError, Math.abs((cameraAfter[frame][axis] - cameraBefore[frame][axis]) - deltas[frame][axis]));
    targetDeltaError = Math.max(targetDeltaError, Math.abs((targetAfter[frame][axis] - targetBefore[frame][axis]) - deltas[frame][axis]));
  }
  for (const record of layout.records) if (record.index !== outputRecord.index) {
    const bytes = rebasedBytes.subarray(record.offset, record.offset + record.length), out = outLayout.records[record.index];
    if (!bytes.equals(output.subarray(out.offset, out.offset + out.length))) unchangedRecordCount += 1;
  }
  if (cameraDeltaError > 0.03 || targetDeltaError > 0.03 || rewritten.maxQuantizationError > 0.03) throw new Error(`readback failed: camera=${cameraDeltaError}, target=${targetDeltaError}, quantization=${rewritten.maxQuantizationError}`);
  const report = {
    schema: 'aurora-forge/camera-target-root-placement-coupling/v1',
    inputs: { base: { path: path.resolve(basePath), sha256: sha256(baseBytes) }, rebased: { path: path.resolve(rebasedPath), sha256: sha256(rebasedBytes) } },
    method: 'Apply the exact per-frame J_Root translation delta (rebased minus base) to both Camera and tgt.Camera position tracks. Leave all rotation tracks and non-camera records unchanged.',
    records: { body: baseRoot.record.index, camera: camera.record.index, cameraTrackId: CAMERA_ID, targetTrackId: TARGET_ID },
    delta: { frames: deltas.length, maxAdjacentVariation: variationWithinDelta, first: deltas[0], middle: deltas[Math.floor(deltas.length / 2)], last: deltas.at(-1) },
    validation: { cameraDeltaMaxError: cameraDeltaError, targetDeltaMaxError: targetDeltaError, quantizationMaxError: rewritten.maxQuantizationError, descriptorChanges: rewritten.descriptorChanges, otherRecordsChanged: unchangedRecordCount },
    output: { path: path.resolve(outputPath), sha256: sha256(output) },
    limits: ['This preserves camera-to-root translation under the selected piecewise root placement; it does not prove engine anchor semantics or rendered framing.', 'No root, camera, target, or actor rotation is changed.'],
    pass: cameraDeltaError <= 0.03 && targetDeltaError <= 0.03 && rewritten.maxQuantizationError <= 0.03 && unchangedRecordCount === 0,
  };
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(outputPath, output, { flag: 'wx' });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? '' : process.argv[i + 1]; };
    const report = run({ basePath: arg('--base'), rebasedPath: arg('--rebased'), outputPath: arg('--out'), reportPath: arg('--report') });
    console.log(JSON.stringify({ ...report.validation, delta: report.delta, output: report.output, pass: report.pass }, null, 2));
  } catch (error) { console.error(`Camera/root coupling failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { run, readGroup, writePositionGroups };
