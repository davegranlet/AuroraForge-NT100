'use strict';
// consumer-review-2.js — native/source camera orientation cross-checks:
//  1) native self-consistency: which local axis points at (native target - native pos)?
//  2) source self-consistency under the same reconstruction for comparison;
//  3) is t2dir equal to any camera world axis (per frame), or a fixed world vector?
//  4) print stored rotation values (source halfLog vs native raw) per phase at sampled frames.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const sections = decode(fs.readFileSync(path.join(SHDC_DIR, fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2])));

function nativeCam(phase) {
  const parsed = parseClipsRecord(path.join(NATIVE_DIR, `${phase}0273.clips`), CAMREC[phase]);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { pos: get(0, 0), rot: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}

console.log('1/2) which local axis points at the target? (mean angle deg; halfLog reconstruction)');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCam(PHASES[pi]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const srcPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d);
  const srcRot = rotationFrames(s.tracks[0].primary, d);
  const srcTgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d);
  const acc = { nX: 0, nY: 0, nZ: 0, sX: 0, sY: 0, sZ: 0, n: 0 };
  for (let f = 0; f <= Math.min(d, nat.rot.length - 1); f += 5) {
    const dN = sub(nat.tgt[f], nat.pos[f]);
    const qN = quatFromHalfLog(nat.rot[f]);
    acc.nX += angleDeg(rotate(qN, [1, 0, 0]), dN);
    acc.nY += angleDeg(rotate(qN, [0, 1, 0]), dN);
    acc.nZ += angleDeg(rotate(qN, [0, 0, 1]), dN);
    const dS = sub(srcTgt[f], srcPos[f]);
    acc.sX += angleDeg(rotate(srcRot[f], [1, 0, 0]), dS);
    acc.sY += angleDeg(rotate(srcRot[f], [0, 1, 0]), dS);
    acc.sZ += angleDeg(rotate(srcRot[f], [0, 0, 1]), dS);
    acc.n++;
  }
  const m = (x) => (x / acc.n).toFixed(1);
  console.log(` phase ${PHASES[pi]}: native X/Y/Z -> target = ${m(acc.nX)}/${m(acc.nY)}/${m(acc.nZ)} | source X/Y/Z -> target = ${m(acc.sX)}/${m(acc.sY)}/${m(acc.sZ)}`);
}

console.log('\n3) t2dir vs camera world axes (min angle over axes, mean/max per phase; t2 is world-constant)');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCam(PHASES[pi]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const srcRot = rotationFrames(s.tracks[0].primary, d);
  let mean = 0, max = 0, n = 0;
  for (let f = 0; f <= Math.min(d, nat.t2.length - 1); f += 5) {
    const t2dir = norm(nat.t2[f]);
    const axes = [rotate(srcRot[f], [1, 0, 0]), rotate(srcRot[f], [0, 1, 0]), rotate(srcRot[f], [0, 0, 1])];
    const min = Math.min(...axes.map((a) => angleDeg(a, t2dir)));
    mean += min; max = Math.max(max, min); n++;
  }
  console.log(` phase ${PHASES[pi]}: min-axis angle to t2dir mean ${(mean / n).toFixed(1)} max ${max.toFixed(1)}`);
}

console.log('\n4) stored rotation values at sampled frames: source halfLog vs native raw');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCam(PHASES[pi]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const q = rotationFrames(s.tracks[0].primary, d);
  const hl = (qq) => { const ss = Math.hypot(qq[1], qq[2], qq[3]); if (ss < 1e-12) return [0, 0, 0]; const ha = Math.atan2(ss, qq[0]); return qq.slice(1).map((v) => v * ha / ss); };
  const picks = [0, Math.floor(d / 2), d];
  console.log(` phase ${PHASES[pi]}:`);
  for (const f of picks) console.log(`   f${f} source-hl [${hl(q[f]).map((v) => +v.toFixed(3)).join(',')}] native [${nat.rot[f].map((v) => +v.toFixed(3)).join(',')}]`);
}
