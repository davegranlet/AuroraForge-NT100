'use strict';
// analyze-camera-record.js - independent decode of the native camera (c0) record's three
// tracks/channels using the canonical clip codec. Establishes the data-level semantics needed
// for the consumer contract: channel types/scales, track 1 rotation identity, track 2 fixed-axis
// structure, and parity across native entrances.
// Output: camera-consumer-proof/camera-record-analysis.json
const fs = require('fs');
const path = require('path');
const L = require('../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');

const NATIVE = L.NATIVE273;
const OUT = path.join(__dirname, 'camera-record-analysis.json');
const TARGET_IDS = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1', '0x188FD8CF51F19C95'];
const PHASES = [100, 110, 120, 130, 140];
const EXTRA = [
  ['1000174', '1000174.clips'],
  ['1000161', '1000161.clips'],
  ['1000275', '1000275.clips'],
  ['1000276', '1000276.clips'],
];

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const deg = (r) => r * 180 / Math.PI;
const round = (v, n = 4) => +Number(v).toFixed(n);

function findCameraRecord(file) {
  const parsedAll = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const match = parsedAll.records.find((record) => record.trackIdentifiers.length === 3 && TARGET_IDS.every((id) => record.trackIdentifiers.includes(id)));
  return match || null;
}

function decodeRecord(file, recordIndex) {
  const parsed = parseClipsRecord(file, recordIndex);
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
  return { frames: parsed.rec.frameValue, fps: parsed.rec.fps, id: parsed.rec.id, trackIds: parsed.rec.trackIdentifiers || null, tracks, recordBytes: parsed.rec.length };
}

function seriesStats(values) {
  const flat = values.map((v) => v[0]);
  const min = Math.min(...flat), max = Math.max(...flat);
  const mean = flat.reduce((s, v) => s + v, 0) / flat.length;
  const first = flat[0], last = flat[flat.length - 1];
  const constant = flat.every((v) => Math.abs(v - first) < 1e-9);
  return { count: flat.length, min: round(min), max: round(max), mean: round(mean), first: round(first), last: round(last), constant, range: round(max - min) };
}

function quatFromHalfLog(v) {
  // q = (cos|v|, sin|v| * v/|v|)
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

const report = { schema: 'aurora-forge-camera-record-analysis/v1', generated: new Date().toISOString(), targetTrackIds: TARGET_IDS, phases: [], extras: [] };

for (const phase of PHASES) {
  const stem = String(phase / 10) + '00273';
  const file = path.join(NATIVE, 'Animation/CaeAdvanced', stem + '.clips');
  const record = findCameraRecord(file);
  if (!record) { report.phases.push({ phase, error: 'camera record not found' }); continue; }
  const decoded = decodeRecord(file, record.index);
  const t0 = decoded.tracks[0], t1 = decoded.tracks[1], t2 = decoded.tracks[2];
  const pos0 = t0.groups[0].values, rot0 = t0.groups[1] ? t0.groups[1].values : null;
  const pos1 = t1.groups[0].values, rot1 = t1.groups[1] ? t1.groups[1].values : null;
  const c2 = t2.groups[0].values, c2rot = t2.groups[1] ? t2.groups[1].values : null;
  const frames = decoded.frames;
  const aimAngles = [];
  const t1IdentityErrors = [];
  const t2Axis = [];
  const t2Magnitudes = [];
  if (rot0) {
    for (let f = 0; f < frames; f += Math.max(1, Math.floor(frames / 40))) {
      const dir = norm(sub(pos1[f], pos0[f]));
      const q = quatFromHalfLog(rot0[f]);
      const yAxis = rotate(q, [0, 1, 0]);
      aimAngles.push(deg(Math.acos(Math.max(-1, Math.min(1, dot(yAxis, dir))))));
    }
  }
  if (rot1) for (const v of rot1) t1IdentityErrors.push(Math.hypot(...v));
  for (const v of c2) { t2Magnitudes.push(Math.hypot(...v)); if (Math.hypot(...v) > 1e-9) t2Axis.push(norm(v)); }
  const axisMean = t2Axis.length ? [0, 1, 2].map((i) => t2Axis.reduce((s, v) => s + v[i], 0) / t2Axis.length) : null;
  const axisDeviation = axisMean && t2Axis.length ? Math.max(...t2Axis.map((v) => deg(Math.acos(Math.max(-1, Math.min(1, dot(v, norm(axisMean)))))))) : null;
  const proportional = [];
  if (c2.length) {
    const ref = c2[0];
    const ratios = c2.map((v) => ({ r01: ref[0] ? v[0] / ref[0] : null, r02: ref[1] ? v[1] / ref[1] : null, r03: ref[2] ? v[2] / ref[2] : null }));
    proportional.push({ max01: Math.max(...ratios.map((r) => Math.abs((r.r01 || 0) - 1))), max02: Math.max(...ratios.map((r) => Math.abs((r.r02 || 0) - 1))), max03: Math.max(...ratios.map((r) => Math.abs((r.r03 || 0) - 1))) });
  }
  report.phases.push({
    phase, file, recordIndex: record.index, recordId: record.id, frames, recordBytes: record.length,
    trackIds: record.trackIdentifiers,
    track0: { positionStats: pos0[0] ? [0, 1, 2].map((i) => seriesStats(pos0.map((v) => [v[i]]))) : null, firstPos: pos0[0] && pos0[0].map((v) => round(v, 2)), rotationPresent: Boolean(rot0), rotationScale: t0.groups[1] && t0.groups[1].descriptors.map((d) => d.scale) },
    track1: { positionStats: pos1[0] ? [0, 1, 2].map((i) => seriesStats(pos1.map((v) => [v[i]]))) : null, firstPos: pos1[0] && pos1[0].map((v) => round(v, 2)), rotationPresent: Boolean(rot1), rotationMaxMagnitude: rot1 ? round(Math.max(...rot1.map((v) => Math.hypot(...v)))) : null, rotationIdentity: rot1 ? Math.max(...rot1.map((v) => Math.hypot(...v))) < 1e-6 : null },
    track2: {
      channelStats: c2[0] ? [0, 1, 2].map((i) => seriesStats(c2.map((v) => [v[i]]))) : null,
      firstValue: c2[0] && c2[0].map((v) => round(v, 4)),
      axisMean: axisMean && axisMean.map((v) => round(v, 4)),
      axisMaxDeviationDeg: axisDeviation !== null ? round(axisDeviation, 3) : null,
      magnitudeStats: t2Magnitudes.length ? seriesStats(t2Magnitudes.map((v) => [v])) : null,
      proportionalToFirst: proportional[0] || null,
      secondGroupPresent: Boolean(c2rot),
      secondGroupScale: t2.groups[1] && t2.groups[1].descriptors.map((d) => d.scale),
    },
    aim: { sampled: aimAngles.length, meanDeg: aimAngles.length ? round(aimAngles.reduce((s, v) => s + v, 0) / aimAngles.length, 3) : null, minDeg: aimAngles.length ? round(Math.min(...aimAngles), 3) : null, maxDeg: aimAngles.length ? round(Math.max(...aimAngles), 3) : null },
    scaling: { track0Groups: t0.groups.map((g) => g.descriptors.map((d) => d.scale)), track1Groups: t1.groups.map((g) => g.descriptors.map((d) => d.scale)), track2Groups: t2.groups.map((g) => g.descriptors.map((d) => d.scale)) },
  });
  console.log('phase ' + phase + ' rec#' + record.index + ' id=' + record.id + ' frames=' + frames);
  console.log('  t0 pos first', JSON.stringify(pos0[0] && pos0[0].map((v) => round(v, 2))), 'rotScale', t0.groups[1] && t0.groups[1].descriptors.map((d) => d.scale));
  console.log('  t1 pos first', JSON.stringify(pos1[0] && pos1[0].map((v) => round(v, 2))), 'rotIdentity', rot1 ? Math.max(...rot1.map((v) => Math.hypot(...v))) < 1e-6 : null, 'rotMax', rot1 ? round(Math.max(...rot1.map((v) => Math.hypot(...v)))) : null);
  console.log('  t2 first', JSON.stringify(c2[0] && c2[0].map((v) => round(v, 3))), 'axis', axisMean && axisMean.map((v) => round(v, 3)), 'axisDevDeg', axisDeviation !== null ? round(axisDeviation, 2) : null, 'magStats', JSON.stringify(report.phases[report.phases.length - 1].track2.magnitudeStats));
  console.log('  t2 secondGroup', Boolean(c2rot), t2.groups[1] && t2.groups[1].descriptors.map((d) => d.scale), '| aim mean', report.phases[report.phases.length - 1].aim.meanDeg);
}

for (const [stem, name] of EXTRA) {
  const file = path.join(NATIVE, 'Animation/CaeAdvanced', name);
  if (!fs.existsSync(file)) { report.extras.push({ stem, missing: true }); continue; }
  const record = findCameraRecord(file);
  if (!record) { report.extras.push({ stem, file, cameraRecordByTrackIds: 'not found' }); continue; }
  const decoded = decodeRecord(file, record.index);
  const c2 = decoded.tracks[2].groups[0].values;
  const axis = c2.map(norm);
  const axisMean = [0, 1, 2].map((i) => axis.reduce((s, v) => s + v[i], 0) / axis.length);
  report.extras.push({ stem, file, recordIndex: record.index, frames: decoded.frames, trackIds: record.trackIdentifiers, t2First: c2[0].map((v) => round(v, 4)), t2Axis: axisMean.map((v) => round(v, 4)), t2MagnitudeRange: [round(Math.min(...c2.map((v) => Math.hypot(...v)))), round(Math.max(...c2.map((v) => Math.hypot(...v))))] });
  console.log('extra ' + stem + ' rec#' + record.index + ' tracks=' + record.trackIdentifiers.join(',') + ' t2 first ' + JSON.stringify(c2[0].map((v) => round(v, 3))) + ' axis ' + JSON.stringify(axisMean.map((v) => round(v, 3))));
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
