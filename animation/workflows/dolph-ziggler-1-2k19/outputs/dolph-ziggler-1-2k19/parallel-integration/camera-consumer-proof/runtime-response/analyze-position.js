'use strict';
// analyze-position.js - bounded offline investigation of the owner-reported opening
// forward/back apparent zoom (A diagnostic video 2026-10-17_22-10-11.mp4).
// Compares source273 body-root travel, A/9D94 camera position (source Camera01), and
// native 2K26 273 camera position per phase, with an opening-frame decomposition.
// Read-only; writes position-investigation/position-series.json
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('../../lib/integration.js');
const { parseClipsRecord } = require(L.TOOLS + '/clips-codec/parse-clips-record.js');
const { evalGroup } = require(L.TOOLS + '/clips-codec/eval-group.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, positionFrames, rotationFrames } = require(L.TOOLS + '/decode-2k19-entrance-source.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const NATIVE = L.NATIVE273;
const A_DIR = path.join(__dirname, '..', '..', 'builds', 'p14002-cam-A-orientation', 'staging', 'Animation', 'CaeAdvanced');
const BASE_DIR = path.join(__dirname, '..', '..', 'builds', 'p14002-camera-source-v1', 'staging', 'Animation', 'CaeAdvanced');
const OUT_DIR = path.join(__dirname, 'position-investigation');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const len = (v) => Math.hypot(...v);
const norm = (v) => { const l = len(v); return l ? v.map((x) => x / l) : v; };
const round = (v, n = 3) => +Number(v).toFixed(n);
const dist = (a, b) => len(sub(a, b));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const minMax = (a) => [Math.min(...a), Math.max(...a)];

function decodeCamera(file) {
  const layout = require(L.TOOLS + '/clips-layout.js').parse(fs.readFileSync(file), { includeRaw: false });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 3);
  const parsed = parseClipsRecord(file, rec.index);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s += 1) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { index: rec.index, id: rec.id, frames: rec.frameValue, pos: get(0, 0), rot: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}

function summaryPos(series, root, label) {
  const cam0 = series[0], camN = series[series.length - 1];
  const root0 = root[0], rootN = root[root.length - 1];
  const ds = [];
  const n = Math.min(series.length, root.length);
  for (let i = 0; i < n; i += 1) ds.push(dist(series[i], root[i]));
  const pathCam = [];
  for (let i = 1; i < series.length; i += 1) pathCam.push(dist(series[i - 1], series[i]));
  return {
    label,
    frames: { camera: series.length, root: root.length, compared: n },
    cameraStart: cam0.map((v) => round(v, 2)), cameraEnd: camN.map((v) => round(v, 2)),
    cameraRange: [0, 1, 2].map((c) => minMax(series.map((r) => r[c])).map((v) => round(v, 2))),
    cameraNet: round(dist(cam0, camN), 2), cameraPath: round(pathCam.reduce((s, v) => s + v, 0), 2),
    rootStart: root0.map((v) => round(v, 2)), rootEnd: rootN.map((v) => round(v, 2)),
    rootNet: round(dist(root0, rootN), 2),
    camRootDistance: { start: round(ds[0], 2), end: round(ds[ds.length - 1], 2), min: round(Math.min(...ds), 2), max: round(Math.max(...ds), 2), delta: round(ds[ds.length - 1] - ds[0], 2) },
  };
}

function openingDecomp(cam, root, frames) {
  const n = Math.min(frames, cam.length, root.length);
  const out = { frames: n, windows: [] };
  const points = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i], b = points[i + 1];
    const u = norm(sub(root[a], cam[a]));
    const d0 = dist(cam[a], root[a]), d1 = dist(cam[b], root[b]);
    const rootDisp = sub(root[b], root[a]);
    const camDisp = sub(cam[b], cam[a]);
    out.windows.push({
      frames: [a, b],
      seconds: [round(a / 30, 2), round(b / 30, 2)],
      dStart: round(d0, 2), dEnd: round(d1, 2), dDelta: round(d1 - d0, 2),
      rootNet: round(len(rootDisp), 2), cameraNet: round(len(camDisp), 2),
      rootRadialTowardCamera: round(-dot(rootDisp, u), 2),
      cameraRadialTowardRoot: round(dot(camDisp, u), 2),
    });
  }
  const d = [];
  for (let i = 0; i < n; i += 1) d.push(dist(cam[i], root[i]));
  // largest shrink / growth over a 15-frame window: apparent zoom direction per window
  let shrink = { frames: [0, 0], delta: 0 }, grow = { frames: [0, 0], delta: 0 };
  for (let i = 0; i + 15 < n; i += 1) {
    const dd = d[i + 15] - d[i];
    if (dd < shrink.delta) shrink = { frames: [i, i + 15], delta: dd };
    if (dd > grow.delta) grow = { frames: [i, i + 15], delta: dd };
  }
  out.fastestShrink15 = { ...shrink, delta: round(shrink.delta, 2), seconds: round(shrink.frames[1] / 30, 2) };
  out.fastestGrow15 = { ...grow, delta: round(grow.delta, 2), seconds: round(grow.frames[1] / 30, 2) };
  out.series10 = [];
  for (let i = 0; i < n; i += 10) out.series10.push({ f: i, t: round(i / 30, 2), d: round(d[i], 2), cam: cam[i].map((v) => round(v, 1)), root: root[i].map((v) => round(v, 1)) });
  if ((n - 1) % 10 !== 0) out.series10.push({ f: n - 1, t: round((n - 1) / 30, 2), d: round(d[n - 1], 2), cam: cam[n - 1].map((v) => round(v, 1)), root: root[n - 1].map((v) => round(v, 1)) });
  return out;
}

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const sections = decode(fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2)));
const report = { schema: 'aurora-forge-position-investigation/v1', generated: new Date().toISOString(), inputs: { source: SOURCE_ENTRANCE, cameraSections: SHDC_ENTRY_2, native: NATIVE, aBuild: A_DIR, baseBuild: BASE_DIR, video: 'D:/videos/sept-19-2026/2026-10-17_22-10-11.mp4' }, phases: [], checks: {} };

for (let pi = 0; pi < PHASES.length; pi += 1) {
  const phase = PHASES[pi], tag = TAGS[pi];
  const s = sections[pi * 2];
  const dur = s.tracks[0].frameCount;
  const srcCamPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, dur);
  const srcRot = rotationFrames(s.tracks[0].primary, dur);
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
  const aFile = path.join(A_DIR, `1${pi}14002.clips`);
  const baseFile = path.join(BASE_DIR, `1${pi}14002.clips`);
  const nativeFile = path.join(NATIVE, 'Animation/CaeAdvanced', `${phase / 10}00273.clips`);
  const a = decodeCamera(aFile);
  const base = decodeCamera(baseFile);
  const nat = decodeCamera(nativeFile);
  const n = Math.min(a.pos.length, nat.pos.length);
  const diffs = [];
  for (let i = 0; i < n; i += 1) diffs.push(dist(a.pos[i], nat.pos[i]));
  const nBase = Math.min(a.pos.length, base.pos.length);
  let aVsBase = 0;
  for (let i = 0; i < nBase; i += 1) aVsBase = Math.max(aVsBase, dist(a.pos[i], base.pos[i]));
  const phaseOut = {
    phase, tag, frames: { a: a.frames, native: nat.frames, sourceCamera: srcCamPos.length, root: root.length, sourceRot: srcRot.length },
    identity: { aIndex: a.index, aId: a.id, nativeIndex: nat.index, nativeId: nat.id, uniqueThreeTrack: true },
    sourceCamera: summaryPos(srcCamPos, root, 'source273 camera (A/9D94 position)'),
    nativeCamera: summaryPos(nat.pos, root.slice(0, nat.pos.length), 'native2k26-273 camera position'),
    aBuild: summaryPos(a.pos, root.slice(0, a.pos.length), 'A-build camera position'),
    aPositionEqualsBase: round(aVsBase, 6),
    aVsNativePosition: { frames: n, mean: round(mean(diffs), 2), max: round(Math.max(...diffs), 2), min: round(Math.min(...diffs), 2) },
    openingP100: pi === 0 ? openingDecomp(a.pos, root, 361) : undefined,
    openingP110: pi === 1 ? openingDecomp(a.pos, root, 361) : undefined,
    nativeOpeningP100: pi === 0 ? openingDecomp(nat.pos, root, 361) : undefined,
    nativeOpeningP110: pi === 1 ? openingDecomp(nat.pos, root, 361) : undefined,
  };
  phaseOut.aVsNativePositionPerAxisMean = [0, 1, 2].map((c) => round(mean(a.pos.slice(0, n).map((p, i) => p[c] - nat.pos[i][c])), 2));
  if (pi === 0) {
    phaseOut.checkSrcEqualsA = round(Math.max(...a.pos.map((p, i) => dist(p, srcCamPos[Math.min(i, srcCamPos.length - 1)]))), 6);
  }
  report.phases.push(phaseOut);
  console.log(`p${phase}: A pos start ${phaseOut.aBuild.cameraStart} end ${phaseOut.aBuild.cameraEnd} net ${phaseOut.aBuild.cameraNet}; native start ${phaseOut.nativeCamera.cameraStart} end ${phaseOut.nativeCamera.cameraEnd} net ${phaseOut.nativeCamera.cameraNet}; A-native mean ${phaseOut.aVsNativePosition.mean} max ${phaseOut.aVsNativePosition.max}; cam-root d ${phaseOut.aBuild.camRootDistance.start}->${phaseOut.aBuild.camRootDistance.end}`);
}

report.hashNote = 'sha256 of inputs';
report.inputHashes = {
  sourceEntrance: sha(fs.readFileSync(SOURCE_ENTRANCE)),
  cameraSectionFile: sha(fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2))),
  aCak: sha(fs.readFileSync(path.join(__dirname, '..', '..', 'builds', 'p14002-cam-A-orientation', 'aurora-2k25-replace-mod.cak'))),
  baseCak: sha(fs.readFileSync(path.join(__dirname, '..', '..', 'builds', 'p14002-camera-source-v1', 'aurora-2k25-replace-mod.cak'))),
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'position-series.json'), JSON.stringify(report, null, 1));
console.log('wrote', path.join(OUT_DIR, 'position-series.json'));
