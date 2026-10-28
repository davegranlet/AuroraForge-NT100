'use strict';
// consumer-review-1.js — three bounded measurements for the lead's questions:
//  A) source and native camera aim to the character TORSO (root + torso height) per phase,
//     under the halfLog reconstruction, plus the aim to the raw target for reference;
//  B) native third-track step detection against the camera definition lens-event times
//     (phase 130 events at t=166/696/956; phase 120 at t=466/890) — does t2 step there?
//  C) t2 magnitude vs lens event args correlation.
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

const TORSO = 130; // cm-ish units above the root (approx chest/neck band)
console.log('A) aim angles vs (root) and (root+torso): mean deg per phase');
for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
  const torso = root.map((r) => [r[0], r[1] + TORSO, r[2]]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const srcPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d);
  const srcRot = rotationFrames(s.tracks[0].primary, d);
  const srcTgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d);
  const nat = nativeCam(phase);
  const acc = { srcRoot: 0, srcTorso: 0, natRoot: 0, natTorso: 0, n: 0, natSrcRot: 0, natSrcPos: 0 };
  for (let f = 0; f <= d; f += 5) {
    const fwdS = rotate(srcRot[f], [0, 1, 0]);
    acc.srcRoot += angleDeg(fwdS, sub(root[f], srcPos[f]));
    acc.srcTorso += angleDeg(fwdS, sub(torso[f], srcPos[f]));
    const qN = quatFromHalfLog(nat.rot[f]);
    const fwdN = rotate(qN, [0, 1, 0]);
    acc.natRoot += angleDeg(fwdN, sub(root[f], nat.pos[f]));
    acc.natTorso += angleDeg(fwdN, sub(torso[f], nat.pos[f]));
    // direct comparison: native rotation reconstruction vs source orientation (angles of forward axes)
    acc.natSrcRot += angleDeg(fwdN, fwdS);
    acc.natSrcPos += Math.hypot(...sub(nat.pos[f], srcPos[f]));
    acc.n++;
  }
  const m = (x) => (x / acc.n).toFixed(1);
  console.log(` phase ${phase}: source fwd->root ${m(acc.srcRoot)} ->torso ${m(acc.srcTorso)} | native fwd->root ${m(acc.natRoot)} ->torso ${m(acc.natTorso)} | native-vs-source fwd ${m(acc.natSrcRot)} pos ${m(acc.natSrcPos)}`);
}

console.log('\nB) native t2 magnitude steps vs lens-event times');
for (let pi = 0; pi < 5; pi++) {
  const nat = nativeCam(PHASES[pi]);
  const mags = nat.t2.map((v) => Math.hypot(...v));
  const steps = [];
  for (let f = 5; f < mags.length; f += 5) {
    const d = Math.abs(mags[f] - mags[f - 5]);
    if (d > 0.02) steps.push({ frame: f, from: +mags[f - 5].toFixed(3), to: +mags[f].toFixed(3), delta: +d.toFixed(3) });
  }
  console.log(` phase ${PHASES[pi]} frames ${mags.length}:`, JSON.stringify(steps.slice(0, 30)));
}
