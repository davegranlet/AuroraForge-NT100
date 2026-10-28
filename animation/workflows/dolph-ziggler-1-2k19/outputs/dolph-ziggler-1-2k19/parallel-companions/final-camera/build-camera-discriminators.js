'use strict';
// build-camera-discriminators.js — FINAL-CAMERA lane, three separated offline components
// built on the exact 9D94 (source-camera) baseline. Only the camera record changes; every
// other record and every other channel is re-encoded from the decoded baseline series.
//
//   A  orientation-only : track0 rotation <- aim673B rotation (active/+Y aims at body root);
//                         track1 target, position, third channel = 9D94 exact.
//   B  target-only      : track1 target <- body root; rotation, position, third = 9D94 exact.
//   C  conj-probe       : track0 rotation <- CONJUGATE of aim673B rotation (diagnostic probe
//                         for an inverted/conjugate consumer; NOT source-correct, label kept).
//
// Positions/body/facial/third channel exact; record identity preserved. No install.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, positionFrames, rotationFrames, halfLog, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { build, parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const BASE_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const V3_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-companions/tracking-review/v2/camera-only-aimfix';
const OUT = __dirname;
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }

function decodeCamSeries(file) {
  const parsed = parseFile(file, { includeRaw: false });
  const camIdx = parsed.records.findIndex((r) => r.trackIdentifiers.length === 3);
  const buf = fs.readFileSync(file);
  const rec = parsed.records[camIdx];
  const payload = Buffer.from(buf.subarray(rec.offset, rec.offset + rec.length));
  const p = parseClipsRecord(file, camIdx);
  const stream = p.file.subarray(p.base, p.base + p.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = p.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, p.bones[t].groups[g], descs, p.rec.frameValue) || Array.from({ length: p.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { file, camIdx, payload, id: rec.id, frames: rec.frameValue, pos: get(0, 0), rotHalf: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}

function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('non-finite camera series');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('camera series exceeds encoding range');
  return { scale, width, rest };
}

function encodeRecord(payload, series) {
  const frames = payload.readUInt32LE(0x44);
  const descCount = payload.readUInt32LE(0x78);
  const descOffset = 0xA0 + 3 * 8 + payload.readUInt32LE(0x38) * 4 + payload.readUInt32LE(0x60) * 8;
  const prefix = Buffer.from(payload.subarray(0, descOffset + descCount * 8));
  const writeDescs = (track, group, descs) => {
    for (let c = 0; c < 3; c++) {
      const at = descOffset + (track * 6 + group * 3 + c) * 8;
      prefix.writeInt8(descs[c].scale, at);
      prefix.writeUInt8(descs[c].width, at + 1);
      prefix.writeFloatLE(descs[c].rest, at + 4);
    }
  };
  const parts = [];
  const push = (track, group, rows, scale) => {
    const descs = [0, 1, 2].map((c) => descriptorFixed(rows.map((r) => r[c]), scale));
    writeDescs(track, group, descs);
    const w = encodeDenseGroup(rows, descs);
    if (w.clampCount) throw new Error(`clamp t${track} g${group}`);
    parts.push(w);
  };
  push(0, 0, series.pos, POS_SCALE);
  push(0, 1, series.rotHalf, ROT_SCALE);
  push(1, 0, series.tgt, POS_SCALE);
  writeDescs(1, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));
  push(2, 0, series.t2, T2_SCALE);
  writeDescs(2, 1, [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }]);
  parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));
  const writer = concatWriters(parts);
  const bitLength = writer.bitLength();
  const packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);
  prefix.writeUInt32LE(frames, 0x44);
  prefix.writeUInt32LE(group.length / 8, 0x90);
  prefix.writeUInt32LE(Math.ceil(bitLength / 64), 0x94);
  prefix.writeUInt32LE(bitLength, 0x9c);
  return Buffer.concat([prefix, group]);
}

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const manifest = { schema: 'aurora-forge-parallel-companions/final-camera-discriminators-v1', generated: new Date().toISOString(), baseline: BASE_DIR, phases: [], pass: true };

for (let pi = 0; pi < 5; pi++) {
  const tag = TAGS[pi];
  const baseFile = path.join(BASE_DIR, `1${pi}14002.clips`);
  const base = decodeCamSeries(baseFile);
  const v3 = decodeCamSeries(path.join(V3_DIR, `${tag}-camera-c0.clips`));
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const rootPath = hips.map((h, f) => [h[0], vec[f][1], h[2]]);

  const variants = {
    A: { pos: base.pos, rotHalf: v3.rotHalf, tgt: base.tgt, t2: base.t2 },
    B: { pos: base.pos, rotHalf: base.rotHalf, tgt: rootPath, t2: base.t2 },
    C: { pos: base.pos, rotHalf: v3.rotHalf.map((r) => { const q = quatFromHalfLog(r); const qc = [q[0], -q[1], -q[2], -q[3]]; return halfLog(qc); }), tgt: base.tgt, t2: base.t2 },
  };

  for (const [name, series] of Object.entries(variants)) {
    const payload = encodeRecord(base.payload, series);
    const outFile = path.join(OUT, `${name}-${tag}-camera.clips`);
    fs.writeFileSync(outFile, build([payload]));
    manifest.phases.push({ phase: PHASES[pi], tag, variant: name, file: outFile.replace(/\\/g, '/'), bytes: payload.length, sha256: sha(payload), recordId: base.id, frames: base.frames });
    console.log(`${name} ${tag}: ${payload.length} bytes sha ${sha(payload).slice(0, 12)}`);
  }
}
fs.writeFileSync(path.join(OUT, 'discriminators-manifest.json'), JSON.stringify(manifest, null, 1));
console.log('written discriminators-manifest.json');
