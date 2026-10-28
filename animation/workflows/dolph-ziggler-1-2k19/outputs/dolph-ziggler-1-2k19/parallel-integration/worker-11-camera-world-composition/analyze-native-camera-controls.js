'use strict';
// worker-11 lane ??? compare camera-record geometry across native (camera-good) entrances.
// Read-only against the v116 extraction. Outputs machine JSON in this lane.
const fs = require('node:fs');
const path = require('node:path');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const OUT = __dirname;
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';

const CAMSET = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1', '0x188FD8CF51F19C95'];
const FNV = { 'base': '0x9A7CE19BAA54C278', 'J_Root': '0x1F4DA262FC146772', 'J_anim_origin': '0x11558A1746547CA2', 'J_Hips': '0xF4043B2D54A71FC8', 'vector': '0xE9628ACACA9C7D82', 'J_Dock': '0x479F94CD272D8DE9', 'J_Opponent': '0x7297B62FB3E082CB' };

const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
const f2 = (v) => (v ? v.map((x) => +x.toFixed(2)) : null);
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }
const rotate = (q, v) => { const m = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js'); return m.rotate(q, v); };

function decodeRecord(file, recIndex) {
  fs.appendFileSync(path.join(OUT, 'progress.log'), `  parseClipsRecord ${path.basename(file)} rec${recIndex}\n`);
  const parsed = parseClipsRecord(file, recIndex);
  fs.appendFileSync(path.join(OUT, 'progress.log'), `  parsed frames=${parsed.rec.frameValue}\n`);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { frames: parsed.rec.frameValue, get, parsed };
}

const result = { schema: 'worker-11/native-camera-controls-v1', generated: new Date().toISOString(), entries: {} };
const ENTRIES = [273, 161, 144, 142, 708, 494, 174];
const PHASES = [100, 120, 140];

for (const entry of ENTRIES) {
  result.entries[entry] = {};
  for (const phase of PHASES) {
    fs.appendFileSync(path.join(OUT, 'progress.log'), `start ${entry} ${phase}\n`);
    const file = path.join(NATIVE_DIR, `${phase}0${String(entry).padStart(3, '0')}.clips`);
    if (!fs.existsSync(file)) { result.entries[entry][phase] = { missing: true }; continue; }
    const layout = parseFile(file, { includeRaw: false });
    const recs = layout.records.map((r, i) => ({ i, tracks: r.trackIdentifiers.length, ids: r.trackIdentifiers }));
    const camRec = layout.records.findIndex((r) => r.trackIdentifiers.length === 3 && r.trackIdentifiers.every((id) => CAMSET.includes(id)));
    const bodyRec = layout.records.findIndex((r) => r.trackIdentifiers.length >= 60);
    const info = { file: file.replace(/\\/g, '/'), records: recs, camRecIndex: camRec, bodyRecIndex: bodyRec, samples: [] };
    if (camRec < 0 || bodyRec < 0) { result.entries[entry][phase] = info; continue; }
    const cam = decodeRecord(file, camRec);
    const body = decodeRecord(file, bodyRec);
    const idxOf = (name) => layout.records[bodyRec].trackIdentifiers.indexOf(FNV[name]);
    const iRoot = idxOf('J_Root'); const iOrigin = idxOf('J_anim_origin'); const iHips = idxOf('J_Hips'); const iVec = idxOf('vector');
    const frames = cam.frames;
    const camPosSeries = cam.get(0, 0);
    const camRotSeries = cam.get(0, 1);
    const tgtSeries = cam.get(1, 0);
    const fovSeries = cam.get(2, 0);
    fs.appendFileSync(path.join(OUT, 'progress.log'), `  decoded cam ${path.basename(file)} frames=${frames}\n`);
    const sampleFrames = [0, Math.floor(frames * 0.3), Math.floor(frames * 0.6), Math.floor(frames * 0.9)];
    for (const f of sampleFrames) {
      fs.appendFileSync(path.join(OUT, 'progress.log'), `   sample f=${f} A\n`);
      const camPos = camPosSeries[f];
      const camQ = quatFromHalfLog(camRotSeries[f] || [0, 0, 0]);
      const tgt = tgtSeries[Math.min(f, tgtSeries.length - 1)];
      const fov = fovSeries ? fovSeries[Math.min(f, fovSeries.length - 1)] : null;
      fs.appendFileSync(path.join(OUT, 'progress.log'), `   sample f=${f} B rotate\n`);
      const fwd = rotate(camQ, [0, 1, 0]);
      const up = rotate(camQ, [0, 0, 1]);
      const right = rotate(camQ, [1, 0, 0]);
      fs.appendFileSync(path.join(OUT, 'progress.log'), `   sample f=${f} C body\n`);
      const root = iRoot >= 0 ? body.get(iRoot, 0)[f] : null;
      const origin = iOrigin >= 0 ? body.get(iOrigin, 0)[f] : null;
      const hips = iHips >= 0 ? body.get(iHips, 0)[f] : null;
      const vec = iVec >= 0 ? body.get(iVec, 0)[f] : null;
      fs.appendFileSync(path.join(OUT, 'progress.log'), `   sample f=${f} D\n`);
      const s = { f, camPos: f2(camPos), tgt: f2(tgt), fov: f2(fov), fwd: f2(fwd), up: f2(up), right: f2(right), root: f2(root), origin: f2(origin), hips: f2(hips), vec: f2(vec), frameCount: frames };
      if (!camPos || !tgt || !fwd) { info.samples.push(s); continue; }
      s.angFwdToTgt = +angleDeg(fwd, sub(tgt, camPos)).toFixed(3);
      if (root) s.angFwdToRoot = +angleDeg(fwd, sub(root, camPos)).toFixed(3);
      if (origin) s.angFwdToOrigin = +angleDeg(fwd, sub(origin, camPos)).toFixed(3);
      if (hips) s.angFwdToHips = +angleDeg(fwd, sub(hips, camPos)).toFixed(3);
      s.distToTgt = +Math.hypot(...sub(tgt, camPos)).toFixed(2);
      if (root) s.distToRoot = +Math.hypot(...sub(root, camPos)).toFixed(2);
      if (origin) s.distToOrigin = +Math.hypot(...sub(origin, camPos)).toFixed(2);
      if (vec) s.tgtMinusRoot = f2(sub(tgt, root || [0, 0, 0]));
      if (root) s.upToWorldUp = +angleDeg(up, [0, 1, 0]).toFixed(2);
      info.samples.push(s);
    }
    result.entries[entry][phase] = info;
    fs.appendFileSync(path.join(OUT, 'progress.log'), `done ${entry} ${phase}\n`);
  }
}

fs.writeFileSync(path.join(OUT, 'native-camera-controls.json'), JSON.stringify(result, null, 1));
console.log('written native-camera-controls.json');
for (const entry of ENTRIES) for (const phase of PHASES) {
  const e = result.entries[entry][phase];
  console.log(`entry ${entry} phase ${phase}: camRec=${e.camRecIndex} bodyRec=${e.bodyRecIndex} recs=${e.records ? e.records.map((r) => r.tracks).join(',') : 'n/a'}`);
}


