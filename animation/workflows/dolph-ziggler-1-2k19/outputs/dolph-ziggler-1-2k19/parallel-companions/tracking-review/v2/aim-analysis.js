'use strict';
// aim-analysis.js — which direction does each candidate camera actually point, relative to
// the character root (source body root = native root), per phase, frame-sampled?
// Tests the camera local axes (+X,+Y,+Z,-X,-Y,-Z) against (root - camera) for:
//   - source Camera01 (rotation from source euler words)
//   - native 2K26 c0 (rotation = exp(halfLog values))
// also reports the aim error of the candidate (target - camera) direction vs (root - camera).
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, rotate } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;

function halfLogToQ(v) {
  const s = Math.hypot(...v);
  if (s < 1e-12) return [1, 0, 0, 0];
  const axis = v.map((x) => x / s);
  return [Math.cos(s), axis[0] * Math.sin(s), axis[1] * Math.sin(s), axis[2] * Math.sin(s)];
}
const AXES = { '+X': [1, 0, 0], '+Y': [0, 1, 0], '+Z': [0, 0, 1], '-X': [-1, 0, 0], '-Y': [0, -1, 0], '-Z': [0, 0, -1] };

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const camBytes = fs.readFileSync(path.join(SHDC, fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort()[2]));
const sections = decode(camBytes);

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
  return { pos: get(0, 0), rotHalf: get(0, 1), tgt: get(1, 0) };
}

console.log('axis angle from camera to character root (deg, mean over phase)');
for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const srcPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d);
  const srcRot = rotationFrames(s.tracks[0].primary, d);
  const srcTgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d);
  const nat = nativeCam(phase);

  const sums = {}; for (const k of Object.keys(AXES)) sums[k] = { s: 0, n: 0, max: 0 };
  let aimSrc = { s: 0, n: 0, max: 0 }, aimNat = { s: 0, n: 0, max: 0 };
  let dist = { s: 0, n: 0 };
  for (let f = 0; f <= d; f += 5) {
    const toRoot = sub(root[f], srcPos[f]);
    for (const [k, ax] of Object.entries(AXES)) {
      const v = rotate(srcRot[f], ax);
      const a = angleDeg(toRoot, v);
      sums[k].s += a; sums[k].n++; sums[k].max = Math.max(sums[k].max, a);
    }
    const aS = angleDeg(toRoot, sub(srcTgt[f], srcPos[f]));
    aimSrc.s += aS; aimSrc.n++; aimSrc.max = Math.max(aimSrc.max, aS);
    const aN = angleDeg(toRoot, sub(nat.tgt[f], nat.pos[f]));
    aimNat.s += aN; aimNat.n++; aimNat.max = Math.max(aimNat.max, aN);
    dist.s += Math.hypot(...toRoot); dist.n++;
  }
  const mean = (o) => (o.s / o.n).toFixed(1);
  console.log(`phase ${phase}: source axes`, Object.entries(sums).map(([k, v]) => `${k}=${mean(v)}(max ${v.max.toFixed(0)})`).join(' '));
  console.log(`           aim(target) source=${mean(aimSrc)}(max ${aimSrc.max.toFixed(0)})  native-c0=${mean(aimNat)}(max ${aimNat.max.toFixed(0)})  mean cam-root dist=${(dist.s / dist.n).toFixed(0)}`);
}
