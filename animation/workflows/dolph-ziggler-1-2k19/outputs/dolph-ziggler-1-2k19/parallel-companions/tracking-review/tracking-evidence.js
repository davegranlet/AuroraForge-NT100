'use strict';
// tracking-evidence.js — compact evidence bundle for the camera review:
//   lookat:     source camera +Y vs (paired target - position) angle
//   rootBasis:  paired target relative to the source body root (x/z tracking)
//   nativeDiff: current build c0 vs source Camera01 (per-channel mean deltas)
//   thirdTrack: t2 normalized direction across independent native entrance clips
//   selection:  current c0 vs source Camera01/Camera02 distances
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, rotate, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const NATIVE_ANIM = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const TARGET_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-diag-nativebody/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

const camBytes = fs.readFileSync(path.join(SHDC, fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort()[2]));
const sections = decode(camBytes);
const entrance = decodeEntrance(SOURCE_ENTRANCE);

function srcCam(si) {
  const s = sections[si], d = s.tracks[0].frameCount;
  return {
    frames: d + 1,
    pos: positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d),
    rot: rotationFrames(s.tracks[0].primary, d),
    tgt: positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d),
  };
}
function natCam(phase, dir) {
  const parsed = parseClipsRecord(path.join(dir, `${phase}0273.clips`).replace('0273', '0273'), CAMREC[phase]);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { frames: parsed.rec.frameValue, tracks: [[get(0, 0), get(0, 1)], [get(1, 0), get(1, 1)], [get(2, 0), get(2, 1)]] };
}

const out = { schema: 'aurora-forge-parallel-companions/tracking-evidence-v1', generated: new Date().toISOString(), phases: [] };
for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const a = srcCam(pi * 2), b = srcCam(pi * 2 + 1);
  const phaseBody = entrance.phases[pi];
  const motion = phaseBody.sourceTracks;
  const hips = motion[1].p, vector = motion[61].p;
  const root = hips.map((h, f) => [h[0], vector[f][1], h[2]]);

  // look-at angle (source +Y axis)
  let sum = 0, n = 0, max = 0;
  for (let f = 0; f < a.frames; f += 3) {
    const dirv = norm(sub(a.tgt[f], a.pos[f]));
    const up = rotate(a.rot[f], [0, 1, 0]);
    const ang = Math.acos(Math.max(-1, Math.min(1, dot(up, dirv)))) * 180 / Math.PI;
    sum += ang; n++; max = Math.max(max, ang);
  }
  // target vs root
  const dx = [], dz = [], dy = [];
  for (let f = 0; f < a.frames; f++) { const d = sub(a.tgt[f], root[f]); dx.push(Math.abs(d[0])); dy.push(d[1]); dz.push(Math.abs(d[2])); }
  // native c0 vs source cameras
  const nat = natCam(phase, NATIVE_ANIM);
  const dA = [], dB = [], dAT = [], dBT = [];
  for (let f = 0; f < Math.min(nat.frames, a.frames); f++) {
    dA.push(Math.hypot(...sub(nat.tracks[0][0][f], a.pos[f])));
    dB.push(Math.hypot(...sub(nat.tracks[0][0][f], b.pos[f])));
    dAT.push(Math.hypot(...sub(nat.tracks[1][0][f], a.tgt[f])));
    dBT.push(Math.hypot(...sub(nat.tracks[1][0][f], b.tgt[f])));
  }
  out.phases.push({
    phase, frames: a.frames,
    lookAt: { meanAngleDeg: +mean([sum / n]).toFixed(3), maxAngleDeg: +max.toFixed(3), axis: 'camera local +Y' },
    targetVsSourceRoot: { meanAbsX: +mean(dx).toFixed(2), meanAbsZ: +mean(dz).toFixed(2), meanY: +mean(dy).toFixed(1) },
    nativeCurrentVsSource: {
      meanPosDistToCamera01: +mean(dA).toFixed(1), meanPosDistToCamera02: +mean(dB).toFixed(1),
      meanTargetDistToCamera01Target: +mean(dAT).toFixed(2), meanTargetDistToCamera02Target: +mean(dBT).toFixed(2),
    },
  });
}

// t2 direction across independent native entrance clips
const t2 = [];
for (const f of fs.readdirSync(NATIVE_ANIM).filter((x) => /^1\d{6,7}\.clips$/.test(x))) {
  if (t2.length >= 12) break;
  let parsed;
  try { parsed = parseClipsRecord(path.join(NATIVE_ANIM, f), 0); } catch { continue; }
  // search records for a 3-track camera record
  const buf = fs.readFileSync(path.join(NATIVE_ANIM, f));
  const count = buf.readUInt32LE(0x10);
  for (let i = 0; i < count; i++) {
    const t = 0x18 + i * 16;
    const len = buf.readUInt32LE(t + 8), off = buf.readUInt32LE(t + 12);
    const p = buf.subarray(off, off + len);
    if (p.length < 0xA0 || p.readUInt32LE(0x20) !== 3) continue;
    let rec;
    try { rec = parseClipsRecord(path.join(NATIVE_ANIM, f), i); } catch { continue; }
    const stream = rec.file.subarray(rec.base, rec.base + rec.group.bytes);
    const descs = [];
    for (let s = 0; s < 3; s++) { const at = 0xA0 + 3 * 8 + p.readUInt32LE(0x38) * 4 + p.readUInt32LE(0x60) * 8 + (2 * 6 + s) * 8; descs.push({ scale: p.readInt8(at), width: p.readUInt8(at + 1), rest: p.readFloatLE(at + 4) }); }
    const ser = evalGroup(stream, rec.bones[2].groups[0], descs, rec.rec.frameValue) || Array.from({ length: rec.rec.frameValue }, () => descs.map((d) => d.rest));
    const v0 = ser[0], v1 = ser[ser.length - 1];
    const n0 = Math.hypot(...v0), n1 = Math.hypot(...v1);
    t2.push({ file: f, record: i, first: v0.map((v) => +v.toFixed(3)), firstMagnitude: +n0.toFixed(3), direction: n0 ? v0.map((v) => +(v / n0).toFixed(4)) : null, last: v1.map((v) => +v.toFixed(3)), lastMagnitude: +n1.toFixed(3) });
    break;
  }
}
out.thirdTrack = t2;
fs.writeFileSync(path.join(__dirname, 'tracking-evidence.json'), JSON.stringify(out, null, 1));
for (const p of out.phases) console.log('phase', p.phase, JSON.stringify({ lookAt: p.lookAt, root: p.targetVsSourceRoot, native: p.nativeCurrentVsSource }));
console.log('t2 samples:', t2.length, 'direction(s):', [...new Set(t2.map((x) => x.direction && x.direction.join(',')))].join(' '));
