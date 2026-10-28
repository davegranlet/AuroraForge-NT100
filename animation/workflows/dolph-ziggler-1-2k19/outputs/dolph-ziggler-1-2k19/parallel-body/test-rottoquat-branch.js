'use strict';
// Lane-local: quantify the effect of the shared clips-codec rot-to-quat small-angle branch.
// Native-internal relation checked (no source data):
//   J_anim_origin.g0 == rotate(inverse(q(J_Root.g1)), -J_Root.g0)
// The relation holds exactly if the native g1 -> quaternion conversion is correct.
// Two conversions compared:
//   exact:  s = sin(len)/len                       (half-angle vector)
//   branch: s = 0.003000020980834961 + len*len     (shared tool, for len <= 1)
// usage: node test-rottoquat-branch.js [nativeDir] [out.json]
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const DIR = process.argv[2] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const OUT = process.argv[3] || path.join(__dirname, 'rottoquat-branch-test.json');

function fnv64Exact(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); } return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`; }
const NAMES = ['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head','J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L','J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L','J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L','J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R','J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R','J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R','J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'];

const qmul = (a, b) => [a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3], a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2], a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1], a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
const qinv = a => [a[0], -a[1], -a[2], -a[3]];
const rotate = (qq, v) => qmul(qmul(qq, [0, ...v]), qinv(qq)).slice(1);
const conv = (v, branch) => {
  const len = Math.hypot(...v);
  if (len < 1e-12) return [1, 0, 0, 0];
  let s;
  if (len > 1) s = Math.sin(len) / len;
  else s = branch ? (0.003000020980834961 + len * len) : Math.sin(len) / len;
  return [Math.cos(len), s * v[0], s * v[1], s * v[2]];
};

const report = { schema: 'parallel-body/rottoquat-branch-test/v1', dir: DIR, phases: [] };
for (let d = 0; d < 5; d++) {
  const file = path.join(DIR, `1${d}00273.clips`);
  const layout = parseFile(file, { includeRaw: false });
  const bodySet = new Set(NAMES.map(fnv64Exact));
  const cand = layout.records.filter(r => r.trackIdentifiers.length === 64 && r.trackIdentifiers.every(id => bodySet.has(id)));
  const r = parseClipsRecord(file, cand[0].index);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const get = (t, gi) => {
    const descs = [0, 1, 2].map(c => { const e = r.rec.raw.group78[t * perTrack + gi * 3 + c]; return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }; });
    return evalGroup(stream, r.bones[t].groups[gi], descs, frames) || Array.from({ length: frames }, () => descs.map(x => x.rest));
  };
  const vec1 = get(61, 1), root0 = get(62, 0), orig0 = get(63, 0);
  let exactMax = 0, branchMax = 0, framesOver1 = 0, softFrames = 0;
  for (let f = 0; f < frames; f++) {
    const len = Math.hypot(...vec1[f]);
    if (len <= 1 && len > 1e-6) softFrames++;
    for (const branch of [false, true]) {
      const vq = conv(vec1[f], branch);
      const expect = rotate(qinv(vq), root0[f].map(v => -v));
      const err = Math.hypot(expect[0] - orig0[f][0], expect[1] - orig0[f][1], expect[2] - orig0[f][2]);
      if (branch) { if (err > branchMax) branchMax = err; if (err > 1) framesOver1++; } else exactMax = Math.max(exactMax, err);
    }
  }
  report.phases.push({ phase: 100 + d * 10, frames, framesWithSoftLen: softFrames, exactBranchMaxErr: exactMax, sharedToolBranchMaxErr: branchMax, sharedToolFramesOver1Unit: framesOver1 });
  console.log(`phase ${100 + d * 10}: frames=${frames} len<=1 frames=${softFrames} | exact rel err max=${exactMax.toExponential(2)} | branch rel err max=${branchMax.toExponential(2)} frames>1unit=${framesOver1}`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('wrote', OUT);
