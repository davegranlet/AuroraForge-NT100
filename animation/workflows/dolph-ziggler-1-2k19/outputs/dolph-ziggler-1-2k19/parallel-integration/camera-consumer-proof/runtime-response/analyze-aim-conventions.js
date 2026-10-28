'use strict';
// analyze-aim-conventions.js - reproduce the source->aimfix camera delta and predict the rendered
// response under alternate rotation conventions, using the owner-observed response as the constraint.
// Read-only. Output: runtime-response/aim-convention-analysis.json
//
// Inputs: 9D94 camera records, aimfix camera records (both from the reviewed lanes), native 273
// camera records (reference invariants). World up is +Y (measured: body root Y = 106.9 stage/ramp,
// 0 ring; camera targets below the root). No catalog/string claims.
const fs = require('fs');
const path = require('path');
const L = require('../../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');
const { multiply, inverse } = require(L.TOOLS + '/decode-2k19-entrance-source.js');

const OUT = path.join(__dirname, 'aim-convention-analysis.json');
const NINE = path.join(__dirname, '..', '..', 'builds', 'p14002-camera-source-v1', 'staging', 'Animation', 'CaeAdvanced');
const AIM = path.join(__dirname, '..', '..', '..', 'parallel-companions', 'tracking-review', 'v2', 'camera-only-aimfix');
const NATIVE = L.NATIVE273;
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const UP = [0, 1, 0];

function quatFromHalfLog(v) {
  const l = Math.hypot(...v);
  if (l < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(l) / l;
  return [Math.cos(l), v[0] * s, v[1] * s, v[2] * s];
}
function rotate(q, v) { return multiply(multiply(q, [0, ...v]), inverse(q)).slice(1); }
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const deg = (r) => r * 180 / Math.PI;
const elev = (v) => deg(Math.asin(Math.max(-1, Math.min(1, v[1] / Math.hypot(...v)))));
const round = (v, n = 3) => +Number(v).toFixed(n);

function decodeCamera(file) {
  const layout = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 3);
  if (!rec) throw new Error('no 3-track camera record in ' + file);
  const parsed = parseClipsRecord(file, rec.index);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const groups = (track) => {
    const out = [];
    for (let g = 0; g < parsed.bones[track].groups.length; g += 1) {
      const descs = [];
      for (let s = 0; s < 3; s += 1) {
        const e = parsed.rec.raw.group78[track * 6 + g * 3 + s];
        descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      const values = evalGroup(stream, parsed.bones[track].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
      out.push(values);
    }
    return out;
  };
  const t0 = groups(0), t1 = groups(1), t2 = groups(2);
  return { recordIndex: rec.index, id: rec.id, frames: rec.frameValue, pos: t0[0], rot: t0[1], tgt: t1[0], t2: t2[0] };
}

const AXES = { posY: [0, 1, 0], negY: [0, -1, 0], posZ: [0, 0, 1], negZ: [0, 0, -1], posX: [1, 0, 0], negX: [-1, 0, 0] };
const report = { schema: 'aurora-forge-camera-convention-analysis/v1', generated: new Date().toISOString(), worldUp: UP, phases: [], observed: { response: 'changed late-phase camera pitches DOWN into ramp/floor at ~42s; dark/occluded ring views', changedPhases: [120, 130, 140] } };

for (let pi = 0; pi < 5; pi += 1) {
  const phase = PHASES[pi];
  const tag = TAGS[pi];
  const dir = String(phase / 10);
  const nine = decodeCamera(path.join(NINE, dir + '14002.clips'));
  const aim = decodeCamera(path.join(AIM, tag + '-camera-c0.clips'));
  const nativeFile = path.join(NATIVE, 'Animation/CaeAdvanced', dir + '00273.clips');
  const native = decodeCamera(nativeFile);
  const frames = nine.frames;
  const qb = quatFromHalfLog(nine.rot[0]);
  const qa = quatFromHalfLog(aim.rot[0]);
  const pos = nine.pos[0];
  const tBefore = nine.tgt[0], tAfter = aim.tgt[0];
  const forward = {};
  for (const [name, axis] of Object.entries(AXES)) {
    const before = rotate(qb, axis), after = rotate(qa, axis);
    const beforePassive = rotate(inverse(qb), axis), afterPassive = rotate(inverse(qa), axis);
    forward[name] = {
      activeBeforeDeg: round(elev(before)), activeAfterDeg: round(elev(after)), activeDeltaDeg: round(elev(after) - elev(before)),
      passiveBeforeDeg: round(elev(beforePassive)), passiveAfterDeg: round(elev(afterPassive)), passiveDeltaDeg: round(elev(afterPassive) - elev(beforePassive)),
    };
  }
  const lookBefore = norm(sub(tBefore, pos));
  const lookAfter = norm(sub(tAfter, pos));
  const lookDelta = deg(Math.acos(Math.max(-1, Math.min(1, dot(lookBefore, lookAfter)))));
  const lookYaw = deg(Math.atan2(lookAfter[2], lookAfter[0]) - Math.atan2(lookBefore[2], lookBefore[0]));
  const expectedForwardAim = norm(sub(tAfter, pos));
  const constructedForward = rotate(qa, [0, 1, 0]);
  const constructionError = deg(Math.acos(Math.max(-1, Math.min(1, dot(norm(constructedForward), expectedForwardAim)))));
  const delta = multiply(qa, inverse(qb));
  const deltaAngle = deg(2 * Math.acos(Math.max(-1, Math.min(1, delta[0]))));
  const deltaAxis = norm(delta.slice(1));
  const t2Axis = nine.t2[0] && Math.hypot(...nine.t2[0]) ? norm(nine.t2[0]) : null;
  report.phases.push({
    phase, changed: phase >= 120,
    nine: { recordIndex: nine.recordIndex, id: nine.id, pos: pos.map((v) => round(v, 2)), t1: tBefore.map((v) => round(v, 2)), t2First: nine.t2[0] && nine.t2[0].map((v) => round(v, 3)) },
    aim: { recordIndex: aim.recordIndex, id: aim.id, pos: pos.map((v) => round(v, 2)), t1: tAfter.map((v) => round(v, 2)), t2First: aim.t2[0] && aim.t2[0].map((v) => round(v, 3)) },
    native: { recordIndex: native.recordIndex, id: native.id, t1: native.tgt[0].map((v) => round(v, 2)) },
    aimDelta: {
      targetDelta: sub(tAfter, tBefore).map((v) => round(v, 2)),
      targetElevationChangeDeg: round(elev(sub(tAfter, pos)) - elev(sub(tBefore, pos))),
      lookAngleChangeDeg: round(lookDelta), lookYawChangeDeg: round(lookYaw),
      rotationDeltaAngleDeg: round(deltaAngle), rotationDeltaAxis: deltaAxis.map((v) => round(v, 3)),
      constructedForwardVsIntendedDeg: round(constructionError),
    },
    conventions: forward,
    t2Axis: t2Axis && t2Axis.map((v) => round(v, 3)),
  });
  console.log('p' + phase + ' target elev change ' + report.phases[pi].aimDelta.targetElevationChangeDeg + ' deg | look angle ' + report.phases[pi].aimDelta.lookAngleChangeDeg + ' yaw ' + report.phases[pi].aimDelta.lookYawChangeDeg + ' | rotDelta ' + report.phases[pi].aimDelta.rotationDeltaAngleDeg + ' deg axis ' + JSON.stringify(report.phases[pi].aimDelta.rotationDeltaAxis) + ' | constructErr ' + report.phases[pi].aimDelta.constructedForwardVsIntendedDeg);
  console.log('    active +Y before/after/delta ' + forward.posY.activeBeforeDeg + '/' + forward.posY.activeAfterDeg + '/' + forward.posY.activeDeltaDeg + ' | passive +Y ' + forward.posY.passiveBeforeDeg + '/' + forward.posY.passiveAfterDeg + '/' + forward.posY.passiveDeltaDeg + ' | active -Y delta ' + forward.negY.activeDeltaDeg + ' | passive -Y delta ' + forward.negY.passiveDeltaDeg + ' | active +Z delta ' + forward.posZ.activeDeltaDeg + ' passive +Z ' + forward.posZ.passiveDeltaDeg);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
