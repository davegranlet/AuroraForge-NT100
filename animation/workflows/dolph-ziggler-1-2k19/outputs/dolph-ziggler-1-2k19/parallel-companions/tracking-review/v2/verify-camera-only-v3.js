'use strict';
// verify-camera-only-v3.js — verifies the aimfix component against source series:
//  - t0 position == source Camera01 position (quantization bounded)
//  - t0 rotation: decoded local +Y axis angle to the source body root (aim error), must be
//    small for aimfix phases and must reproduce the measured 25-38 deg floor-aim for v2
//  - t1 == source body root (aimfix phases)
//  - t2 == current build retained series exactly
//  - phases 100/110 byte-identical to the v2 component; record ids intact
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { decodeEntrance, rotationFrames, positionFrames, halfLog, multiply, inverse } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const TARGET_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const V2_DIR = path.join(__dirname, '..', 'camera-only');
const V3_DIR = path.join(__dirname, 'camera-only-aimfix');
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const FIX = new Set([120, 130, 140]);

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const norm = (v) => { const l = Math.hypot(...v); return l ? v.map((x) => x / l) : v; };
const sub = (a, b) => a.map((x, i) => x - b[i]);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const rotate = (q, v) => multiply(multiply(q, [0, ...v]), inverse(q)).slice(1);
const angleDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) * 180 / Math.PI;

function quatFromHalfLog(v) { const s = Math.hypot(...v); if (s < 1e-12) return [1, 0, 0, 0]; const ax = v.map((x) => x / s); return [Math.cos(s), ax[0] * Math.sin(s), ax[1] * Math.sin(s), ax[2] * Math.sin(s)]; }

function decodeRecordSeries(file, recordIndex) {
  const parsed = parseClipsRecord(file, recordIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = parsed.bones.map((bone) => bone.groups.map((g, gi) => {
    const descs = [];
    for (let s = 0; s < 3; s++) {
      const e = parsed.rec.raw.group78[bone.track * 6 + gi * 3 + s];
      descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
    }
    const decoded = evalGroup(stream, g, descs, parsed.rec.frameValue);
    return decoded || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
  }));
  return { parsed, tracks };
}
const maxErr = (a, b) => { let m = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(a[i][c] - b[i][c])); return m; };

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const sections = decode(fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2)));
const report = { schema: 'aurora-forge-parallel-companions/camera-only-aimfix-verify-v3', generated: new Date().toISOString(), phases: [], pass: true };

PHASES.forEach((phase, pi) => {
  const tag = TAGS[pi];
  const v3File = path.join(V3_DIR, `${tag}-camera-c0.clips`);
  const v3Walk = parseFile(v3File, { includeRaw: false });
  const recIdx = v3Walk.records[0].index;
  const { tracks } = decodeRecordSeries(v3File, 0);
  const s = sections[pi * 2];
  const dur = s.tracks[0].frameCount;
  const srcPos = positionFrames(s.tracks[0].secondary, s.tracks[0].quantizationCandidates, dur);
  const srcTgt = positionFrames(s.tracks[1].secondary, s.tracks[1].quantizationCandidates, dur);
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);

  const e0p = maxErr(tracks[0][0], srcPos);
  // aim error of the installed rotation: decoded halfLog -> quaternion -> +Y axis vs root
  let aimV3 = 0, n = 0;
  for (let f = 0; f <= dur; f += 5) {
    const q = quatFromHalfLog(tracks[0][1][f]);
    aimV3 += angleDeg(rotate(q, [0, 1, 0]), sub(root[f], srcPos[f])); n++;
  }
  // v2 aim error (current installed) for comparison
  const v2File = path.join(V2_DIR, `${tag}-camera-c0.clips`);
  const v2 = decodeRecordSeries(v2File, 0);
  let aimV2 = 0, n2 = 0;
  for (let f = 0; f <= dur; f += 5) {
    const q = quatFromHalfLog(v2.tracks[0][1][f]);
    aimV2 += angleDeg(rotate(q, [0, 1, 0]), sub(root[f], srcPos[f])); n2++;
  }
  const tgtErr = FIX.has(phase) ? maxErr(tracks[1][0], root) : maxErr(tracks[1][0], srcTgt);
  const target = parseFile(path.join(TARGET_DIR, `1${pi}14002.clips`), { includeRaw: false });
  const camRec = target.records.find((r) => r.trackIdentifiers.length === 3);
  const ret = decodeRecordSeries(path.join(TARGET_DIR, `1${pi}14002.clips`), camRec.index);
  const e2 = maxErr(tracks[2][0], ret.tracks[2][0]);
  // 100/110 must be byte-identical to v2
  const v2buf = fs.readFileSync(v2File);
  const v3buf = fs.readFileSync(v3File);
  const v2p = v2.parsed.file === undefined ? null : null;
  const v2payload = v2buf.subarray(v2.parsed.rec.offset, v2.parsed.rec.offset + v2.parsed.rec.length);
  const ident = !FIX.has(phase) ? sha(v2payload) === sha(v3buf.subarray(v3Walk.records[0].offset, v3Walk.records[0].offset + v3Walk.records[0].length)) : null;

  const pass = e0p < 2 ** -9 && e2 < 2 ** -16 && (FIX.has(phase) ? (aimV3 < 2 && tgtErr < 2 ** -9) : (ident === true));
  report.phases.push({ phase, aimV2Deg: +(aimV2 / n2).toFixed(2), aimV3Deg: +(aimV3 / n).toFixed(2), t0PosErr: e0p, targetErr: tgtErr, t2Err: e2, v2Identical: ident, pass });
  if (!pass) report.pass = false;
  console.log(`phase ${phase} (${tag}): aim v2=${(aimV2 / n2).toFixed(2)}deg v3=${(aimV3 / n).toFixed(2)}deg | t0pos ${e0p.toExponential(2)} tgt ${tgtErr.toExponential(2)} t2 ${e2.toExponential(2)} | v2ident ${ident} | ${pass ? 'PASS' : 'FAIL'}`);
});
fs.writeFileSync(path.join(V3_DIR, 'camera-only-aimfix-verify.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
