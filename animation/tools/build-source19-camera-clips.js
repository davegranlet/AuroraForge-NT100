'use strict';

// Convert a measured 2K19 Camera01/target pair into the three-track 2K26 c0
// record. The target-only third channel is retained by decoding and re-encoding
// its existing series. Source pair identities match the validated entrance
// converter; this writer accepts one measured YANM section, not arbitrary rigs.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('./yanm-keyframes');
const { rotationFrames, positionFrames, halfLog } = require('./decode-2k19-entrance-source');
const { parseFile, build, clipNameId } = require('./clips-layout');
const { encodeDenseGroup } = require('./clips-codec/encode-dense-group');
const { concatWriters } = require('./clips-codec/concat-writers');
const { parseClipsRecord } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');

const SOURCE_TRACK_IDS = ['5edfdf5f', '70d146a5'];
const TARGET_CAMERA_NAME = '6100_00_c0';
const SCALE = { position: -10, rotation: -23, targetAux: -17 };

function descriptor(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera series');
  if (lo === hi) return { scale: 0, width: 0, rest: lo };
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  const width = Math.max(1, Math.ceil(Math.log2(Math.ceil((hi - rest) / step) + 1)));
  if (width > 31) throw new Error('Camera series exceeds target descriptor range');
  return { scale, width, rest };
}

function descriptorsFor(rows, scale) {
  return [0, 1, 2].map((c) => descriptor(rows.map((r) => r[c]), scale));
}

function readRecordSeries(file, recordIndex) {
  const parsed = parseClipsRecord(file, recordIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const frames = parsed.rec.frameValue;
  const result = parsed.bones.map((bone) => {
    const descs = readTrackDescriptors({ rec: parsed.rec }, bone.track);
    const groups = [];
    for (let gi = 0; gi < 2; gi++) {
      const groupDescriptors = descs.slice(gi * 3, gi * 3 + 3);
      const timing = bone.groups[gi];
      const decoded = evalGroup(stream, timing, groupDescriptors, frames);
      groups.push(decoded || Array.from({ length: frames }, () => groupDescriptors.map((d) => d.rest)));
    }
    return groups;
  });
  return { parsed, groups: result };
}

function maxError(actual, expected) {
  if (actual.length !== expected.length) throw new Error('Readback series length mismatch');
  let max = 0;
  for (let f = 0; f < actual.length; f++) {
    for (let c = 0; c < 3; c++) max = Math.max(max, Math.abs(actual[f][c] - expected[f][c]));
  }
  return max;
}

function convertSourceCameraRecord({ sourcePath, templatePath, outputPath, targetRecordIndex, expectedTargetId }) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const sections = decode(sourceBytes);
  if (sections.length !== 1 || sections[0].tracks.length !== 2) throw new Error('Expected one 2-track 2K19 camera section');
  const section = sections[0], [camera, target] = section.tracks;
  const sourceIds = section.tracks.map((t) => t.hash.toString(16).padStart(8, '0'));
  if (sourceIds.some((id, i) => id !== SOURCE_TRACK_IDS[i])) throw new Error(`Unexpected source camera/target identities: ${sourceIds.join(', ')}`);
  if (section.tracks.some((t) => !t.supported || !t.timelineMatches || t.frameCount !== camera.frameCount || t.type !== 0x2300)) {
    throw new Error('Unsupported source camera track or mismatched timeline');
  }
  const frames = camera.frameCount + 1;
  const layout = parseFile(templatePath, { includeRaw: false });
  const targetId = expectedTargetId ?? clipNameId(TARGET_CAMERA_NAME);
  const named = layout.records.filter((r) => r.id === targetId);
  if (named.length !== 1) throw new Error(`Expected exactly one ${TARGET_CAMERA_NAME} target record`);
  const record = targetRecordIndex === undefined ? named[0] : layout.records[targetRecordIndex];
  if (!record || record.id !== targetId || record.index !== named[0].index) throw new Error('Explicit target c0 record identity mismatch');
  if (record.trackIdentifiers.length !== 3) throw new Error('Target c0 template must contain three tracks');

  const targetSeries = readRecordSeries(templatePath, record.index);
  const position0 = positionFrames(camera.secondary, camera.quantizationCandidates, camera.frameCount);
  const halfRotation0 = rotationFrames(camera.primary, camera.frameCount).map(halfLog);
  const position1 = positionFrames(target.secondary, target.quantizationCandidates, target.frameCount);
  if ([position0, halfRotation0, position1].some((x) => x.length !== frames)) throw new Error('Source camera conversion did not preserve every source sample');
  const identityRotation = Array.from({ length: frames }, () => [0, 0, 0]);
  const desired = [
    [position0, halfRotation0],
    [position1, identityRotation],
    targetSeries.groups[2],
  ];

  const recordBytes = fs.readFileSync(templatePath);
  const section78 = record.sections.find((s) => s.name === 'group78 descriptors');
  if (!section78 || section78.count !== 18) throw new Error('Unexpected target c0 descriptor layout');
  const descriptorOffset = parseInt(section78.relativeOffset, 16);
  const prefix = Buffer.from(recordBytes.subarray(record.offset, record.offset + descriptorOffset + section78.bytes));
  const parts = [];
  const errorReport = [];
  for (let track = 0; track < 3; track++) {
    for (let group = 0; group < 2; group++) {
      const rows = desired[track][group];
      if (rows.length !== frames) throw new Error(`Track ${track} group ${group} has ${rows.length} samples, expected ${frames}`);
      const scale = track === 2 ? SCALE.targetAux : group === 0 ? SCALE.position : SCALE.rotation;
      const descs = descriptorsFor(rows, scale);
      descs.forEach((d, c) => {
        const at = descriptorOffset + (track * 6 + group * 3 + c) * 8;
        prefix.writeInt8(d.scale, at);
        prefix.writeUInt8(d.width, at + 1);
        prefix.writeFloatLE(d.rest, at + 4);
      });
      const encoded = encodeDenseGroup(rows, descs);
      if (encoded.clampCount) throw new Error(`Camera track ${track} group ${group} clamped ${encoded.clampCount} values`);
      parts.push(encoded);
    }
  }
  const writer = concatWriters(parts), bits = writer.bitLength(), packed = writer.flush();
  const stream = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(frames, 0x44);
  prefix.writeUInt32LE(stream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bits / 64), 0x94);
  prefix.writeUInt32LE(bits, 0x9c);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, build([Buffer.concat([prefix, stream])]));

  const output = readRecordSeries(outputPath, 0);
  const readbackErrors = [];
  for (let t = 0; t < 3; t++) for (let g = 0; g < 2; g++) {
    const err = maxError(output.groups[t][g], desired[t][g]);
    readbackErrors.push({ track: t, group: g, maxError: err });
    const limit = t === 2 ? 2 ** SCALE.targetAux : g === 0 ? 2 ** SCALE.position : 2 ** SCALE.rotation;
    if (err > limit * 0.5001) throw new Error(`Camera track ${t} group ${g} readback error ${err} exceeds half-step ${limit / 2}`);
  }
  if (output.parsed.rec.id !== targetId || output.parsed.rec.frameValue !== frames ||
      output.parsed.rec.trackIdentifiers.some((id, i) => id !== record.trackIdentifiers[i])) {
    throw new Error('Encoded c0 record changed target identity, track set, or source timeline');
  }
  return {
    schema: 'aurora-forge/source19-camera-to-2k26-c0/v1',
    sourcePath,
    sourceSha256: require('node:crypto').createHash('sha256').update(sourceBytes).digest('hex').toUpperCase(),
    sourceTrackIds: sourceIds,
    sourceFrames: camera.frameCount,
    outputSamples: frames,
    targetName: TARGET_CAMERA_NAME,
    targetRecord: record.index,
    targetRecordId: targetId,
    targetTrackIds: record.trackIdentifiers,
    outputPath,
    readbackErrors,
    provenance: {
      track0: '2K19 Camera01 position and rotation -> 2K26 c0 track0; mapping matches validated entrance camera workflow',
      track1: '2K19 paired target position -> 2K26 c0 track1; target rotation retained as identity per validated entrance workflow',
      track2: '2K26 target template auxiliary channel retained by decoded series; no 2K19 source mapping claimed',
    },
    limits: ['Source ADefs/event/director timing is not converted by this record builder.', 'The camera consumer mapping is reused from the validated entrance conversion; Victory runtime behavior remains unverified.'],
  };
}

module.exports = { convertSourceCameraRecord, readRecordSeries };

