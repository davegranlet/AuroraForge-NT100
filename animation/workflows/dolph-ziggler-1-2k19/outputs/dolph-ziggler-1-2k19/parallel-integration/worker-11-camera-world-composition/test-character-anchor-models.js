'use strict';
// worker-11 lane — test which character-world model the native camera records frame.
// Read-only. Compares camera fwd direction against three candidate character anchors.
const fs = require('node:fs');
const path = require('node:path');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { rotate } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const OUT = __dirname;
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const CAMSET = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1', '0x188FD8CF51F19C95'];
const FNV = { 'J_Root': '0x1F4DA262FC146772', 'J_anim_origin': '0x11558A1746547CA2' };
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
function quat(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }

function decode(file, recIndex) {
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
  return { frames: parsed.rec.frameValue, get };
}

const summary = {};
for (const entry of [273, 161, 144, 142, 708, 494, 174]) {
  summary[entry] = {};
  for (const phase of [100, 120, 140]) {
    const file = path.join(NATIVE_DIR, `${phase}0${String(entry).padStart(3, '0')}.clips`);
    if (!fs.existsSync(file)) continue;
    const layout = parseFile(file, { includeRaw: false });
    const camRec = layout.records.findIndex((r) => r.trackIdentifiers.length === 3 && r.trackIdentifiers.every((id) => CAMSET.includes(id)));
    const bodyRec = layout.records.findIndex((r) => r.trackIdentifiers.length >= 60);
    if (camRec < 0 || bodyRec < 0) continue;
    const cam = decode(file, camRec);
    const body = decode(file, bodyRec);
    const ids = layout.records[bodyRec].trackIdentifiers;
    const iRoot = ids.indexOf(FNV.J_Root); const iOrigin = ids.indexOf(FNV['J_anim_origin']);
    const camPos = cam.get(0, 0); const camRot = cam.get(0, 1); const tgt = cam.get(1, 0);
    const root = iRoot >= 0 ? body.get(iRoot, 0) : null;
    const origin = iOrigin >= 0 ? body.get(iOrigin, 0) : null;
    const frames = cam.frames;
    const stats = { frames, models: { origin_plus_root: [], root_only: [], origin_only: [] }, aimToTgt: [] };
    for (let f = 0; f < frames; f += 3) {
      const q = quat(camRot[f]);
      const fwd = rotate(q, [0, 1, 0]);
      const cp = camPos[f];
      if (root && origin) stats.models.origin_plus_root.push(angleDeg(fwd, sub(origin[f].map((x, i) => x + root[f][i]), cp)));
      if (root) stats.models.root_only.push(angleDeg(fwd, sub(root[f], cp)));
      if (origin) stats.models.origin_only.push(angleDeg(fwd, sub(origin[f], cp)));
      stats.aimToTgt.push(angleDeg(fwd, sub(tgt[f], cp)));
    }
    const agg = {};
    for (const [k, arr] of Object.entries(stats.models)) {
      if (!arr.length) continue;
      const sorted = [...arr].sort((a, b) => a - b);
      agg[k] = {
        mean: +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(2),
        fracLt30: +(arr.filter((x) => x < 30).length / arr.length).toFixed(3),
        fracLt60: +(arr.filter((x) => x < 60).length / arr.length).toFixed(3),
        p10: +sorted[Math.floor(arr.length * 0.1)].toFixed(2),
        p50: +sorted[Math.floor(arr.length * 0.5)].toFixed(2),
        p90: +sorted[Math.floor(arr.length * 0.9)].toFixed(2),
      };
    }
    const sortedT = [...stats.aimToTgt].sort((a, b) => a - b);
    agg.aimToTgt = { mean: +(stats.aimToTgt.reduce((s, x) => s + x, 0) / stats.aimToTgt.length).toFixed(3), p50: +sortedT[Math.floor(sortedT.length * 0.5)].toFixed(3), p90: +sortedT[Math.floor(sortedT.length * 0.9)].toFixed(3) };
    summary[entry][phase] = { frames, angleStats: agg };
    console.log(`entry ${entry} phase ${phase} (n=${stats.models.root_only.length}):`, JSON.stringify(agg));
  }
}
fs.writeFileSync(path.join(OUT, 'character-anchor-model-test.json'), JSON.stringify(summary, null, 1));
console.log('written character-anchor-model-test.json');
