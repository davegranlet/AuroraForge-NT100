'use strict';
// Lane-local verification of the derived target root slots (J_Hips 1, vector 61,
// J_Root 62, J_anim_origin 63) produced by the canonical buildTargetBody.
//
// Part A (native-internal, no source): relationships that the target format must satisfy:
//   A1: J_Hips.g0 has zero x and z on every frame.
//   A2: J_anim_origin.g0 == rotate(inverse(vector.q), -J_Root.g0) on every frame.
//   A3: J_anim_origin.g1 == -J_Root.g1 (inverse rotation).
//   A4: J_Root.g1 == vector.g1.
// Part B (derived-vs-native diagnostic): candidate slot series vs native decoded series;
//   values are compared as a format check, explicitly not as a choreography oracle.
// usage: node verify-derived-slots.js [source.bin] [nativeDir] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { decodeEntrance, multiply, inverse, rotate, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SRC = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NATDIR = process.argv[3] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OUT = process.argv[4] || path.join(__dirname, 'derived-slots-verification.json');

function fnv64Exact(s) {
  let v = 0xcbf29ce484222325n;
  for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); }
  return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`;
}
const NAMES = ['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head',
  'J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L',
  'J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L',
  'J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L',
  'J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R',
  'J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R',
  'J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R',
  'J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'];

const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((s, v, c) => s + v * b[c], 0)))) * 180 / Math.PI;
// Half-angle vector -> quaternion, exact math for all lengths.
// NOTE: shared animation/tools/clips-codec/rot-to-quat.js has a suspect
// small-angle branch (s = 0.003 + len^2 for len<=1) that is NOT sin(len)/len;
// this lane script intentionally does not use that branch (shared tools are
// read-only for this lane; flagged for lead review with evidence).
// Returns [w, x, y, z] to match decode-2k19-entrance-source quaternion order.
// (The shared clips-codec/rot-to-quat.js returns [x, y, z, w]; order differs.)
const rotToQuat = v => {
  const len = Math.hypot(...v);
  if (len < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(len) / len;
  return [Math.cos(len), s * v[0], s * v[1], s * v[2]];
};

function loadNative(file) {
  const layout = parseFile(file, { includeRaw: false });
  const bodySet = new Set(NAMES.map(fnv64Exact));
  const cands = layout.records.filter(r => r.trackIdentifiers.length === 64 && r.trackIdentifiers.every(id => bodySet.has(id)));
  if (cands.length !== 1) throw new Error(`${path.basename(file)}: body record not unique (${cands.length})`);
  const r = parseClipsRecord(file, cands[0].index);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, gi) => {
    const descs = [0, 1, 2].map(c => {
      const e = r.rec.raw.group78[t * perTrack + gi * 3 + c];
      return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
    });
    const vals = evalGroup(stream, r.bones[t].groups[gi], descs, frames);
    return vals || Array.from({ length: frames }, () => descs.map(x => x.rest));
  };
  return { frames, get };
}

const src = decodeEntrance(SRC);
const report = { schema: 'parallel-body/derived-slots-verification/v1', source: SRC, sourceSha256: src.sourceSha256, nativeDir: NATDIR, phases: [] };

for (let d = 0; d < 5; d++) {
  const phase = src.phases[d];
  const nat = loadNative(path.join(NATDIR, `1${d}00273.clips`));
  const frames = phase.frames;
  if (nat.frames !== frames) throw new Error(`phase ${phase.phase}: frame mismatch source=${frames} native=${nat.frames}`);

  const natHips0 = nat.get(1, 0), natHips1 = nat.get(1, 1);
  const natVec0 = nat.get(61, 0), natVec1 = nat.get(61, 1);
  const natRoot0 = nat.get(62, 0), natRoot1 = nat.get(62, 1);
  const natOrig0 = nat.get(63, 0), natOrig1 = nat.get(63, 1);

  // Part A: native-internal relationships (format semantics)
  let a1 = 0, a2 = 0, a3 = 0, a4 = 0;
  for (let f = 0; f < frames; f++) {
    a1 = Math.max(a1, Math.abs(natHips0[f][0]), Math.abs(natHips0[f][2]));
    const vq = rotToQuat(natVec1[f]);
    const rootP = natRoot0[f];
    const expect = rotate(inverse(vq), rootP.map(v => -v));
    const got = natOrig0[f];
    const errPos = Math.hypot(got[0] - expect[0], got[1] - expect[1], got[2] - expect[2]);
    a2 = Math.max(a2, errPos);
    const origQ = rotToQuat(natOrig1[f]);
    a3 = Math.max(a3, angle(origQ, inverse(vq)));
    const rootQ = rotToQuat(natRoot1[f]);
    a4 = Math.max(a4, angle(rootQ, vq));
  }

  // Part B: derived candidate vs native series (diagnostic)
  const body = phase.body;
  const rows = [];
  for (const track of [0, 1, 61, 62, 63]) {
    let maxPos = 0, maxRot = 0, medRot = [];
    for (let f = 0; f < frames; f++) {
      const np = track === 1 ? natHips0[f] : track === 61 ? natVec0[f] : track === 62 ? natRoot0[f] : track === 63 ? natOrig0[f] : [0, 0, 0];
      const nq = track === 1 ? natHips1[f] : track === 61 ? natVec1[f] : track === 62 ? natRoot1[f] : track === 63 ? natOrig1[f] : [0, 0, 0];
      const p = body[track].p[f], q = body[track].q[f];
      const dp = Math.hypot(p[0] - np[0], p[1] - np[1], p[2] - np[2]);
      if (dp > maxPos) maxPos = dp;
      const dq = angle(q, rotToQuat(nq));
      medRot.push(dq);
      if (dq > maxRot) maxRot = dq;
    }
    medRot.sort((x, y) => x - y);
    rows.push({ track, maxPosDiff: maxPos, maxRotDiff: maxRot, medianRotDiff: medRot[Math.floor(medRot.length / 2)] });
  }

  report.phases.push({
    phase: phase.phase, frames,
    nativeInternal: { a1Hips0XZMax: a1, a2OrigRotateMaxErr: a2, a3OrigInverseMaxDeg: a3, a4RootVectorMaxDeg: a4 },
    derivedVsNative: rows,
  });
  console.log(`phase ${phase.phase}: native-internal A1=${a1.toExponential(2)} A2=${a2.toExponential(2)} A3=${a3.toFixed(3)}deg A4=${a4.toFixed(3)}deg`);
  for (const r of rows) console.log(`   track ${r.track}: maxPosDiff=${r.maxPosDiff.toExponential(2)} maxRotDiff=${r.maxRotDiff.toFixed(3)}deg medianRot=${r.medianRotDiff.toFixed(3)}deg`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('wrote', OUT);
