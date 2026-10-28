'use strict';
// framing-model.js — whole-phase geometric comparison: given the SOURCE camera data
// (position + aim at the floor target) and the source actor root path, compute the
// angular offset of the actor (root and chest) from the aim axis per frame, then mark
// the frames where the actor is outside a given vertical FOV. This quantifies WHY the
// actor leaves the frame in the ring phases under the source data for any lens choice.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const PHASES = [100, 110, 120, 130, 140];
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const sections = decode(fs.readFileSync(path.join(SHDC_DIR, fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2])));

console.log('actor angular offset from the aim axis (deg), and out-of-frame windows for vFOV 50/70/90');
for (let pi = 0; pi < 5; pi++) {
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
  const s = sections[pi * 2]; const d = s.tracks[0].frameCount;
  const pos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d);
  const tgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d);
  const stats = [];
  const outWindows = { fov50: 0, fov70: 0, fov90: 0 };
  let continuousOut = { fov50: [], fov70: [], fov90: [] };
  for (let f = 0; f <= d; f++) {
    const aim = norm(sub(tgt[f], pos[f]));
    const dRoot = sub(root[f], pos[f]);
    const dChest = sub([root[f][0], root[f][1] + 130, root[f][2]], pos[f]);
    const aRoot = ang(aim, dRoot), aChest = ang(aim, dChest);
    const near = Math.min(aRoot, aChest); // the closer of root/chest to the aim axis
    stats.push({ f, aRoot, aChest, dist: Math.hypot(...dRoot) });
    for (const [k, half] of [['fov50', 25], ['fov70', 35], ['fov90', 45]]) if (near > half) outWindows[k]++;
  }
  const mean = (arr) => arr.reduce((x, y) => x + y, 0) / arr.length;
  const sample = [0, Math.floor(d * 0.25), Math.floor(d * 0.5), Math.floor(d * 0.75), d].map((f) => `f${f}: root ${stats[f].aRoot.toFixed(0)}/chest ${stats[f].aChest.toFixed(0)} (d ${stats[f].dist.toFixed(0)})`).join(' | ');
  console.log(`phase ${PHASES[pi]}: both-out frames: vFOV50 ${outWindows.fov50}/${d + 1}, vFOV70 ${outWindows.fov70}, vFOV90 ${outWindows.fov90}`);
  console.log('   ', sample);
}
console.log('\nInterpretation: "both-out" = even the closer of root/chest is beyond the half-FOV, so the actor CANNOT be visible under that lens with the source aim.');
