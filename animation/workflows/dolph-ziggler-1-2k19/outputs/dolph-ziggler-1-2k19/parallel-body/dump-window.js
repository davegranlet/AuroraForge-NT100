'use strict';
// Lane-local: print a per-frame window for one source track (2K19 273.bin) and,
// optionally, the corresponding native 2K26 slot for FORMAT comparison only.
// usage: node dump-window.js <sourceTrackIndex> <phaseSectionPrefix e.g. 13> <from> <to> [source.bin] [native.clips]
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { eulerWordsToQuaternion, rotationFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const trackIndex = Number(process.argv[2]);
const phasePrefix = process.argv[3]; // '10','11','12','13','14'
const from = Number(process.argv[4]);
const to = Number(process.argv[5]);
const SRC = process.argv[6] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NAT = process.argv[7] || `D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1${phasePrefix[1]}00273.clips`;

const sections = decode(fs.readFileSync(SRC));
const body = sections[(Number(phasePrefix[1]) - 0) * 2]; // 10->0,11->2,12->4,13->6,14->8
const track = body.tracks[trackIndex];
const duration = track.frameCount;
const rot = track.type === 0x304 ? track.secondary : track.primary;
const qs = rotationFrames(rot, duration);
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((s, v, c) => s + v * b[c], 0)))) * 180 / Math.PI;

const keys = rot.keys;
console.log(`source track ${trackIndex} type=0x${track.type.toString(16)} section=${phasePrefix} frames=${duration} keys=${keys.length}`);

// native slot; body record selected by unique exact 64-bone ID set
let nat = null, natName = trackIndex;
try {
  const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
  const bodySet = new Set(['base','J_Hips','J_Spine1','J_Spine2','J_Chest','J_Neck','J_Head','J_Clavicle_L','J_Shoulder_L','J_Elbow_L','J_Wrist_L','J_MiddleF0_L','J_MiddleF1_L','J_MiddleF2_L','J_MiddleF3_L','J_ThumbF1_L','J_ThumbF2_L','J_ThumbF3_L','J_RingF0_L','J_RingF1_L','J_RingF2_L','J_RingF3_L','J_IndexF0_L','J_IndexF1_L','J_IndexF2_L','J_IndexF3_L','J_PinkyF0_L','J_PinkyF1_L','J_PinkyF2_L','J_PinkyF3_L','J_Clavicle_R','J_Shoulder_R','J_Elbow_R','J_Wrist_R','J_RingF0_R','J_RingF1_R','J_RingF2_R','J_RingF3_R','J_IndexF0_R','J_IndexF1_R','J_IndexF2_R','J_IndexF3_R','J_PinkyF0_R','J_PinkyF1_R','J_PinkyF2_R','J_PinkyF3_R','J_MiddleF0_R','J_MiddleF1_R','J_MiddleF2_R','J_MiddleF3_R','J_ThumbF1_R','J_ThumbF2_R','J_ThumbF3_R','J_Leg_L','J_Knee_L','J_Foot_L','J_Toe_L','J_Leg_R','J_Knee_R','J_Foot_R','J_Toe_R','vector','J_Root','J_anim_origin'].map(n => { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(n, 'utf8')) { v ^= BigInt(b); v = BigInt.asUintN(64, v * 0x100000001b3n); } return `0x${v.toString(16).toUpperCase().padStart(16, '0')}`; }));
  const layout = parseFile(NAT, { includeRaw: false });
  const cands = layout.records.filter(rec => rec.trackIdentifiers.length === 64 && rec.trackIdentifiers.every(id => bodySet.has(id)));
  const r = parseClipsRecord(NAT, cands[0].index);
  const frames = r.rec.frameValue;
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const perTrack = r.rec.raw.group78.length / r.rec.trackIdentifiers.length;
  const desc = gi => [0, 1, 2].map(c => {
    const e = r.rec.raw.group78[trackIndex * perTrack + gi * 3 + c];
    return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
  });
  const g = evalGroup(stream, r.bones[trackIndex].groups[0], desc(0), frames);
  const g1 = evalGroup(stream, r.bones[trackIndex].groups[1], desc(1), frames);
  nat = { g0: g, g1, frames, desc0: desc(0), desc1: desc(1) };
} catch (e) { console.log('native decode failed:', e.message); }

console.log('srcKeyFrames:', keys.filter(k => k.frame >= from - 6 && k.frame <= to + 3).map(k => `${k.frame}(d${k.delta})`).join(' '));
console.log('frame, srcAngleDeg, srcFrameDeltaDeg, natAngleDeg, natDeltaDeg, natG1raw');
let prev = null;
for (let f = from; f <= to; f++) {
  const a = ang(qs[f], [1, 0, 0, 0]);
  const d = f > 0 ? ang(qs[f], qs[f - 1]) : 0;
  let natA = '', natD = '', natRaw = '';
  if (nat) {
    const v = nat.g1[f];
    const q = (function () {
      const len = Math.hypot(...v);
      if (len < 1e-12) return [1, 0, 0, 0];
      const s = Math.sin(len) / len;
      return [Math.cos(len), s * v[0], s * v[1], s * v[2]]; // [w,x,y,z] to match ang()
    })();
    natA = ang(q, [1, 0, 0, 0]).toFixed(2);
    if (prev) natD = ang(q, prev).toFixed(2);
    prev = q;
    natRaw = v.map(x => x.toFixed(4)).join(',');
  }
  console.log(`${f}, ${a.toFixed(2)}, ${d.toFixed(2)}, ${natA}, ${natD}, ${natRaw}`);
}
