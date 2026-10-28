'use strict';
// parity-check.js - validate the current camera component/records against the measured native
// camera invariants (camera-consumer-proof). Read-only. Evidence:
// camera-consumer-proof/camera-parity-check.json
//
// Invariants (proven from native 273 + unrelated native entrances, see camera-record-analysis.json):
//   I1 the camera record is the fixed 3-track id set 54D1.../5A37.../188F...
//   I2 track 0 is an oriented pose: local +Y points at track 1's position (native <= ~0.5 deg)
//   I3 track 1 is a point: rotation group is exactly identity (zero rotation vector)
//   I4 track 2 is a 1-DOF rotation channel about fixed axis [0.552,0.701,0.452] (+-1 deg)
//   I5 the untouched body/facial/other records remain equal to the reference build
const fs = require('fs');
const path = require('path');
const L = require('../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');

const OUT = path.join(__dirname, 'camera-parity-check.json');
const NATIVE = L.NATIVE273;
const CANDIDATE = path.join(__dirname, '..', 'builds', 'p14002-camera-source-v1', 'staging');
const REFERENCE = path.join(__dirname, '..', 'builds', 'p14002-pairfix-v2', 'staging');
const TARGET_IDS = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1', '0x188FD8CF51F19C95'];
const AXIS = [0.552, 0.701, 0.452];
const PHASES = [100, 110, 120, 130, 140];

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const deg = (r) => r * 180 / Math.PI;
const round = (v, n = 4) => +Number(v).toFixed(n);

function quatFromHalfLog(v) {
  const l = Math.hypot(...v);
  if (l < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(l) / l;
  return [Math.cos(l), v[0] * s, v[1] * s, v[2] * s];
}
function rotate(q, v) {
  const [w, x, y, z] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

function decodeCamera(file) {
  const layout = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const matches = [];
  layout.records.forEach((record, index) => {
    if (record.trackIdentifiers.length === 3 && TARGET_IDS.every((id) => record.trackIdentifiers.includes(id))) matches.push(index);
  });
  if (matches.length !== 1) return { error: 'expected exactly one camera record, found ' + matches.length };
  const index = matches[0];
  const parsed = parseClipsRecord(file, index);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = [];
  for (const bone of parsed.bones) {
    const groups = [];
    for (let g = 0; g < bone.groups.length; g += 1) {
      const descriptors = [];
      for (let s = 0; s < 3; s += 1) {
        const entry = parsed.rec.raw.group78[bone.track * 6 + g * 3 + s];
        descriptors.push({ scale: Buffer.from(entry.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(entry.hex.slice(2, 4), 16), rest: entry.candidate.f32le[1] });
      }
      const values = evalGroup(stream, bone.groups[g], descriptors, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descriptors.map((d) => d.rest));
      groups.push({ descriptors, values });
    }
    tracks.push({ track: bone.track, groups });
  }
  return { index, id: layout.records[index].id, trackIds: layout.records[index].trackIdentifiers, frames: layout.records[index].frameValue, length: layout.records[index].length, tracks };
}

function invariants(record) {
  const t0 = record.tracks[0], t1 = record.tracks[1], t2 = record.tracks[2];
  const pos0 = t0.groups[0].values, rot0 = t0.groups[1] ? t0.groups[1].values : null;
  const pos1 = t1.groups[0].values, rot1 = t1.groups[1] ? t1.groups[1].values : null;
  const c2 = t2.groups[0].values;
  const frames = record.frames;
  const aim = [];
  if (rot0) {
    for (let f = 0; f < frames; f += Math.max(1, Math.floor(frames / 40))) {
      const dir = norm(sub(pos1[f], pos0[f]));
      const yAxis = rotate(quatFromHalfLog(rot0[f]), [0, 1, 0]);
      aim.push(deg(Math.acos(Math.max(-1, Math.min(1, dot(yAxis, dir))))));
    }
  }
  const t1Ident = rot1 ? Math.max(...rot1.map((v) => Math.hypot(...v))) : null;
  const axisHits = [];
  const axisSamples = [];
  const magnitudes = [];
  for (const v of c2) {
    const m = Math.hypot(...v);
    magnitudes.push(m);
    if (m > 1e-9) { const axis = norm(v); axisSamples.push(axis); axisHits.push(deg(Math.acos(Math.max(-1, Math.min(1, dot(axis, AXIS)))))); }
  }
  const axisMean = axisSamples.length ? [0, 1, 2].map((i) => axisSamples.reduce((s, v) => s + v[i], 0) / axisSamples.length) : null;
  const axisSelf = axisSamples.length && axisMean ? Math.max(...axisSamples.map((v) => deg(Math.acos(Math.max(-1, Math.min(1, dot(v, norm(axisMean)))))))) : null;
  return {
    trackIdsMatch: record.trackIds.length === 3 && TARGET_IDS.every((id) => record.trackIds.includes(id)),
    aimMeanDeg: aim.length ? round(aim.reduce((s, v) => s + v, 0) / aim.length, 3) : null,
    aimMaxDeg: aim.length ? round(Math.max(...aim), 3) : null,
    t1RotationIdentity: t1Ident !== null ? t1Ident < 1e-6 : null,
    t2AxisMaxDeviationDeg: axisHits.length ? round(Math.max(...axisHits), 3) : null,
    t2AxisMean: axisMean ? axisMean.map((v) => round(v, 4)) : null,
    t2AxisSelfMaxDeviationDeg: axisSelf !== null ? round(axisSelf, 3) : null,
    t2MagnitudeRange: [round(Math.min(...magnitudes)), round(Math.max(...magnitudes))],
    t2Constant: round(Math.max(...magnitudes) - Math.min(...magnitudes), 6) < 1e-9,
  };
}

const report = { schema: 'aurora-forge-camera-parity-check/v1', generated: new Date().toISOString(), axis: AXIS, targetTrackIds: TARGET_IDS, phases: [], referenceEquality: [] };
for (const phase of PHASES) {
  const dir = String(phase / 10);
  const nativeFile = path.join(NATIVE, 'Animation/CaeAdvanced', dir + '00273.clips');
  const candidateFile = path.join(CANDIDATE, 'Animation/CaeAdvanced', dir + '14002.clips');
  const nativeRecord = decodeCamera(nativeFile);
  const candidateRecord = decodeCamera(candidateFile);
  const nativeInv = nativeRecord.error ? { error: nativeRecord.error } : invariants(nativeRecord);
  const candidateInv = candidateRecord.error ? { error: candidateRecord.error } : invariants(candidateRecord);
  const checks = [];
  const push = (name, ok, detail) => checks.push({ name, ok, detail });
  push('camera-record-unique-3-track-id-set', !nativeRecord.error && !candidateRecord.error, { native: nativeRecord.error || nativeRecord.index, candidate: candidateRecord.error || candidateRecord.index });
  if (!nativeRecord.error && !candidateRecord.error) {
    push('track-id-set-equal-native', candidateInv.trackIdsMatch, candidateRecord.trackIds);
    push('native-t0-plusY-aims-t1', nativeInv.aimMeanDeg !== null && nativeInv.aimMeanDeg < 1, nativeInv.aimMeanDeg);
    push('candidate-t0-plusY-aims-t1', candidateInv.aimMeanDeg !== null && candidateInv.aimMeanDeg < 1, candidateInv.aimMeanDeg);
    push('native-t1-rotation-identity', nativeInv.t1RotationIdentity === true, null);
    push('candidate-t1-rotation-identity', candidateInv.t1RotationIdentity === true, null);
    push('candidate-t2-fixed-axis', candidateInv.t2AxisSelfMaxDeviationDeg !== null && candidateInv.t2AxisSelfMaxDeviationDeg < 1, candidateInv.t2AxisSelfMaxDeviationDeg);
    const axisCompare = candidateInv.t2AxisMean && nativeInv.t2AxisMean ? round(deg(Math.acos(Math.max(-1, Math.min(1, dot(norm(candidateInv.t2AxisMean), norm(nativeInv.t2AxisMean)))))), 3) : null;
    push('candidate-t2-axis-equals-native-phase', axisCompare !== null && axisCompare < 0.5, axisCompare);
    push('candidate-t2-matches-native-range', Math.abs(candidateInv.t2MagnitudeRange[0] - nativeInv.t2MagnitudeRange[0]) < 0.01 && Math.abs(candidateInv.t2MagnitudeRange[1] - nativeInv.t2MagnitudeRange[1]) < 0.01, { native: nativeInv.t2MagnitudeRange, candidate: candidateInv.t2MagnitudeRange });
  }
  // untouched records equal to the v2 reference build
  const refFile = path.join(REFERENCE, 'Animation/CaeAdvanced', dir + '14002.clips');
  const candidateBuf = fs.readFileSync(candidateFile);
  const refBuf = fs.readFileSync(refFile);
  const candParsed = L.parseClips(candidateBuf);
  const refParsed = L.parseClips(refBuf);
  const cameraIndex = candidateRecord.error ? -1 : candidateRecord.index;
  const recordEquality = [];
  if (candParsed.records.length !== refParsed.records.length) recordEquality.push({ verdict: 'record-count' });
  else candParsed.records.forEach((record, index) => {
    if (index === cameraIndex) return;
    const a = candidateBuf.subarray(record.offset + 8, record.offset + record.length);
    const b = refBuf.subarray(refParsed.records[index].offset + 8, refParsed.records[index].offset + refParsed.records[index].length);
    const ok = record.length === refParsed.records[index].length && a.equals(b) && record.id === refParsed.records[index].id;
    if (!ok) recordEquality.push({ index, verdict: 'different' });
  });
  report.referenceEquality.push({ phase, ok: recordEquality.length === 0, mismatches: recordEquality });
  report.phases.push({ phase, native: nativeInv, candidate: candidateInv, checks });
  const failed = checks.filter((check) => !check.ok);
  console.log('p' + phase + ' checks ' + (checks.length - failed.length) + '/' + checks.length + (failed.length ? ' FAIL: ' + failed.map((f) => f.name).join(',') : '') + ' | native aim ' + nativeInv.aimMeanDeg + ' cand aim ' + candidateInv.aimMeanDeg + ' t2axisDev ' + candidateInv.t2AxisMaxDeviationDeg + ' t2range ' + JSON.stringify(candidateInv.t2MagnitudeRange));
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
const allOk = report.phases.every((phase) => phase.checks.every((check) => check.ok)) && report.referenceEquality.every((entry) => entry.ok);
console.log(allOk ? 'CAMERA PARITY: PASS' : 'CAMERA PARITY: FAIL');
console.log('written', OUT);
