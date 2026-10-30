'use strict';

// Independently verify source-derived 2K19 root/origin equations against a
// packed target .clips body record, resolving the target tracks by 64-bit ID.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
const ORIGIN_ID = '0x11558A1746547CA2';
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function inverse(q) { return [q[0], -q[1], -q[2], -q[3]]; }
function multiply(a, b) {
  return [
    a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
    a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
    a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
    a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0],
  ];
}
function rotate(q, v) { return multiply(multiply(q, [0, ...v]), inverse(q)).slice(1); }
function halfLog(q) {
  const s = Math.hypot(q[1], q[2], q[3]);
  if (s < 1e-12) return [0, 0, 0];
  const scale = Math.atan2(s, q[0]) / s;
  return q.slice(1).map(value => value * scale);
}
function targetChannel(opened, index, group) {
  const descriptors = Array.from({ length: 3 }, (_, axis) => {
    const item = opened.decoded.rec.raw.group78[index * 6 + group * 3 + axis];
    return { scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(item.hex.slice(2, 4), 16), rest: item.candidate.f32le[1] };
  });
  return evalGroup(opened.stream, opened.decoded.bones[index].groups[group], descriptors, opened.record.frameValue)
    ?? Array.from({ length: opened.record.frameValue }, () => descriptors.map(item => item.rest));
}

function verify({ sourcePath, clipsPath, recordId, tolerance = 0.001 }) {
  const sourceBytes = fs.readFileSync(sourcePath);
  const clipsBytes = fs.readFileSync(clipsPath);
  const source = JSON.parse(sourceBytes.toString('utf8'));
  const sourceTracks = source.sourceTracks;
  if (sourceTracks.length !== 62 || sourceTracks[1].hash32 !== 'f91a7a26' || sourceTracks[61].hash32 !== '5c7d3444') {
    throw new Error('Source hips/vector track identities do not match the established Victory 6100 layout');
  }
  const layout = parseFile(clipsPath, { includeRaw: false });
  const records = recordId ? layout.records.filter(record => record.id.toUpperCase() === recordId.toUpperCase()) : layout.records.filter(record => record.trackIdentifiers.length === 64);
  if (records.length !== 1) throw new Error(`Expected one target body record, found ${records.length}`);
  const record = records[0];
  if (record.frameValue !== source.frames) throw new Error(`Frame count mismatch: target ${record.frameValue}, source ${source.frames}`);
  const rootIndex = record.trackIdentifiers.indexOf(ROOT_ID);
  const originIndex = record.trackIdentifiers.indexOf(ORIGIN_ID);
  if (rootIndex < 0 || originIndex < 0) throw new Error('Target body lacks the exact J_Root/J_anim_origin identifiers');
  const decoded = parseClipsRecordBuffer(clipsBytes, record.index);
  const stream = clipsBytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const opened = { decoded, stream, record };
  const actual = {
    rootPosition: targetChannel(opened, rootIndex, 0),
    rootRotation: targetChannel(opened, rootIndex, 1),
    originPosition: targetChannel(opened, originIndex, 0),
    originRotation: targetChannel(opened, originIndex, 1),
  };
  const hips = sourceTracks[1], vector = sourceTracks[61];
  const groups = [
    ['rootPosition', frame => [hips.p[frame][0], vector.p[frame][1], hips.p[frame][2]]],
    ['rootRotation', frame => halfLog(vector.q[frame])],
    ['originPosition', frame => rotate(inverse(vector.q[frame]), [hips.p[frame][0], vector.p[frame][1], hips.p[frame][2]].map(value => -value))],
    ['originRotation', frame => halfLog(inverse(vector.q[frame]))],
  ];
  const checks = groups.map(([name, expectedAt]) => {
    let maxAbsoluteError = 0, maxFrame = 0, maxAxis = 0;
    for (let frame = 0; frame < source.frames; frame += 1) {
      const expected = expectedAt(frame);
      for (let axis = 0; axis < 3; axis += 1) {
        const error = Math.abs(actual[name][frame][axis] - expected[axis]);
        if (error > maxAbsoluteError) { maxAbsoluteError = error; maxFrame = frame; maxAxis = axis; }
      }
    }
    return { channel: name, maxAbsoluteError, maxFrame, maxAxis, pass: maxAbsoluteError <= tolerance };
  });
  return {
    schema: 'aurora-forge/source19-root-origin-target-verification/v1',
    source: { path: path.resolve(sourcePath), sha256: sha(sourceBytes), frames: source.frames },
    target: { path: path.resolve(clipsPath), sha256: sha(clipsBytes), recordIndex: record.index, recordId: record.id, frames: record.frameValue, fps: record.fps, rootIndex, originIndex },
    tolerance,
    checks,
    pass: checks.every(check => check.pass),
    scope: 'Recomputes 2K19 Victory hips/vector root and inverse-origin equations frame by frame, then compares against the packed 2K26 curves resolved by exact target bone ID. Does not prove runtime consumer behavior.',
  };
}

if (require.main === module) {
  try {
    const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? '' : process.argv[index + 1]; };
    const sourcePath = arg('--source'), clipsPath = arg('--clips'), outPath = arg('--out');
    if (!sourcePath || !clipsPath) throw new Error('Usage: node verify-source19-root-origin-target.js --source <decoded-victory.json> --clips <target.clips> [--record-id <id>] [--out <report.json>] [--tolerance <value>]');
    const report = verify({ sourcePath, clipsPath, recordId: arg('--record-id') || undefined, tolerance: arg('--tolerance') ? Number(arg('--tolerance')) : 0.001 });
    if (outPath) { fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true }); fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`); }
    console.log(JSON.stringify({ pass: report.pass, target: report.target, checks: report.checks }, null, 2));
    if (!report.pass) process.exitCode = 1;
  } catch (error) { console.error(`Source19 root/origin target verification failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { verify };
