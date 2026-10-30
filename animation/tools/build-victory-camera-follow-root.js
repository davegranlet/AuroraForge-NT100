'use strict';

// Rebuild a Victory c0 camera record so its camera and look-at paths follow a
// converted body root, using the matching native Victory motion's relative
// camera composition. The target clip's root/body and all non-c0 records are
// preserved byte-for-byte.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { build, parse, parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');
const { encodeDenseGroup } = require('./clips-codec/encode-dense-group');
const { concatWriters } = require('./clips-codec/concat-writers');
const { multiply, inverse, rotate } = require('./decode-2k19-entrance-source');

const ROOT_TRACK_ID = '0x1F4DA262FC146772';
const CAMERA_TRACK_IDS = [
  '0x54D1B2A64667E32E', // camera position / orientation
  '0x5A3744A0D6E080B1', // camera look-at position
  '0x188FD8CF51F19C95', // native c0 auxiliary channel
];
const SCALE = { position: -10, rotation: -23, auxiliary: -17 };

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function groupDescriptors(parsed, track, group) {
  return [0, 1, 2].map((axis) => {
    const item = parsed.rec.raw.group78[track * 6 + group * 3 + axis];
    if (!item) throw new Error(`Missing Group78 descriptor: track ${track}, group ${group}, axis ${axis}`);
    return {
      scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0),
      width: Number.parseInt(item.hex.slice(2, 4), 16),
      rest: item.candidate.f32le[1],
    };
  });
}

function readRecord(fileBytes, record) {
  const parsed = parseClipsRecordBuffer(fileBytes, record.index);
  const stream = fileBytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = record.trackIdentifiers.map((trackId, track) => ({
    id: trackId,
    groups: [0, 1].map((group) => {
      const descriptors = groupDescriptors(parsed, track, group);
      return evalGroup(stream, parsed.bones[track].groups[group], descriptors, record.frameValue)
        || Array.from({ length: record.frameValue }, () => descriptors.map((d) => d.rest));
    }),
  }));
  return { parsed, tracks };
}

function sample(series, normalized) {
  const x = Math.max(0, Math.min(1, normalized)) * (series.length - 1);
  const lo = Math.floor(x), hi = Math.min(series.length - 1, lo + 1), t = x - lo;
  return series[lo].map((v, axis) => v + (series[hi][axis] - v) * t);
}

function rotationVectorToQuaternion(vector) {
  const angle = Math.hypot(...vector);
  if (angle < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(angle) / angle;
  return [Math.cos(angle), vector[0] * s, vector[1] * s, vector[2] * s];
}

function quaternionToRotationVector(q) {
  const length = Math.hypot(q[1], q[2], q[3]);
  if (length < 1e-12) return [0, 0, 0];
  const halfAngle = Math.atan2(length, q[0]);
  return q.slice(1).map((v) => v * halfAngle / length);
}

function normalize(v) {
  const length = Math.hypot(...v);
  if (length < 1e-12) throw new Error('Cannot normalize a zero camera direction');
  return v.map((value) => value / length);
}

function shortestArc(from, to) {
  const a = normalize(from), b = normalize(to);
  const dot = Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0)));
  if (dot > 1 - 1e-10) return [1, 0, 0, 0];
  if (dot < -1 + 1e-10) {
    const helper = Math.abs(a[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    const axis = normalize([a[1] * helper[2] - a[2] * helper[1], a[2] * helper[0] - a[0] * helper[2], a[0] * helper[1] - a[1] * helper[0]]);
    return [0, ...axis];
  }
  const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const q = [1 + dot, ...cross];
  const length = Math.hypot(...q);
  return q.map((value) => value / length);
}

function descriptor(values, scale) {
  let low = Infinity, high = -Infinity;
  for (const row of values) for (const value of row) {
    if (!Number.isFinite(value)) throw new Error('Non-finite camera sample');
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  if (low === high) return { scale: 0, width: 0, rest: low };
  const step = 2 ** scale;
  const rest = Math.floor(low / step) * step;
  const width = Math.max(1, Math.ceil(Math.log2(Math.ceil((high - rest) / step) + 1)));
  if (width > 31) throw new Error(`Camera series exceeds descriptor range at scale ${scale}`);
  return { scale, width, rest };
}

function encodeRecord(targetBytes, targetRecord, targetData, nativeData, bodyRoot, bodyRotation, frameCount, cameraSpace) {
  const section = targetRecord.sections.find((item) => item.name === 'group78 descriptors');
  if (!section || section.count !== 18) throw new Error('c0 target must have exactly 18 Group78 descriptors');
  const descriptorOffset = Number.parseInt(section.relativeOffset.slice(2), 16);
  const prefix = Buffer.from(targetBytes.subarray(targetRecord.offset, targetRecord.offset + descriptorOffset + section.bytes));
  const desired = targetRecord.trackIdentifiers.map((trackId, track) => {
    if (track < 2) {
      const nativeIndex = nativeData.camera.trackIdentifiers.indexOf(CAMERA_TRACK_IDS[track]);
      const nativeBodyIndex = nativeData.bodyRecord.trackIdentifiers.indexOf(ROOT_TRACK_ID);
      const targetRoot = bodyRoot;
      const nativeCamera = nativeData.cameraData.tracks[nativeIndex];
      const nativeRoot = nativeData.bodyData.tracks[nativeBodyIndex];
      const position = Array.from({ length: frameCount }, (_, frame) => {
        const n = frame / Math.max(1, frameCount - 1);
        const root = targetRoot[frame];
        const nativeRootPosition = sample(nativeRoot.groups[0], n);
        const relative = sample(nativeCamera.groups[0], n).map((v, axis) => v - nativeRootPosition[axis]);
        if (cameraSpace === 'source-bearing-native-radius') {
          const sourceRelative = targetData.tracks[track].groups[0][frame].map((v, axis) => v - root[axis]);
          const sourceLength = Math.hypot(...sourceRelative);
          if (sourceLength < 1e-8) throw new Error(`Source camera/target track ${track} intersects J_Root at frame ${frame}`);
          const nativeLength = Math.hypot(...relative);
          return root.map((v, axis) => v + sourceRelative[axis] / sourceLength * nativeLength);
        }
        if (cameraSpace === 'aim-at-target') return targetData.tracks[track].groups[0][frame];
        if (cameraSpace === 'actor-root-rigid') {
          const nativeRootRotation = rotationVectorToQuaternion(sample(nativeRoot.groups[1], n));
          const targetRootRotation = rotationVectorToQuaternion(bodyRotation[frame]);
          const delta = multiply(targetRootRotation, inverse(nativeRootRotation));
          const rotated = rotate(delta, relative);
          return root.map((v, axis) => v + rotated[axis]);
        }
        return root.map((v, axis) => v + relative[axis]);
      });
      const rotation = track === 0
        ? Array.from({ length: frameCount }, (_, frame) => {
          const n = frame / Math.max(1, frameCount - 1);
          if (cameraSpace === 'source-bearing-native-radius') return targetData.tracks[track].groups[1][frame];
          if (cameraSpace === 'aim-at-target') {
            const cameraPosition = targetData.tracks[0].groups[0][frame];
            const targetPosition = targetData.tracks[1].groups[0][frame];
            const towardTarget = targetPosition.map((value, axis) => value - cameraPosition[axis]);
            const sourceQ = rotationVectorToQuaternion(targetData.tracks[track].groups[1][frame]);
            const localForward = rotate(sourceQ, [0, 1, 0]);
            return quaternionToRotationVector(multiply(shortestArc(localForward, towardTarget), sourceQ));
          }
          const nativeRotation = sample(nativeCamera.groups[1], n);
          if (cameraSpace !== 'actor-root-rigid') return nativeRotation;
          const nativeRootRotation = rotationVectorToQuaternion(sample(nativeRoot.groups[1], n));
          const targetRootRotation = rotationVectorToQuaternion(bodyRotation[frame]);
          const delta = multiply(targetRootRotation, inverse(nativeRootRotation));
          return quaternionToRotationVector(multiply(delta, rotationVectorToQuaternion(nativeRotation)));
        })
        : targetData.tracks[track].groups[1];
      return [position, rotation];
    }
    // Keep the candidate's existing c0 auxiliary channel exactly at decoded
    // sample values; no semantic mapping for it is assumed.
    return targetData.tracks[track].groups;
  });

  const parts = [];
  const readbackLimits = [];
  for (let track = 0; track < 3; track += 1) for (let group = 0; group < 2; group += 1) {
    const rows = desired[track][group];
    const scale = track === 2 ? SCALE.auxiliary : group === 0 ? SCALE.position
      : (cameraSpace === 'actor-root-rigid' || cameraSpace === 'aim-at-target') && track === 0 ? -21 : SCALE.rotation;
    const descriptors = [0, 1, 2].map((axis) => descriptor(rows.map((row) => [row[axis]]), scale));
    descriptors.forEach((d, axis) => {
      const offset = descriptorOffset + (track * 6 + group * 3 + axis) * 8;
      prefix.writeInt8(d.scale, offset);
      prefix.writeUInt8(d.width, offset + 1);
      prefix.writeFloatLE(d.rest, offset + 4);
    });
    const encoded = encodeDenseGroup(rows, descriptors);
    if (encoded.clampCount) throw new Error(`c0 track ${track} group ${group} clamped ${encoded.clampCount} values`);
    parts.push(encoded);
    readbackLimits.push({ track, group, descriptors });
  }

  const writer = concatWriters(parts), bits = writer.bitLength(), packed = writer.flush();
  const stream = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(frameCount, 0x44);
  prefix.writeUInt32LE(stream.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bits / 64), 0x94);
  prefix.writeUInt32LE(bits, 0x9c);
  const recordBytes = Buffer.concat([prefix, stream]);
  const temp = build([recordBytes]);
  const decoded = parseClipsRecordBuffer(temp, 0);
  const decodedStream = temp.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const errors = [];
  for (let track = 0; track < 3; track += 1) for (let group = 0; group < 2; group += 1) {
    const expected = desired[track][group];
    const actual = evalGroup(decodedStream, decoded.bones[track].groups[group], groupDescriptors(decoded, track, group), frameCount)
      || Array.from({ length: frameCount }, () => groupDescriptors(decoded, track, group).map((d) => d.rest));
    let maxError = 0;
    for (let frame = 0; frame < frameCount; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
      maxError = Math.max(maxError, Math.abs(expected[frame][axis] - actual[frame][axis]));
    }
    const step = Math.max(...readbackLimits.find((r) => r.track === track && r.group === group).descriptors.map((d) => 2 ** d.scale));
    if (maxError > step * 0.5001) throw new Error(`c0 track ${track} group ${group} readback error ${maxError} exceeds half-step ${step / 2}`);
    errors.push({ track, group, maxError, halfStepLimit: step / 2 });
  }
  return { bytes: recordBytes, desired, errors };
}

function findRecord(parsed, id, label) {
  const matches = parsed.records.filter((record) => record.id.toUpperCase() === id.toUpperCase());
  if (matches.length !== 1) throw new Error(`${label}: expected one record ${id}, found ${matches.length}`);
  return matches[0];
}

function buildVictoryCameraFollowRoot({ nativePath, candidatePath, nativeBodyId, nativeCameraId, candidateBodyId, candidateCameraId, outputPath, cameraSpace = 'translation-only' }) {
  for (const [key, value] of Object.entries({ nativePath, candidatePath, nativeBodyId, nativeCameraId, candidateBodyId, candidateCameraId, outputPath, cameraSpace })) {
    if (!value) throw new Error(`${key} is required`);
  }
  if (!['translation-only', 'actor-root-rigid', 'source-bearing-native-radius', 'aim-at-target'].includes(cameraSpace)) throw new Error(`Unsupported cameraSpace ${cameraSpace}`);
  const nativeBytes = fs.readFileSync(nativePath), targetBytes = fs.readFileSync(candidatePath);
  const native = parse(nativeBytes, { includeRaw: false }), target = parse(targetBytes, { includeRaw: false });
  const nativeBody = findRecord(native, nativeBodyId, 'native body');
  const nativeCamera = findRecord(native, nativeCameraId, 'native c0 camera');
  const targetBody = findRecord(target, candidateBodyId, 'candidate body');
  const targetCamera = findRecord(target, candidateCameraId, 'candidate c0 camera');
  if (nativeCamera.trackIdentifiers.length !== 3 || targetCamera.trackIdentifiers.length !== 3) throw new Error('Native and candidate c0 records must both have three tracks');
  if (nativeCamera.trackIdentifiers.some((id, i) => id !== targetCamera.trackIdentifiers[i])) throw new Error('Native and candidate c0 track identities/order differ');
  if (!nativeBody.trackIdentifiers.includes(ROOT_TRACK_ID) || !targetBody.trackIdentifiers.includes(ROOT_TRACK_ID)) throw new Error(`Both body records must contain root track ${ROOT_TRACK_ID}`);
  if (nativeCamera.trackIdentifiers.some((id, i) => id !== CAMERA_TRACK_IDS[i])) throw new Error('Unexpected native c0 camera track identity order');
  if (targetCamera.frameValue !== targetBody.frameValue) throw new Error('Candidate body and c0 timelines differ');

  const nativeBodyData = readRecord(nativeBytes, nativeBody);
  const nativeCameraData = readRecord(nativeBytes, nativeCamera);
  const targetBodyData = readRecord(targetBytes, targetBody);
  const targetCameraData = readRecord(targetBytes, targetCamera);
  const nativeBundle = {
    bodyRecord: nativeBody,
    camera: nativeCamera,
    bodyData: nativeBodyData,
    cameraData: nativeCameraData,
  };
  const rootIndex = targetBody.trackIdentifiers.indexOf(ROOT_TRACK_ID);
  const candidateRoot = targetBodyData.tracks[rootIndex].groups[0];
  const candidateRootRotation = targetBodyData.tracks[rootIndex].groups[1];
  const generated = encodeRecord(targetBytes, targetCamera, targetCameraData, nativeBundle, candidateRoot, candidateRootRotation, targetBody.frameValue, cameraSpace);

  const recordPayloads = target.records.map((record, index) => index === targetCamera.index
    ? generated.bytes
    : Buffer.from(targetBytes.subarray(record.offset, record.offset + record.length)));
  const output = build(recordPayloads);
  const verified = parse(output, { includeRaw: false });
  if (verified.count !== target.count) throw new Error('Container record count changed');
  for (let index = 0; index < verified.count; index += 1) {
    const actual = output.subarray(verified.records[index].offset, verified.records[index].offset + verified.records[index].length);
    if (index === targetCamera.index) {
      if (!actual.equals(generated.bytes)) throw new Error('c0 record readback mismatch');
    } else {
      const expected = targetBytes.subarray(target.records[index].offset, target.records[index].offset + target.records[index].length);
      if (!actual.equals(expected)) throw new Error(`Non-camera record ${index} changed`);
    }
  }

  const outputPathResolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(outputPathResolved), { recursive: true });
  fs.writeFileSync(outputPathResolved, output, { flag: 'wx' });
  const report = {
    schema: 'aurora-forge/victory-camera-follow-root/v1',
    native: { path: path.resolve(nativePath), sha256: sha256(nativeBytes), bodyRecord: nativeBody.id, cameraRecord: nativeCamera.id, frames: nativeBody.frameValue },
    candidate: { path: path.resolve(candidatePath), sha256: sha256(targetBytes), bodyRecord: targetBody.id, cameraRecord: targetCamera.id, frames: targetBody.frameValue },
    rootTrackId: ROOT_TRACK_ID,
    cameraTrackIds: CAMERA_TRACK_IDS,
    cameraSpace,
    cameraRule: cameraSpace === 'source-bearing-native-radius'
      ? 'Preserve the converted source camera and target bearing relative to the converted J_Root at every frame, but set each camera/target radius to the corresponding native 2K26 Victory 6100 camera/target radius. Preserve source camera rotation and target rotation; apply no body/root transform.'
      : cameraSpace === 'aim-at-target'
      ? 'Preserve converted camera and target positions and auxiliary data. Correct only camera orientation by the shortest quaternion arc that aligns local +Y with the per-frame target-minus-camera vector; native Victory 6100 rotation-to-target alignment supports this axis (0.30 degree mean error). Preserve target rotation and all body/events.'
      : cameraSpace === 'actor-root-rigid'
      ? 'Convert native camera and look-at positions from native-root world space to root-local space, then apply the relative root rotation and translation to the converted body. Compose native camera orientation by the same root-rotation delta; retain target orientation and auxiliary data.'
      : 'Use native Victory 6100 camera and look-at positions relative to its own body-root path; resample those relative paths over the candidate motion duration and add them to the converted body root. Keep candidate camera auxiliary track and target rotation unchanged.',
    output: { path: outputPathResolved, bytes: output.length, sha256: sha256(output), onlyCameraRecordChanged: true },
    cameraReadbackErrors: generated.errors,
    limits: ['This is a camera-placement diagnostic, not runtime proof.', 'Candidate body records, choreography, event graph, and all non-c0 clip records are byte-preserved.'],
  };
  const reportPath = `${outputPathResolved}.report.json`;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? '' : process.argv[index + 1];
}

if (require.main === module) {
  try {
    const report = buildVictoryCameraFollowRoot({
      nativePath: option('--native'), candidatePath: option('--candidate'),
      nativeBodyId: option('--native-body-id'), nativeCameraId: option('--native-camera-id'),
      candidateBodyId: option('--candidate-body-id'), candidateCameraId: option('--candidate-camera-id'),
      outputPath: option('--out'), cameraSpace: option('--camera-space') || 'translation-only',
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`build-victory-camera-follow-root failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildVictoryCameraFollowRoot };
