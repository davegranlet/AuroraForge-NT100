'use strict';

// Rebase a converted CaeAdvanced body to the native same-motion J_Root
// frame-zero position while preserving every root displacement. Recompute the
// inverse J_anim_origin translation so the source-derived root/origin pair
// remains mutually consistent. Only the two position groups are re-encoded.
// This produces a diagnostic candidate; it does not prove runtime placement.
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
const ORIGIN_ID = '0x11558A1746547CA2';

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function inverse(q) { return [q[0], -q[1], -q[2], -q[3]]; }
function multiply(a, b) {
  return [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
}
function rotate(q, v) { return multiply(multiply(q, [0, ...v]), inverse(q)).slice(1); }
function quaternionFromHalfLog(v) {
  const angle = Math.hypot(...v);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const scale = Math.sin(angle) / angle;
  return [Math.cos(angle), ...v.map(x => x * scale)];
}
function readDescriptor(raw, offset) {
  const d = { scale: raw.readInt8(offset), width: raw[offset + 1], rest: raw.readFloatLE(offset + 4) };
  if (d.width > 32 || !Number.isFinite(d.rest)) throw new Error(`invalid descriptor at ${offset}`);
  return d;
}
function uniqueTrack(layout, id, label) {
  const hits = layout.records.flatMap(record => {
    const index = record.trackIdentifiers.indexOf(id);
    return index < 0 ? [] : [{ record, index }];
  });
  if (hits.length !== 1) throw new Error(`${label}: expected one ${id} record, found ${hits.length}`);
  return hits[0];
}
function vectorError(a, b) { return Math.hypot(...a.map((v, i) => v - b[i])); }
function recordPosition(bytes, record, trackIndex, groupIndex) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const values = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue)
    ?? Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest));
  return { values, descriptors };
}
function decodedGroupAt(bytes, record, trackIndex, groupIndex) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  return evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue)
    ?? Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest));
}

function rebase(convertedBytes, convertedRecord, nativeBytes, nativeRecord, rootIndex, originIndex) {
  const raw = convertedBytes.subarray(convertedRecord.offset, convertedRecord.offset + convertedRecord.length);
  const parsed = parseClipsRecordBuffer(convertedBytes, convertedRecord.index);
  const descriptorBase = Number.parseInt(convertedRecord.sections.find(section => section.name === 'group78 descriptors').relativeOffset, 16);
  const streamSection = convertedRecord.sections.find(section => section.name === 'group90');
  const streamBase = Number.parseInt(streamSection.relativeOffset, 16);
  const stream = raw.subarray(streamBase, streamBase + streamSection.bytes);
  const frameCount = convertedRecord.frameValue;
  const nativeRoot = recordPosition(nativeBytes, nativeRecord, nativeRecord.trackIdentifiers.indexOf(ROOT_ID), 0).values[0];
  const rootBefore = recordPosition(convertedBytes, convertedRecord, rootIndex, 0).values;
  const rootRotation = recordPosition(convertedBytes, convertedRecord, rootIndex, 1).values;
  const rootOriginBefore = recordPosition(convertedBytes, convertedRecord, originIndex, 0).values;
  const originRotation = recordPosition(convertedBytes, convertedRecord, originIndex, 1).values;
  const delta = rootBefore[0].map((v, axis) => v - nativeRoot[axis]);
  const rootAfter = rootBefore.map(v => v.map((x, axis) => x - delta[axis]));
  const originAfter = rootAfter.map((p, frame) => rotate(inverse(quaternionFromHalfLog(rootRotation[frame])), p.map(x => -x)));

  const reader = new (require('./clips-codec/bit-reader').BitReader)(stream);
  const descriptors = Array.from({ length: convertedRecord.sections.find(section => section.name === 'group78 descriptors').count }, (_, i) => readDescriptor(raw, descriptorBase + i * 8));
  const writers = [];
  const descriptorChanges = [];
  const changedGroups = new Set([[rootIndex, 0].join(':'), [originIndex, 0].join(':')]);
  let groupReadbackMaxError = 0;
  for (let track = 0; track < convertedRecord.trackIdentifiers.length; track += 1) {
    for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
      const first = track * 6 + groupIndex * 3;
      const channelDescriptors = descriptors.slice(first, first + 3);
      const timing = parseTimingGroup(reader, frameCount, channelDescriptors.map(d => d.width));
      const key = `${track}:${groupIndex}`;
      if (!changedGroups.has(key)) {
        writers.push(copyBits(stream, timing.start, timing.end));
        continue;
      }
      const sourceRows = evalGroup(stream, parsed.bones[track].groups[groupIndex], channelDescriptors, frameCount)
        ?? Array.from({ length: frameCount }, () => channelDescriptors.map(d => d.rest));
      const rows = track === rootIndex ? rootAfter : originAfter;
      const fitted = channelDescriptors.map((d, axis) => fitDescriptor(rows.map(row => row[axis]), d));
      const encoded = encodeDenseGroup(rows, fitted);
      if (encoded.clampCount) throw new Error(`clamps encoding track ${track} group ${groupIndex}: ${encoded.clampCount}`);
      for (let axis = 0; axis < 3; axis += 1) {
        const actual = fitted[axis].width ? rows.map(row => fitted[axis].rest + Math.round((row[axis] - fitted[axis].rest) / (2 ** fitted[axis].scale)) * (2 ** fitted[axis].scale)) : rows.map(() => fitted[axis].rest);
        for (let frame = 0; frame < frameCount; frame += 1) groupReadbackMaxError = Math.max(groupReadbackMaxError, Math.abs(actual[frame] - rows[frame][axis]));
        const at = descriptorBase + (first + axis) * 8;
        const before = descriptors[first + axis];
        const after = fitted[axis];
        if (before.scale !== after.scale || before.width !== after.width || before.rest !== after.rest) {
          raw.writeInt8(after.scale, at); raw.writeUInt8(after.width, at + 1); raw.writeFloatLE(after.rest, at + 4);
          descriptorChanges.push({ trackId: convertedRecord.trackIdentifiers[track], group: groupIndex, axis, before, after });
        }
      }
      writers.push(encoded);
      if (sourceRows.length !== rows.length) throw new Error('group frame count changed unexpectedly');
    }
  }
  const boneWriter = concatWriters(writers);
  const tail = copyBits(stream, reader.pos, stream.length * 8);
  const combined = concatWriters([boneWriter, tail]);
  const usedBits = combined.bitLength(), packed = combined.flush();
  const newStream = Buffer.concat([packed, Buffer.alloc((8 - (packed.length % 8)) % 8)]);
  const prefix = Buffer.from(raw.subarray(0, streamBase));
  prefix.writeUInt32LE(newStream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
  prefix.writeUInt32LE(boneWriter.bitLength(), 0x9c);
  const outputRecord = Buffer.concat([prefix, newStream]);
  const originalRecords = parse(convertedBytes, { includeRaw: false }).records;
  const outputRecords = originalRecords.map(record => record.index === convertedRecord.index ? outputRecord : convertedBytes.subarray(record.offset, record.offset + record.length));
  const output = build(outputRecords);
  const outLayout = parse(output, { includeRaw: false });
  const outRecord = outLayout.records[convertedRecord.index];
  const outRoot = recordPosition(output, outRecord, rootIndex, 0).values;
  const outOrigin = recordPosition(output, outRecord, originIndex, 0).values;
  const outRootRot = recordPosition(output, outRecord, rootIndex, 1).values;
  const outOriginRot = recordPosition(output, outRecord, originIndex, 1).values;
  let displacementError = 0, anchorError = 0, inverseOriginError = 0, rotationUntouchedError = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      displacementError = Math.max(displacementError, Math.abs((outRoot[frame][axis] - outRoot[0][axis]) - (rootBefore[frame][axis] - rootBefore[0][axis])));
      inverseOriginError = Math.max(inverseOriginError, Math.abs(outOrigin[frame][axis] - rotate(inverse(quaternionFromHalfLog(outRootRot[frame])), outRoot[frame].map(x => -x))[axis]));
      rotationUntouchedError = Math.max(rotationUntouchedError, Math.abs(outRootRot[frame][axis] - rootRotation[frame][axis]), Math.abs(outOriginRot[frame][axis] - originRotation[frame][axis]));
    }
  }
  let untouchedCurveMaxError = 0;
  const explicitlyChanged = new Set([`${rootIndex}:0`, `${originIndex}:0`]);
  for (let track = 0; track < convertedRecord.trackIdentifiers.length; track += 1) {
    for (let group = 0; group < 2; group += 1) {
      if (explicitlyChanged.has(`${track}:${group}`)) continue;
      const before = decodedGroupAt(convertedBytes, convertedRecord, track, group);
      const after = decodedGroupAt(output, outRecord, track, group);
      if (before.length !== after.length) throw new Error(`untouched track ${track} group ${group} changed frame count`);
      for (let frame = 0; frame < before.length; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
        untouchedCurveMaxError = Math.max(untouchedCurveMaxError, Math.abs(before[frame][axis] - after[frame][axis]));
      }
    }
  }
  let untouchedRecordBytesChanged = 0;
  for (let index = 0; index < originalRecords.length; index += 1) {
    if (index === convertedRecord.index) continue;
    const before = convertedBytes.subarray(originalRecords[index].offset, originalRecords[index].offset + originalRecords[index].length);
    const afterRecord = outLayout.records[index];
    const after = output.subarray(afterRecord.offset, afterRecord.offset + afterRecord.length);
    if (!before.equals(after)) untouchedRecordBytesChanged += 1;
  }
  anchorError = vectorError(outRoot[0], nativeRoot);
  if (displacementError > 0.01 || anchorError > 0.01 || inverseOriginError > 0.01 || rotationUntouchedError > 1e-7 || groupReadbackMaxError > 0.01 || untouchedCurveMaxError !== 0 || untouchedRecordBytesChanged !== 0) {
    throw new Error(`readback failed: displacement=${displacementError}, anchor=${anchorError}, inverseOrigin=${inverseOriginError}, rotation=${rotationUntouchedError}, quantization=${groupReadbackMaxError}, untouchedCurves=${untouchedCurveMaxError}, untouchedRecords=${untouchedRecordBytesChanged}`);
  }
  return {
    output,
    report: {
      schema: 'aurora-forge/root-origin-native-start-rebase/v1',
      inputs: {
        convertedSha256: sha256(convertedBytes), nativeSha256: sha256(nativeBytes),
        convertedRecordId: convertedRecord.id, nativeRecordId: nativeRecord.id,
        convertedFrames: convertedRecord.frameValue, nativeFrames: nativeRecord.frameValue,
        rootIndex, originIndex, rootId: ROOT_ID, originId: ORIGIN_ID,
      },
      transform: 'Subtract converted J_Root frame-zero minus native same-motion J_Root frame-zero from every J_Root position sample; recompute J_anim_origin position as inverse(J_Root rotation) applied to negative rebased J_Root position. Preserve root/origin rotations and all other groups.',
      nativeRootFrameZero: nativeRoot,
      convertedRootFrameZeroBefore: rootBefore[0],
      convertedRootFrameZeroAfter: outRoot[0],
      translationDeltaRemoved: delta,
      maxErrors: { rootDisplacementPreservation: displacementError, nativeFrameZeroAnchor: anchorError, inverseOriginEquation: inverseOriginError, rootAndOriginRotationPreservation: rotationUntouchedError, reencodedCurveQuantization: groupReadbackMaxError, untouchedBodyCurves: untouchedCurveMaxError },
      untouchedRecordBytesChanged,
      changedPositionGroups: [
        { trackId: ROOT_ID, trackIndex: rootIndex, group: 0 },
        { trackId: ORIGIN_ID, trackIndex: originIndex, group: 0 },
      ],
      changedDescriptorCount: descriptorChanges.length,
      descriptorChanges,
      outputSha256: sha256(output),
      limits: ['This is an offline placement diagnostic, not proof of the runtime Ring anchor.', 'The source root displacement sequence is preserved, but absolute clip-local placement changes by the measured frame-zero delta.'],
      pass: true,
    },
  };
}

function run(argv) {
  const get = name => { const i = argv.indexOf(name); return i < 0 ? '' : argv[i + 1]; };
  const convertedPath = get('--converted'), nativePath = get('--native'), outPath = get('--out'), reportPath = get('--report');
  if (!convertedPath || !nativePath || !outPath || !reportPath) throw new Error('Usage: node rebase-root-origin-to-native-start.js --converted <clips> --native <native-same-motion-clips> --out <new-clips> --report <new-report.json>');
  for (const destination of [outPath, reportPath]) if (fs.existsSync(destination)) throw new Error(`refusing to overwrite ${destination}`);
  const convertedBytes = fs.readFileSync(convertedPath), nativeBytes = fs.readFileSync(nativePath);
  const convertedLayout = parse(convertedBytes, { includeRaw: false }), nativeLayout = parse(nativeBytes, { includeRaw: false });
  const convertedHits = convertedLayout.records.filter(record => record.trackIdentifiers.length === 64 && record.trackIdentifiers.includes(ROOT_ID) && record.trackIdentifiers.includes(ORIGIN_ID));
  if (convertedHits.length !== 1) throw new Error(`expected one converted 64-track body record, found ${convertedHits.length}`);
  const convertedRecord = convertedHits[0];
  const nativeRoot = uniqueTrack(nativeLayout, ROOT_ID, 'native motion');
  if (nativeRoot.record.frameValue < 1) throw new Error('native root track has no frames');
  const result = rebase(convertedBytes, convertedRecord, nativeBytes, nativeRoot.record, convertedRecord.trackIdentifiers.indexOf(ROOT_ID), convertedRecord.trackIdentifiers.indexOf(ORIGIN_ID));
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(outPath, result.output, { flag: 'wx' });
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...result.report, outputPath: path.resolve(outPath) }, null, 2)}\n`, { flag: 'wx' });
  return { outputPath: path.resolve(outPath), reportPath: path.resolve(reportPath), ...result.report };
}

if (require.main === module) {
  try {
    const result = run(process.argv.slice(2));
    console.log(JSON.stringify({ outputPath: result.outputPath, reportPath: result.reportPath, inputRoot: result.convertedRootFrameZeroBefore, outputRoot: result.convertedRootFrameZeroAfter, nativeRoot: result.nativeRootFrameZero, deltaRemoved: result.translationDeltaRemoved, maxErrors: result.maxErrors, outputSha256: result.outputSha256, pass: result.pass }, null, 2));
  } catch (error) { console.error(`Root-origin rebase failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { rebase, run };
