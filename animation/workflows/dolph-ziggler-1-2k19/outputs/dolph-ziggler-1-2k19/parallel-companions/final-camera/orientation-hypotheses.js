'use strict';
// orientation-hypotheses.js — quantify the camera orientation channel under active/passive/
// conjugate/axis hypotheses for the native, v2 (9D94), and v3 (673B) camera records, and
// check the up-axis/roll for basis flips between v2 and v3.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, positionFrames, rotationFrames, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const V2_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/tracking-review/camera-only';
const V3_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/tracking-review/v2/camera-only-aimfix';
const INSTALLED_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-aim-diagnostic-v1/staging/Animation/CaeAdvanced';
const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }

function decodeRecord(file, recIndex) {
  const parsed = parseClipsRecord(file, recIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { frames: parsed.rec.frameValue, pos: get(0, 0), rot: get(0, 1), tgt: get(1, 0) };
}
function findCam(file) {
  const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
  const p = parseFile(file, { includeRaw: false });
  return p.records.findIndex((r) => r.trackIdentifiers.length === 3);
}

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const srcCam = decode(fs.readFileSync(path.join(SHDC_DIR, fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2])));

const HYP = [];
for (const [name, sign] of [['active +X', [1, 0, 0]], ['active +Y', [0, 1, 0]], ['active +Z', [0, 0, 1]], ['active -X', [-1, 0, 0]], ['active -Y', [0, -1, 0]], ['active -Z', [0, 0, -1]]]) HYP.push({ name, axis: sign, conj: false });
for (const [name, sign] of [['conj +X', [1, 0, 0]], ['conj +Y', [0, 1, 0]], ['conj +Z', [0, 0, 1]], ['conj -X', [-1, 0, 0]], ['conj -Y', [0, -1, 0]], ['conj -Z', [0, 0, -1]]]) HYP.push({ name, axis: sign, conj: true });

console.log('=== hypothesis table: mean angle(forward, own target) / angle(forward, body root), all phases pooled ===');
for (const [label, loader] of [
  ['native273', (pi) => decodeRecord(path.join(NATIVE_DIR, `${PHASES[pi]}0273.clips`), CAMREC[PHASES[pi]])],
  ['source-c01', (pi) => { const s = srcCam[pi * 2]; const d = s.tracks[0].frameCount; return { frames: d + 1, pos: positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d), rot: rotationFrames(s.tracks[0].primary, d), qDirect: true, tgt: positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d) }; }],
  ['v2-9D94', (pi) => { const f = path.join(V2_DIR, `${TAGS[pi]}-camera-c0.clips`); return decodeRecord(f, findCam(f)); }],
  ['v3-673B', (pi) => { const f = path.join(V3_DIR, `${TAGS[pi]}-camera-c0.clips`); return decodeRecord(f, findCam(f)); }],
  ['installed673B', (pi) => { const f = path.join(INSTALLED_DIR, `1${pi}14002.clips`); return decodeRecord(f, findCam(f)); }],
]) {
  const out = HYP.map((h) => ({ name: h.name, toTgt: 0, toRoot: 0, n: 0 }));
  let upBest = null;
  for (let pi = 0; pi < 5; pi++) {
    const cam = loader(pi);
    const motion = entrance.phases[pi].sourceTracks;
    const hips = motion[1].p, vec = motion[61].p;
    const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
    for (const h of HYP) {
      const idx = out.findIndex((x) => x.name === h.name);
      for (let f = 0; f < Math.min(cam.frames, root.length); f += 5) {
        const q = cam.qDirect ? cam.rot[f] : quatFromHalfLog(cam.rot[f]);
        const fwd = rotate(h.conj ? [q[0], -q[1], -q[2], -q[3]] : q, h.axis);
        out[idx].toTgt += angleDeg(fwd, sub(cam.tgt[f], cam.pos[f]));
        out[idx].toRoot += angleDeg(fwd, sub(root[f], cam.pos[f]));
        out[idx].n++;
      }
    }
    // up-axis check on this dataset phase: which axis is closest to world up
    const upScores = [];
    for (let f = 0; f < cam.frames; f += 5) {
      const q = cam.qDirect ? cam.rot[f] : quatFromHalfLog(cam.rot[f]);
      const angles = { '+X': angleDeg(rotate(q, [1, 0, 0]), [0, 1, 0]), '-X': angleDeg(rotate(q, [-1, 0, 0]), [0, 1, 0]), '+Y': angleDeg(rotate(q, [0, 1, 0]), [0, 1, 0]), '-Y': angleDeg(rotate(q, [0, -1, 0]), [0, 1, 0]), '+Z': angleDeg(rotate(q, [0, 0, 1]), [0, 1, 0]), '-Z': angleDeg(rotate(q, [0, 0, -1]), [0, 1, 0]) };
      upScores.push(angles);
    }
    const meanBy = {}; for (const k of ['+X', '-X', '+Y', '-Y', '+Z', '-Z']) meanBy[k] = upScores.reduce((s, a) => s + a[k], 0) / upScores.length;
    const best = Object.entries(meanBy).sort((a, b) => a[1] - b[1])[0];
    if (!upBest || best[1] < upBest.angle) upBest = { phase: PHASES[pi], axis: best[0], angle: best[1] };
  }
  const m = (x) => (x / x.n).toFixed(1);
  console.log(`\n== ${label}`);
  for (const o of out) if (o.name.startsWith('active') || o.name === 'conj +Y' || o.name === 'conj -Y') console.log(`   ${o.name.padEnd(10)} toTarget=${(o.toTgt / o.n).toFixed(1)}deg toRoot=${(o.toRoot / o.n).toFixed(1)}deg`);
  console.log(`   up-axis (closest local axis to world up, best phase): ${upBest.axis} at ${upBest.angle.toFixed(1)}deg (phase ${upBest.phase})`);
}
