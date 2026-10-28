'use strict';
// camera-basis-analysis.js — reuse (do not re-discover) the established source-camera
// decode and native c0 decode; answer the five review questions with measurements:
//   Q1 Camera01 positions + paired target (look-at test)
//   Q2 coordinate basis vs the source body root/hips
//   Q3 native c0 vs source Camera01 deltas (why y differs)
//   Q4 native third track candidate relationships
//   Q5 Camera02 relationship / selection evidence
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, eulerWordsToQuaternion, multiply, inverse, rotate } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const PHASES = [100, 110, 120, 130, 140];
const CAMERA_RECORD = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const deg = (rad) => rad * 180 / Math.PI;

// source decode
const camBytes = fs.readFileSync(path.join(SHDC, fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort()[2]));
const camSections = decode(camBytes);
const entrance = decodeEntrance(SOURCE_ENTRANCE);

function sourceCamera(sectionIndex) {
  const s = camSections[sectionIndex];
  const d = s.tracks[0].frameCount;
  const t0 = s.tracks[0], t1 = s.tracks[1];
  return {
    frames: d + 1,
    pos: positionFrames(t0.secondary, t0.quantizationCandidates, d),
    rot: rotationFrames(t0.primary, d),
    target: positionFrames(t1.secondary, t1.quantizationCandidates, d),
    targetRot: rotationFrames(t1.primary, d),
  };
}

function nativeCamera(phase) {
  const file = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const parsed = parseClipsRecord(file, CAMERA_RECORD[phase]);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = [];
  for (const bone of parsed.bones) {
    const groups = [];
    for (let g = 0; g < bone.groups.length; g++) {
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const e = parsed.rec.raw.group78[bone.track * 6 + g * 3 + s];
        descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      groups.push(evalGroup(stream, bone.groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest)));
    }
    tracks.push(groups);
  }
  return { frames: parsed.rec.frameValue, tracks };
}

function stats(values) {
  const mn = Math.min(...values), mx = Math.max(...values);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return { min: +mn.toFixed(3), max: +mx.toFixed(3), mean: +mean.toFixed(3) };
}

// Q1: look-at test — camera forward conventions vs (target - camera)
console.log('=== Q1: source Camera01 vs paired target (look-at test) ===');
for (let pi = 0; pi < 5; pi++) {
  const cam = sourceCamera(pi * 2);
  const angles = { negZ: [], posZ: [], negX: [], posX: [] };
  for (let f = 0; f < cam.frames; f += 20) {
    const dir = norm(sub(cam.target[f], cam.pos[f]));
    const q = cam.rot[f];
    const axes = {
      negZ: rotate(q, [0, 0, -1]),
      posZ: rotate(q, [0, 0, 1]),
      negX: rotate(q, [-1, 0, 0]),
      posX: rotate(q, [1, 0, 0]),
    };
    for (const [k, v] of Object.entries(axes)) angles[k].push(deg(Math.acos(Math.max(-1, Math.min(1, dot(v, dir))))));
  }
  console.log(`phase ${PHASES[pi]}: mean angle to (target-cam):`,
    Object.entries(angles).map(([k, v]) => `${k}=${(v.reduce((s, x) => s + x, 0) / v.length).toFixed(1)}deg`).join(' '));
}

// Q2: coordinate basis vs source body root/hips
console.log('\n=== Q2: source camera vs source body root/hips (world-space test) ===');
for (let pi = 0; pi < 5; pi++) {
  const cam = sourceCamera(pi * 2);
  const phase = entrance.phases[pi];
  const motion = phase.sourceTracks;
  const hips = motion[1].p;   // J_Hips translation (accumulated)
  const vector = motion[61].p;
  const dCamHips = [], dCamVec = [];
  for (let f = 0; f < cam.frames; f++) { dCamHips.push(sub(cam.pos[f], hips[f])); dCamVec.push(sub(cam.pos[f], vector[f])); }
  const ranges = (arr) => [0, 1, 2].map((c) => stats(arr.map((r) => r[c])));
  console.log(`phase ${PHASES[pi]}: cam-hips`, JSON.stringify(ranges(dCamHips)));
  console.log(`            cam-vector`, JSON.stringify(ranges(dCamVec)));
  // target relative to hips (should track the character if target = character)
  const dTgtHips = cam.target.map((t, f) => sub(t, hips[f]));
  console.log(`            target-hips`, JSON.stringify(ranges(dTgtHips)));
}

// Q3: native c0 vs source Camera01 / Camera02 deltas
console.log('\n=== Q3: native c0 t0/t1 vs source Camera01/Camera02 ===');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCamera(PHASES[pi]);
  const a = sourceCamera(pi * 2);
  const b = sourceCamera(pi * 2 + 1);
  const n0 = nat.tracks[0][0], n1 = nat.tracks[1][0];
  const dA = [], dB = [], dT1 = [];
  for (let f = 0; f < Math.min(nat.frames, a.frames); f++) {
    dA.push(sub(n0[f], a.pos[f]));
    dB.push(sub(n0[f], b.pos[f]));
    dT1.push(sub(n1[f], a.target[f]));
  }
  const ranges = (arr) => [0, 1, 2].map((c) => stats(arr.map((r) => r[c])));
  console.log(`phase ${PHASES[pi]}: native0-sourceA`, JSON.stringify(ranges(dA)));
  console.log(`            native0-sourceB`, JSON.stringify(ranges(dB)));
  console.log(`            native1-sourceA.target`, JSON.stringify(ranges(dT1)));
}

// Q4: third track candidate relationships (per phase, sampled)
console.log('\n=== Q4: native third track relationships ===');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCamera(PHASES[pi]);
  const a = sourceCamera(pi * 2);
  const n0 = nat.tracks[0][0], n1 = nat.tracks[1][0], n2 = nat.tracks[2][0];
  const samples = [];
  for (let f = 0; f < nat.frames; f += Math.max(1, Math.floor(nat.frames / 4))) {
    const dirN = norm(sub(n1[f], n0[f]));
    const dirA = norm(sub(a.target[f], a.pos[f]));
    samples.push({
      f,
      t2: n2[f].map((v) => +v.toFixed(3)),
      dirNative: dirN.map((v) => +v.toFixed(3)),
      dirSource: dirA.map((v) => +v.toFixed(3)),
      distNative: +Math.hypot(...sub(n1[f], n0[f])).toFixed(2),
      distSource: +Math.hypot(...sub(a.target[f], a.pos[f])).toFixed(2),
    });
  }
  console.log(`phase ${PHASES[pi]}:`);
  for (const s of samples) console.log('  ', JSON.stringify(s));
}
