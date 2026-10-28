'use strict';
// worker-11 lane — source vs target camera/body world-space inspection (read-only).
// Decodes: (1) source 2K19 entrance body + source camera sections;
//          (2) converted 14002 body record (0FAE) track set by FNV name id;
//          (3) native 2K26 273 body + camera records (v116 reference).
// Prints absolute positions, view axes, and angles for composition analysis.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, rotate, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const OUT = __dirname;
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const BUILT_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
const f4 = (v) => v.map((x) => +x.toFixed(4));
const f2 = (v) => v.map((x) => +x.toFixed(2));

function fnv(name) { let h = 0xcbf29ce484222325n; for (const c of Buffer.from(name, 'ascii')) { h ^= BigInt(c); h = BigInt.asUintN(64, h * 0x100000001b3n); } return '0x' + h.toString(16).toUpperCase().padStart(16, '0'); }

function decodeClipsRecordTracks(file, recIndex) {
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
  const layout = parseFile(file, { includeRaw: false });
  const rec = layout.records[recIndex];
  const ids = rec.trackIdentifiers;
  const tracks = ids.map((id, t) => ({ id, idx: t, pos: get(t, 0), rotHalf: get(t, 1) }));
  return { frames: parsed.rec.frameValue, tracks };
}

function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0]*Math.sin(s), ax[1]*Math.sin(s), ax[2]*Math.sin(s)]; }

function selectByIds(tracks, names) {
  const out = {};
  for (const n of names) { const id = fnv(n); const t = tracks.find((x) => x.id === id); out[n] = t || null; }
  return out;
}

const results = { schema: 'worker-11/source-target-space-inspection-v1', generated: new Date().toISOString(), phases: [] };

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const camFile = path.join(SHDC_DIR, fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2]);
const sections = decode(fs.readFileSync(camFile));

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const motion = entrance.phases[pi].sourceTracks;
  const dur = entrance.phases[pi].durationFrames;
  const s = sections[pi * 2];
  const sd = s.tracks[0].frameCount;
  const srcCamPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, sd);
  const srcCamRot = rotationFrames(s.tracks[0].primary, sd);
  const srcTgtPos = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, sd);
  const srcCamPosB = positionFrames(sections[pi*2+1].tracks[0].secondary, sections[pi*2+1].tracks[0].quantizationCandidates, sections[pi*2+1].tracks[0].frameCount);

  const built = decodeClipsRecordTracks(path.join(BUILT_DIR, `1${pi}14002.clips`), 0);
  const builtSel = selectByIds(built.tracks, ['base', 'J_Root', 'J_Hips', 'J_Spine1', 'J_Dock', 'J_Opponent', 'J_anim_origin', 'vector', 'j_cam1', 'J_Cam1', 'J_Cam1_fov', 'J_Cam2', 'J_Cam2_fov', 'J_Cam_Offset']);
  const builtCam = decodeClipsRecordTracks(path.join(BUILT_DIR, `1${pi}14002.clips`), built.tracks.length >= 0 ? 3 : 3);

  const natFile = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const natLayout = parseFile(natFile, { includeRaw: false });
  const natBodyIdx = 0;
  const natCamIdx = natLayout.records.findIndex((r) => r.trackIdentifiers.length === 3);
  const natBody = decodeClipsRecordTracks(natFile, natBodyIdx);
  const natCam = decodeClipsRecordTracks(natFile, natCamIdx);
  const natSel = selectByIds(natBody.tracks, ['J_Root', 'J_anim_origin', 'J_Hips', 'vector', 'J_Dock']);
  const natCamSel = selectByIds(natCam.tracks, ['Camera', 'tgt.Camera', 'fov.Camera']);

  const fSamples = [0, Math.round(dur * 0.25), Math.round(dur * 0.5), Math.round(dur * 0.75), dur];
  const phaseOut = { phase, durFrames: dur, sourceFrames: sd + 1, records: {
    built: natBody.tracks.map((t) => t.id).length,
    natRecords: natLayout.records.map((r, i) => ({ i, tracks: r.trackIdentifiers.length, ids: r.trackIdentifiers })),
  }, samples: [] };

  for (const f of fSamples) {
    const ff = Math.min(f, sd);
    const camPos = srcCamPos[ff], camRot = srcCamRot[ff], tgt = srcTgtPos[ff];
    const camPosB = srcCamPosB[ff];
    const fwd = rotate(camRot, [0, 1, 0]);
    const up = rotate(camRot, [0, 0, 1]);
    const right = rotate(camRot, [1, 0, 0]);
    const hips = motion[1].p[ff], vector = motion[61].p[ff];
    const rootCombo = [hips[0], vector[1], hips[2]];
    const nf = Math.min(ff, built.frames - 1);
    const nfNat = Math.min(ff, natBody.frames - 1);
    const bp = (n) => (builtSel[n] ? f2(builtSel[n].pos[nf]) : null);
    const np = (n) => (natSel[n] ? f2(natSel[n].pos[nfNat]) : null);
    const nc = (n) => (natCamSel[n] ? f2(natCamSel[n].pos[nfNat]) : null);
    const sample = {
      f: ff,
      srcCam: f2(camPos),
      srcCamB: f2(camPosB),
      srcTarget: f2(tgt),
      srcFwd: f4(fwd),
      srcUp: f4(up),
      srcRight: f4(right),
      srcHips: f2(hips),
      srcVector: f2(vector),
      srcRootCombo: f2(rootCombo),
      srcAngFwdToTarget: +angleDeg(fwd, sub(tgt, camPos)).toFixed(3),
      srcAngFwdToRootCombo: +angleDeg(fwd, sub(rootCombo, camPos)).toFixed(3),
      srcAngFwdToHips: +angleDeg(fwd, sub(hips, camPos)).toFixed(3),
      srcDistCamToTarget: +Math.hypot(...sub(tgt, camPos)).toFixed(2),
      srcDistCamToHips: +Math.hypot(...sub(hips, camPos)).toFixed(2),
      built: { frames: built.frames, J_Root: bp('J_Root'), J_anim_origin: bp('J_anim_origin'), J_Hips: bp('J_Hips'), vector: bp('vector'), base: bp('base'), J_Dock: bp('J_Dock') },
      nativeBody: { frames: natBody.frames, J_Root: np('J_Root'), J_anim_origin: np('J_anim_origin'), J_Hips: np('J_Hips'), vector: np('vector') },
      nativeCam: { frames: natCam.frames, Camera: nc('Camera'), tgt_Camera: nc('tgt.Camera'), fov_Camera: nc('fov.Camera') },
    };
    // angles using built/native tracks against native camera when available
    if (natCamSel['Camera'] && natSel['J_Root']) {
      const ncamPos = natCamSel['Camera'].pos[nfNat]; const ncamQ = quatFromHalfLog(natCamSel['Camera'].rotHalf[nfNat]);
      const nfwd = rotate(ncamQ, [0, 1, 0]);
      sample.nativeCamAngFwdToJRoot = +angleDeg(nfwd, sub(natSel['J_Root'].pos[nfNat], ncamPos)).toFixed(3);
      if (natCamSel['tgt.Camera']) sample.nativeCamAngFwdToTgt = +angleDeg(nfwd, sub(natCamSel['tgt.Camera'].pos[nfNat], ncamPos)).toFixed(3);
      if (natSel['J_anim_origin']) sample.nativeCamAngFwdToOrigin = +angleDeg(nfwd, sub(natSel['J_anim_origin'].pos[nfNat], ncamPos)).toFixed(3);
      if (natSel['J_Hips']) sample.nativeCamAngFwdToJ_Hips = +angleDeg(nfwd, sub(natSel['J_Hips'].pos[nfNat], ncamPos)).toFixed(3);
    }
    // built body vs built camera (Camera record from pairfix build = native camera)
    if (builtCam.tracks[0] && builtSel['J_Root']) {
      const bcamPos = builtCam.tracks[0].pos[nf]; const bcamQ = quatFromHalfLog(builtCam.tracks[0].rotHalf[nf]);
      const bfwd = rotate(bcamQ, [0, 1, 0]);
      sample.builtCamId0 = builtCam.tracks[0].id;
      sample.builtCamAngFwdToJRoot = +angleDeg(bfwd, sub(builtSel['J_Root'].pos[nf], bcamPos)).toFixed(3);
      if (builtSel['J_Hips']) sample.builtCamAngFwdToJ_Hips = +angleDeg(bfwd, sub(builtSel['J_Hips'].pos[nf], bcamPos)).toFixed(3);
      if (builtSel['J_anim_origin']) sample.builtCamAngFwdToJ_anim_origin = +angleDeg(bfwd, sub(builtSel['J_anim_origin'].pos[nf], bcamPos)).toFixed(3);
    }
    phaseOut.samples.push(sample);
  }
  results.phases.push(phaseOut);
}

fs.writeFileSync(path.join(OUT, 'source-target-space-inspection.json'), JSON.stringify(results, null, 1));
console.log('written source-target-space-inspection.json');
