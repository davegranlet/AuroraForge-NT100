'use strict';

// Independently verify actor-root rigid camera adaptation against a native
// Victory clip and a candidate pair of clips containers.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');
const { multiply, inverse, rotate } = require('./decode-2k19-entrance-source');

const ROOT_TRACK_ID = '0x1F4DA262FC146772';
const CAMERA_TRACK_IDS = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1', '0x188FD8CF51F19C95'];

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function toQuaternion(v) {
  const a = Math.hypot(...v);
  if (a < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(a) / a;
  return [Math.cos(a), v[0] * s, v[1] * s, v[2] * s];
}
function angularError(a, b) {
  const d = Math.min(1, Math.abs(a.reduce((sum, v, i) => sum + v * b[i], 0)));
  return 2 * Math.acos(d);
}
function sample(rows, normalized) {
  const x = Math.max(0, Math.min(1, normalized)) * (rows.length - 1);
  const lo = Math.floor(x), hi = Math.min(rows.length - 1, lo + 1), t = x - lo;
  return rows[lo].map((v, axis) => v + (rows[hi][axis] - v) * t);
}
function recordData(bytes, record) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = record.trackIdentifiers.map((id, ti) => ({ id, groups: [0, 1].map((group) => {
    const descriptors = [0, 1, 2].map((axis) => {
      const item = parsed.rec.raw.group78[ti * 6 + group * 3 + axis];
      return { scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0), width: Number.parseInt(item.hex.slice(2, 4), 16), rest: item.candidate.f32le[1] };
    });
    return evalGroup(stream, parsed.bones[ti].groups[group], descriptors, record.frameValue)
      || Array.from({ length: record.frameValue }, () => descriptors.map((d) => d.rest));
  }) }));
  return tracks;
}
function getRecord(layout, id, label) {
  const matches = layout.records.filter((r) => r.id.toUpperCase() === id.toUpperCase());
  if (matches.length !== 1) throw new Error(`${label}: expected unique record ${id}, found ${matches.length}`);
  return matches[0];
}
function payload(bytes, record) { return bytes.subarray(record.offset, record.offset + record.length); }

function verify({ nativePath, beforePath, afterPath, nativeBodyId, nativeCameraId, candidateBodyId, candidateCameraId }) {
  for (const [key, value] of Object.entries({ nativePath, beforePath, afterPath, nativeBodyId, nativeCameraId, candidateBodyId, candidateCameraId })) {
    if (!value) throw new Error(`${key} is required`);
  }
  const nativeBytes = fs.readFileSync(nativePath), beforeBytes = fs.readFileSync(beforePath), afterBytes = fs.readFileSync(afterPath);
  const native = parse(nativeBytes, { includeRaw: false }), before = parse(beforeBytes, { includeRaw: false }), after = parse(afterBytes, { includeRaw: false });
  const nb = getRecord(native, nativeBodyId, 'native body'), nc = getRecord(native, nativeCameraId, 'native camera');
  const bb = getRecord(before, candidateBodyId, 'candidate body before'), ba = getRecord(after, candidateBodyId, 'candidate body after');
  const bc = getRecord(before, candidateCameraId, 'candidate camera before'), ac = getRecord(after, candidateCameraId, 'candidate camera after');
  if (nb.frameValue !== nc.frameValue || bb.frameValue !== bc.frameValue || ba.frameValue !== ac.frameValue) throw new Error('Body and camera record spans differ');
  if (bb.index !== ba.index || bc.index !== ac.index || before.count !== after.count) throw new Error('Record order/count changed');
  for (let i = 0; i < before.count; i += 1) {
    const a = payload(beforeBytes, before.records[i]), b = payload(afterBytes, after.records[i]);
    if (i === bc.index) continue;
    if (!a.equals(b)) throw new Error(`Non-camera record ${i} changed`);
  }
  if (!payload(beforeBytes, bb).equals(payload(afterBytes, ba))) throw new Error('Candidate body record changed');
  if (nc.trackIdentifiers.some((id, i) => id !== CAMERA_TRACK_IDS[i]) || ac.trackIdentifiers.some((id, i) => id !== CAMERA_TRACK_IDS[i])) throw new Error('Unexpected camera track identities/order');
  const nativeRootIndex = nb.trackIdentifiers.indexOf(ROOT_TRACK_ID), targetRootIndex = ba.trackIdentifiers.indexOf(ROOT_TRACK_ID);
  if (nativeRootIndex < 0 || targetRootIndex < 0) throw new Error('Root track missing');
  const nbd = recordData(nativeBytes, nb), ncd = recordData(nativeBytes, nc), bbd = recordData(afterBytes, ba), acd = recordData(afterBytes, ac);
  const nr = nbd[nativeRootIndex], tr = bbd[targetRootIndex];
  let maxCameraPositionError = 0, maxTargetPositionError = 0, maxCameraRotationRadians = 0, maxDistanceError = 0;
  let cameraPositionFrame = 0, targetPositionFrame = 0, cameraRotationFrame = 0;
  for (let frame = 0; frame < ba.frameValue; frame += 1) {
    const n = frame / Math.max(1, ba.frameValue - 1);
    const qNativeRoot = toQuaternion(sample(nr.groups[1], n));
    const qTargetRoot = toQuaternion(tr.groups[1][frame]);
    const delta = multiply(qTargetRoot, inverse(qNativeRoot));
    const targetRootPosition = tr.groups[0][frame];
    const positions = [];
    for (let track = 0; track < 2; track += 1) {
      const expected = targetRootPosition.map((v, axis) => v + rotate(delta,
        sample(ncd[track].groups[0], n).map((cv, c) => cv - sample(nr.groups[0], n)[c]))[axis]);
      const actual = acd[track].groups[0][frame];
      const error = Math.hypot(...actual.map((v, axis) => v - expected[axis]));
      positions.push(actual);
      if (track === 0 && error > maxCameraPositionError) { maxCameraPositionError = error; cameraPositionFrame = frame; }
      if (track === 1 && error > maxTargetPositionError) { maxTargetPositionError = error; targetPositionFrame = frame; }
    }
    const nativeCameraQ = toQuaternion(sample(ncd[0].groups[1], n));
    const expectedCameraQ = multiply(delta, nativeCameraQ);
    const actualCameraQ = toQuaternion(acd[0].groups[1][frame]);
    const rotationError = angularError(expectedCameraQ, actualCameraQ);
    if (rotationError > maxCameraRotationRadians) { maxCameraRotationRadians = rotationError; cameraRotationFrame = frame; }
    const nativeDistance = Math.hypot(...sample(ncd[0].groups[0], n).map((v, axis) => v - sample(ncd[1].groups[0], n)[axis]));
    const targetDistance = Math.hypot(...positions[0].map((v, axis) => v - positions[1][axis]));
    maxDistanceError = Math.max(maxDistanceError, Math.abs(nativeDistance - targetDistance));
  }
  return {
    schema: 'aurora-forge/verify-victory-camera-root-space/v1',
    inputs: { nativePath: path.resolve(nativePath), nativeSha256: sha256(nativeBytes), beforePath: path.resolve(beforePath), beforeSha256: sha256(beforeBytes), afterPath: path.resolve(afterPath), afterSha256: sha256(afterBytes) },
    records: { nativeBody: nb.id, nativeCamera: nc.id, candidateBody: ba.id, candidateCamera: ac.id, candidateRecordCount: after.count, changedRecordIndex: ac.index, nonCameraRecordsByteIdentical: after.count - 1, bodyRecordByteIdentical: true, rootTrackId: ROOT_TRACK_ID },
    results: { maxCameraPositionError, cameraPositionFrame, maxTargetPositionError, targetPositionFrame, maxCameraRotationRadians, cameraRotationFrame, maxCameraTargetDistanceError: maxDistanceError },
    pass: maxCameraPositionError <= 0.002 && maxTargetPositionError <= 0.002 && maxCameraRotationRadians <= 0.00001 && maxDistanceError <= 0.002,
    limits: ['Verifies stored actor-root rigid camera transform and record preservation only; does not establish engine camera-consumer semantics or runtime framing.'],
  };
}

function option(name) { const i = process.argv.indexOf(name); return i < 0 ? '' : process.argv[i + 1]; }
if (require.main === module) {
  try {
    const report = verify({ nativePath: option('--native'), beforePath: option('--before'), afterPath: option('--after'), nativeBodyId: option('--native-body-id'), nativeCameraId: option('--native-camera-id'), candidateBodyId: option('--candidate-body-id'), candidateCameraId: option('--candidate-camera-id') });
    const out = option('--out');
    if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' }); }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  } catch (error) { console.error(`Victory camera root-space verification failed: ${error.stack || error.message}`); process.exitCode = 1; }
}
module.exports = { verify };
