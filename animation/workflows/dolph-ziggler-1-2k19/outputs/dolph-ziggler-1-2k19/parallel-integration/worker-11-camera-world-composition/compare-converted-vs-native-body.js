'use strict';
// worker-11 lane — compare the converted 14002 body record (0FAE) against the native 2K26 273 body
// record, per phase, all frames, matched by track identifier. Read-only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { rotate } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const OUT = __dirname;
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const BUILT_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-pairfix-v2/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const fnv = (s) => { let h = 0xcbf29ce484222325n; for (const c of Buffer.from(s, 'ascii')) { h ^= BigInt(c); h = BigInt.asUintN(64, h * 0x100000001b3n); } return '0x' + h.toString(16).toUpperCase().padStart(16, '0'); };
const quat = (v) => { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const a = v.map((x) => x / s); return [Math.cos(s), a[0] * Math.sin(s), a[1] * Math.sin(s), a[2] * Math.sin(s)]; };
const angQ = (a, b) => { const d = Math.abs(a.reduce((s, x, i) => s + x * b[i], 0)); return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI; };

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

const out = { schema: 'worker-11/converted-vs-native-273-body-v1', generated: new Date().toISOString(), phases: [] };
for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi];
  const natFile = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const bufFile = path.join(BUILT_DIR, `1${pi}14002.clips`);
  const natLayout = parseFile(natFile, { includeRaw: false });
  const bufLayout = parseFile(bufFile, { includeRaw: false });
  const natBodyIdx = natLayout.records.findIndex((r) => r.trackIdentifiers.length >= 60);
  const bufBodyIdx = bufLayout.records.findIndex((r) => r.trackIdentifiers.length >= 60);
  const nat = decode(natFile, natBodyIdx);
  const buf = decode(bufFile, bufBodyIdx);
  const natIds = natLayout.records[natBodyIdx].trackIdentifiers;
  const bufIds = bufLayout.records[bufBodyIdx].trackIdentifiers;
  const frames = Math.min(nat.frames, buf.frames);
  const perTrack = [];
  for (let t = 0; t < natIds.length; t++) {
    const id = natIds[t];
    const bt = bufIds.indexOf(id);
    if (bt < 0) { perTrack.push({ id, missing: true }); continue; }
    const np = nat.get(t, 0), bp = buf.get(bt, 0);
    const nr = nat.get(t, 1), br = buf.get(bt, 1);
    let maxP = 0, sumP = 0, maxR = 0, sumR = 0;
    for (let f = 0; f < frames; f++) {
      const dp = Math.hypot(np[f][0] - bp[f][0], np[f][1] - bp[f][1], np[f][2] - bp[f][2]);
      maxP = Math.max(maxP, dp); sumP += dp;
      const dr = angQ(quat(nr[f]), quat(br[f]));
      maxR = Math.max(maxR, dr); sumR += dr;
    }
    perTrack.push({ id, index: t, bufIndex: bt, maxPos: +maxP.toFixed(4), meanPos: +(sumP / frames).toFixed(4), maxRotDeg: +maxR.toFixed(4), meanRotDeg: +(sumR / frames).toFixed(4), firstPosNat: np[0], firstPosBuf: bp[0], lastPosNat: np[frames - 1], lastPosBuf: bp[frames - 1] });
  }
  const roots = ['J_Root', 'J_anim_origin', 'J_Hips', 'vector', 'base'].map((n) => perTrack.find((x) => x.id === fnv(n)) || { name: n, missing: true });
  out.phases.push({ phase, natFrames: nat.frames, bufFrames: buf.frames, trackCountNat: natIds.length, trackCountBuf: bufIds.length, roots, tracks: perTrack });
  console.log(`phase ${phase}: natFrames ${nat.frames} bufFrames ${buf.frames} tracks ${natIds.length}/${bufIds.length}`);
  for (const r of roots) console.log(`  ${JSON.stringify(r).slice(0, 400)}`);
  const worstPos = [...perTrack].filter((x) => !x.missing).sort((a, b) => b.maxPos - a.maxPos).slice(0, 6);
  console.log('  worst pos:', worstPos.map((x) => `${x.id} max ${x.maxPos} mean ${x.meanPos}`).join(' | '));
  const worstRot = [...perTrack].filter((x) => !x.missing).sort((a, b) => b.maxRotDeg - a.maxRotDeg).slice(0, 6);
  console.log('  worst rot:', worstRot.map((x) => `${x.id} max ${x.maxRotDeg} mean ${x.meanRotDeg}`).join(' | '));
}
fs.writeFileSync(path.join(OUT, 'converted-vs-native-273-body.json'), JSON.stringify(out, null, 1));
console.log('written converted-vs-native-273-body.json');
