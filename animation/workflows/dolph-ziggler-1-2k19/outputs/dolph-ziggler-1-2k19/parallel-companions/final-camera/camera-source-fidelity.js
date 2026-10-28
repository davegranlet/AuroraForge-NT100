'use strict';
// camera-source-fidelity.js — work order 03: exact decoded channel comparison of candidate A
// versus the source 2K19 camera record and the native 2K26 273 camera record, all phases.
// Read-only. Writes camera-source-fidelity.json (lane evidence) for the lead-facing result.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { rotationFrames, positionFrames, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const A_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-cam-A-orientation/staging/Animation/CaeAdvanced';
const V2_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const OUT = path.join(__dirname, 'camera-source-fidelity.json');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const CAMREC = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;
function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }
function quatAngleDeg(a, b) { return 2 * Math.acos(Math.min(1, Math.abs(dot(a, b)))) * 180 / Math.PI; }

function seriesHash(series) {
  const h = crypto.createHash('sha256');
  for (const row of series) for (const v of row) h.update(Buffer.from(Float64Array.of(v).buffer));
  return h.digest('hex').slice(0, 16).toUpperCase();
}
function decodeRecordAt(file, idx) {
  const parsed = parseClipsRecord(file, idx);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const get = (t, g) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[t * 6 + g * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    return evalGroup(stream, parsed.bones[t].groups[g], descs, parsed.rec.frameValue) || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  };
  return { idx, frames: parsed.rec.frameValue, pos: get(0, 0), rotHalf: get(0, 1), tgt: get(1, 0), t2: get(2, 0) };
}
function findCam(file) { return parseFile(file, { includeRaw: false }).records.findIndex((r) => r.trackIdentifiers.length === 3); }
const stats = (arr) => ({ mean: arr.reduce((s, v) => s + v, 0) / arr.length, max: Math.max(...arr) });

const srcCam = decode(fs.readFileSync(path.join(SHDC_DIR, fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2])));
const report = { schema: 'aurora-forge-parallel-companions/camera-source-fidelity-v1', generated: new Date().toISOString(), note: 'A = p14002-cam-A-orientation camera records; v2 = 9D94 source-camera records; native = 116 extract 1X0273.clips; source = 2K19 SHDC entry_2 sections A', phases: [], pass: true };

for (let pi = 0; pi < 5; pi++) {
  const phase = PHASES[pi], tag = TAGS[pi];
  const s = srcCam[pi * 2];
  const d = s.tracks[0].frameCount;
  const src = {
    frames: d + 1,
    pos: positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, d),
    rot: rotationFrames(s.tracks[0].primary, d),
    tgt: positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, d),
  };
  const aFile = path.join(A_DIR, `1${pi}14002.clips`);
  const v2File = path.join(V2_DIR, `1${pi}14002.clips`);
  const aPath = parseFile(aFile, { includeRaw: false });
  const aIdx = aPath.records.findIndex((r) => r.trackIdentifiers.length === 3);
  const v2Idx = findCam(v2File);
  const a = decodeRecordAt(aFile, aIdx);
  const v2 = decodeRecordAt(v2File, v2Idx);
  const natFile = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const nat = decodeRecordAt(natFile, CAMREC[phase]);
  const natParsed = parseFile(natFile, { includeRaw: false });
  const natRec = natParsed.records[CAMREC[phase]];
  const natPayloadBytes = fs.readFileSync(natFile).subarray(natRec.offset, natRec.offset + natRec.length);
  const aPayloadSize = aPath.records[aIdx].length;
  const aPayloadBytes = fs.readFileSync(aFile).subarray(aPath.records[aIdx].offset, aPath.records[aIdx].offset + aPayloadSize);

  const n = Math.min(src.frames, a.frames, nat.frames, v2.frames);
  const posAvsSrc = [], posAvsNat = [], tgtAvsSrc = [], tgtAvsNat = [], rotAvsSrc = [], rotAvsNat = [], rotV2vsSrc = [], fwdAvsSrc = [], fwdAvsNat = [], t2AvsNat = [];
  for (let f = 0; f < n; f += 3) {
    posAvsSrc.push(Math.hypot(...sub(a.pos[f], src.pos[f])));
    posAvsNat.push(Math.hypot(...sub(a.pos[f], nat.pos[f])));
    tgtAvsSrc.push(Math.hypot(...sub(a.tgt[f], src.tgt[f])));
    tgtAvsNat.push(Math.hypot(...sub(a.tgt[f], nat.tgt[f])));
    const qa = quatFromHalfLog(a.rotHalf[f]);
    rotAvsSrc.push(quatAngleDeg(qa, src.rot[f]));
    rotAvsNat.push(quatAngleDeg(qa, quatFromHalfLog(nat.rotHalf[f])));
    const qv2 = quatFromHalfLog(v2.rotHalf[f]);
    rotV2vsSrc.push(quatAngleDeg(qv2, src.rot[f]));
    fwdAvsSrc.push(angleDeg(rotate(qa, [0, 1, 0]), rotate(src.rot[f], [0, 1, 0])));
    fwdAvsNat.push(angleDeg(rotate(qa, [0, 1, 0]), rotate(quatFromHalfLog(nat.rotHalf[f]), [0, 1, 0])));
    t2AvsNat.push(Math.hypot(...sub(a.t2[f], nat.t2[f])));
  }
  const row = {
    phase, frames: src.frames,
    payloadHashes: {
      A: sha(aPayloadBytes),
      v2_9D94: sha(fs.readFileSync(v2File).subarray(parseFile(v2File, { includeRaw: false }).records[v2Idx].offset, parseFile(v2File, { includeRaw: false }).records[v2Idx].offset + parseFile(v2File, { includeRaw: false }).records[v2Idx].length)),
      native: sha(natPayloadBytes),
    },
    channelHashes: {
      A: { pos: seriesHash(a.pos), rot: seriesHash(a.rotHalf), tgt: seriesHash(a.tgt), t2: seriesHash(a.t2) },
      v2: { pos: seriesHash(v2.pos), rot: seriesHash(v2.rotHalf), tgt: seriesHash(v2.tgt), t2: seriesHash(v2.t2) },
      native: { pos: seriesHash(nat.pos), rot: seriesHash(nat.rotHalf), tgt: seriesHash(nat.tgt), t2: seriesHash(nat.t2) },
      source: { pos: seriesHash(src.pos), rot: seriesHash(src.rot), tgt: seriesHash(src.tgt), t2: null },
    },
    diffs: {
      pos_A_vs_source: stats(posAvsSrc),
      pos_A_vs_native: stats(posAvsNat),
      tgt_A_vs_source: stats(tgtAvsSrc),
      tgt_A_vs_native: stats(tgtAvsNat),
      rotQuat_A_vs_source_deg: stats(rotAvsSrc),
      rotQuat_A_vs_native_deg: stats(rotAvsNat),
      fwd_A_vs_source_deg: stats(fwdAvsSrc),
      fwd_A_vs_native_deg: stats(fwdAvsNat),
      rotQuat_v2_vs_source_deg: stats(rotV2vsSrc),
      t2_A_vs_native: stats(t2AvsNat),
    },
  };
  report.phases.push(row);
  console.log(`phase ${phase}: A-vs-source rot ${row.diffs.rotQuat_A_vs_source_deg.mean}/${row.diffs.rotQuat_A_vs_source_deg.max}deg (v2 ${row.diffs.rotQuat_v2_vs_source_deg.mean}deg) | A-vs-native rot ${row.diffs.rotQuat_A_vs_native_deg.mean}/${row.diffs.rotQuat_A_vs_native_deg.max} | pos A-src ${row.diffs.pos_A_vs_source.max} A-nat ${row.diffs.pos_A_vs_native.mean} | tgt A-src ${row.diffs.tgt_A_vs_source.max} A-nat ${row.diffs.tgt_A_vs_native.mean} | t2 A-nat ${row.diffs.t2_A_vs_native.max}`);
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log('written', OUT);
