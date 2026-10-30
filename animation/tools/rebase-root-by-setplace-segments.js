'use strict';

// Diagnostic-only piecewise J_Root placement rebasing. At each verified
// SetPlace boundary, align the converted performer root to the matching
// native same-motion root sample, preserve within-phase displacement, and
// recompute J_anim_origin. This does not assert how the runtime applies the
// Arena parent transform; owner playback remains the deciding evidence.
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
const ROOT_EVENT_NAME = new Map([
  ['15918620684168842987', 'Ring'],
  ['15450437353215810800', 'Corner'],
]);

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
function recordForTrack(layout, id, label) {
  const hits = layout.records.flatMap(record => {
    const index = record.trackIdentifiers.indexOf(id);
    return index < 0 ? [] : [{ record, index }];
  });
  if (hits.length !== 1) throw new Error(`${label}: expected one ${id} record, found ${hits.length}`);
  return hits[0];
}
function readGroup(bytes, record, trackIndex, groupIndex) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const values = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue);
  return values ?? Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest));
}
function frameValue(series, frame) {
  const clamped = Math.max(0, Math.min(series.length - 1, frame));
  const lo = Math.floor(clamped), hi = Math.min(series.length - 1, lo + 1), t = clamped - lo;
  return series[lo].map((value, axis) => value + (series[hi][axis] - value) * t);
}
function readSetPlace(modelPath) {
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const events = (model.events || []).filter(event => event.command === 'SetPlace').flatMap(event =>
    (event.triggerFrames || []).map(frame => {
      const value = event.arguments?.find(arg => arg.name === 'Place')?.value;
      return { frame, value: String(value), name: ROOT_EVENT_NAME.get(String(value)) || null };
    }));
  events.sort((a, b) => a.frame - b.frame);
  if (events.length < 2 || events.some(event => !Number.isFinite(event.frame) || !event.name)) {
    throw new Error(`${modelPath}: expected ordered SetPlace events with known Ring/Corner values`);
  }
  return events;
}

function rebase(convertedBytes, nativeBytes, convertedRecord, nativeRecord, rootIndex, originIndex, nativeEvents, convertedEvents) {
  if (nativeEvents.length !== convertedEvents.length || nativeEvents.some((e, i) => e.value !== convertedEvents[i].value)) {
    throw new Error('native and converted SetPlace event count/order differ');
  }
  const raw = Buffer.from(convertedBytes.subarray(convertedRecord.offset, convertedRecord.offset + convertedRecord.length));
  const parsed = parseClipsRecordBuffer(convertedBytes, convertedRecord.index);
  const descriptorBase = Number.parseInt(convertedRecord.sections.find(section => section.name === 'group78 descriptors').relativeOffset, 16);
  const streamSection = convertedRecord.sections.find(section => section.name === 'group90');
  const streamBase = Number.parseInt(streamSection.relativeOffset, 16);
  const stream = raw.subarray(streamBase, streamBase + streamSection.bytes);
  const frameCount = convertedRecord.frameValue;
  const nativeRoot = readGroup(nativeBytes, nativeRecord, nativeRecord.trackIdentifiers.indexOf(ROOT_ID), 0);
  const rootBefore = readGroup(convertedBytes, convertedRecord, rootIndex, 0);
  const rootRotation = readGroup(convertedBytes, convertedRecord, rootIndex, 1);
  const originRotation = readGroup(convertedBytes, convertedRecord, originIndex, 1);

  const segments = nativeEvents.map((event, index) => {
    const convertedEvent = convertedEvents[index];
    const nativeFrame = Math.max(0, Math.min(nativeRecord.frameValue - 1, event.frame));
    const convertedFrame = Math.max(0, Math.min(frameCount - 1, convertedEvent.frame));
    const n = frameValue(nativeRoot, nativeFrame), c = frameValue(rootBefore, convertedFrame);
    const delta = c.map((value, axis) => value - n[axis]);
    // A fractional event frame is interpolated between its neighboring
    // samples, so start the new placement segment at floor(frame) to apply
    // one constant correction to both samples used at the transition.
    const start = Math.max(0, Math.min(frameCount - 1, Math.floor(convertedFrame)));
    const nextFrame = convertedEvents[index + 1]?.frame ?? frameCount;
    const endExclusive = Math.max(start + 1, Math.min(frameCount, Math.floor(nextFrame)));
    return { index, name: event.name, nativeFrame, convertedFrame, start, endExclusive, delta,
      nativeRootAtBoundary: n, convertedRootAtBoundary: c };
  });

  const rootAfter = rootBefore.map(row => [...row]);
  for (const segment of segments) {
    for (let frame = segment.start; frame < segment.endExclusive; frame += 1) {
      rootAfter[frame] = rootAfter[frame].map((value, axis) => value - segment.delta[axis]);
    }
  }
  const originAfter = rootAfter.map((position, frame) =>
    rotate(inverse(quaternionFromHalfLog(rootRotation[frame])), position.map(value => -value)));

  const reader = new (require('./clips-codec/bit-reader').BitReader)(stream);
  const descriptors = Array.from({ length: convertedRecord.sections.find(section => section.name === 'group78 descriptors').count }, (_, i) => readDescriptor(raw, descriptorBase + i * 8));
  const writers = [], descriptorChanges = [];
  const changedGroups = new Set([[rootIndex, 0].join(':'), [originIndex, 0].join(':')]);
  let quantizationMaxError = 0;
  for (let track = 0; track < convertedRecord.trackIdentifiers.length; track += 1) {
    for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
      const first = track * 6 + groupIndex * 3;
      const channelDescriptors = descriptors.slice(first, first + 3);
      const timing = parseTimingGroup(reader, frameCount, channelDescriptors.map(d => d.width));
      if (!changedGroups.has(`${track}:${groupIndex}`)) {
        writers.push(copyBits(stream, timing.start, timing.end));
        continue;
      }
      const rows = track === rootIndex ? rootAfter : originAfter;
      const fitted = channelDescriptors.map((d, axis) => fitDescriptor(rows.map(row => row[axis]), d));
      const encoded = encodeDenseGroup(rows, fitted);
      if (encoded.clampCount) throw new Error(`clamps encoding track ${track} group ${groupIndex}: ${encoded.clampCount}`);
      for (let axis = 0; axis < 3; axis += 1) {
        const actual = fitted[axis].width ? rows.map(row => fitted[axis].rest + Math.round((row[axis] - fitted[axis].rest) / (2 ** fitted[axis].scale)) * (2 ** fitted[axis].scale)) : rows.map(() => fitted[axis].rest);
        for (let frame = 0; frame < frameCount; frame += 1) quantizationMaxError = Math.max(quantizationMaxError, Math.abs(actual[frame] - rows[frame][axis]));
        const at = descriptorBase + (first + axis) * 8, before = descriptors[first + axis], after = fitted[axis];
        if (before.scale !== after.scale || before.width !== after.width || before.rest !== after.rest) {
          raw.writeInt8(after.scale, at); raw.writeUInt8(after.width, at + 1); raw.writeFloatLE(after.rest, at + 4);
          descriptorChanges.push({ trackId: convertedRecord.trackIdentifiers[track], group: groupIndex, axis, before, after });
        }
      }
      writers.push(encoded);
    }
  }
  const boneWriter = concatWriters(writers), tail = copyBits(stream, reader.pos, stream.length * 8);
  const combined = concatWriters([boneWriter, tail]), usedBits = combined.bitLength(), packed = combined.flush();
  const newStream = Buffer.concat([packed, Buffer.alloc((8 - (packed.length % 8)) % 8)]);
  const prefix = Buffer.from(raw.subarray(0, streamBase));
  prefix.writeUInt32LE(newStream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
  prefix.writeUInt32LE(boneWriter.bitLength(), 0x9c);
  const outputRecord = Buffer.concat([prefix, newStream]);
  const originalRecords = parse(convertedBytes, { includeRaw: false }).records;
  const outputRecords = originalRecords.map(record => record.index === convertedRecord.index ? outputRecord : convertedBytes.subarray(record.offset, record.offset + record.length));
  const output = build(outputRecords), outLayout = parse(output, { includeRaw: false }), outRecord = outLayout.records[convertedRecord.index];
  const rootReadback = readGroup(output, outRecord, rootIndex, 0), originReadback = readGroup(output, outRecord, originIndex, 0);
  const outRootRotation = readGroup(output, outRecord, rootIndex, 1), outOriginRotation = readGroup(output, outRecord, originIndex, 1);
  let inverseOriginError = 0, rotationError = 0, segmentBoundaryError = 0, phaseDisplacementError = 0;
  const checkedSegments = segments.map(segment => {
    const n = frameValue(nativeRoot, segment.nativeFrame), c = frameValue(rootReadback, segment.convertedFrame);
    const boundaryError = Math.hypot(...c.map((value, axis) => value - n[axis]));
    segmentBoundaryError = Math.max(segmentBoundaryError, boundaryError);
    const beforeStart = rootBefore[segment.start], afterStart = rootReadback[segment.start];
    const beforeEndIndex = Math.max(segment.start, segment.endExclusive - 1);
    const beforeEnd = rootBefore[beforeEndIndex], afterEnd = rootReadback[beforeEndIndex];
    phaseDisplacementError = Math.max(phaseDisplacementError,
      ...beforeEnd.map((value, axis) => Math.abs((afterEnd[axis] - afterStart[axis]) - (value - beforeStart[axis]))));
    return { ...segment, correctedRootAtBoundary: c, boundaryError,
      originalRootDisplacement: beforeEnd.map((value, axis) => value - beforeStart[axis]),
      correctedRootDisplacement: afterEnd.map((value, axis) => value - afterStart[axis]) };
  });
  for (let frame = 0; frame < frameCount; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
    const expectedOrigin = rotate(inverse(quaternionFromHalfLog(outRootRotation[frame])), rootReadback[frame].map(value => -value));
    inverseOriginError = Math.max(inverseOriginError, Math.abs(originReadback[frame][axis] - expectedOrigin[axis]));
    rotationError = Math.max(rotationError, Math.abs(outRootRotation[frame][axis] - rootRotation[frame][axis]), Math.abs(outOriginRotation[frame][axis] - originRotation[frame][axis]));
  }
  let untouchedCurveMaxError = 0, untouchedRecordBytesChanged = 0;
  for (let track = 0; track < convertedRecord.trackIdentifiers.length; track += 1) for (let group = 0; group < 2; group += 1) {
    if (changedGroups.has(`${track}:${group}`)) continue;
    const before = readGroup(convertedBytes, convertedRecord, track, group), after = readGroup(output, outRecord, track, group);
    for (let frame = 0; frame < before.length; frame += 1) for (let axis = 0; axis < 3; axis += 1) untouchedCurveMaxError = Math.max(untouchedCurveMaxError, Math.abs(before[frame][axis] - after[frame][axis]));
  }
  for (const record of originalRecords) if (record.index !== convertedRecord.index) {
    const before = convertedBytes.subarray(record.offset, record.offset + record.length), out = outLayout.records[record.index];
    if (!before.equals(output.subarray(out.offset, out.offset + out.length))) untouchedRecordBytesChanged++;
  }
  if (segmentBoundaryError > 0.02 || phaseDisplacementError > 0.02 || inverseOriginError > 0.02 || rotationError > 1e-7 || quantizationMaxError > 0.02 || untouchedCurveMaxError !== 0 || untouchedRecordBytesChanged !== 0) {
    throw new Error(`readback failed: boundary=${segmentBoundaryError}, phaseDisplacement=${phaseDisplacementError}, inverseOrigin=${inverseOriginError}, rotation=${rotationError}, quantization=${quantizationMaxError}, untouchedCurves=${untouchedCurveMaxError}, untouchedRecords=${untouchedRecordBytesChanged}`);
  }
  return { output, report: {
    schema: 'aurora-forge/setplace-segment-root-rebase/v1',
    inputs: { convertedSha256: sha256(convertedBytes), nativeSha256: sha256(nativeBytes),
      convertedRecordId: convertedRecord.id, nativeRecordId: nativeRecord.id, frameCount,
      rootIndex, originIndex, rootId: ROOT_ID, originId: ORIGIN_ID },
    method: 'At each converted SetPlace boundary, subtract the converted-minus-native J_Root position difference for that matching named place until the next SetPlace boundary. Recompute inverse J_anim_origin from the rebased root and unchanged root rotation. Preserve within-phase root displacement and all other curves/records.',
    segments: checkedSegments,
    maxErrors: { setPlaceBoundary: segmentBoundaryError, withinPhaseDisplacement: phaseDisplacementError,
      inverseOrigin: inverseOriginError, rotations: rotationError, quantization: quantizationMaxError,
      untouchedCurves: untouchedCurveMaxError, untouchedRecords: untouchedRecordBytesChanged },
    changedPositionGroups: [{ trackId: ROOT_ID, trackIndex: rootIndex, group: 0 }, { trackId: ORIGIN_ID, trackIndex: originIndex, group: 0 }],
    changedDescriptorCount: descriptorChanges.length, descriptorChanges, outputSha256: sha256(output),
    limits: ['Diagnostic hypothesis only: aligning local root at named SetPlace transitions may not equal the runtime Arena component transform.', 'Does not prove source visual fidelity or runtime placement.'], pass: true,
  } };
}

function run(argv) {
  const get = name => { const i = argv.indexOf(name); return i < 0 ? '' : argv[i + 1]; };
  const convertedPath = get('--converted'), nativePath = get('--native'), nativeModelPath = get('--native-events'), convertedModelPath = get('--converted-events'), outPath = get('--out'), reportPath = get('--report');
  if (![convertedPath, nativePath, nativeModelPath, convertedModelPath, outPath, reportPath].every(Boolean)) {
    throw new Error('Usage: node rebase-root-by-setplace-segments.js --converted <clips> --native <clips> --native-events <map.json> --converted-events <map.json> --out <new-clips> --report <new-report.json>');
  }
  for (const destination of [outPath, reportPath]) if (fs.existsSync(destination)) throw new Error(`refusing to overwrite ${destination}`);
  const convertedBytes = fs.readFileSync(convertedPath), nativeBytes = fs.readFileSync(nativePath);
  const convertedLayout = parse(convertedBytes, { includeRaw: false }), nativeLayout = parse(nativeBytes, { includeRaw: false });
  const convertedBody = convertedLayout.records.filter(record => record.trackIdentifiers.length === 64 && record.trackIdentifiers.includes(ROOT_ID) && record.trackIdentifiers.includes(ORIGIN_ID));
  if (convertedBody.length !== 1) throw new Error(`expected one converted 64-track body record, found ${convertedBody.length}`);
  const nativeHit = recordForTrack(nativeLayout, ROOT_ID, 'native Victory');
  const convertedEvents = readSetPlace(convertedModelPath), nativeEvents = readSetPlace(nativeModelPath);
  const result = rebase(convertedBytes, nativeBytes, convertedBody[0], nativeHit.record,
    convertedBody[0].trackIdentifiers.indexOf(ROOT_ID), convertedBody[0].trackIdentifiers.indexOf(ORIGIN_ID), nativeEvents, convertedEvents);
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(outPath, result.output, { flag: 'wx' });
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...result.report, outputPath: path.resolve(outPath) }, null, 2)}\n`, { flag: 'wx' });
  return { outputPath: path.resolve(outPath), reportPath: path.resolve(reportPath), ...result.report };
}

if (require.main === module) {
  try {
    const result = run(process.argv.slice(2));
    console.log(JSON.stringify({ outputPath: result.outputPath, reportPath: result.reportPath,
      segments: result.segments.map(segment => ({ name: segment.name, nativeFrame: segment.nativeFrame,
        convertedFrame: segment.convertedFrame, delta: segment.delta, boundaryError: segment.boundaryError })),
      maxErrors: result.maxErrors, outputSha256: result.outputSha256, pass: result.pass }, null, 2));
  } catch (error) { console.error(`SetPlace segment rebase failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { readSetPlace, rebase, run };
