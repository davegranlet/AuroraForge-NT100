'use strict';
// camera-correlate.js — decode native c0 records (phase 100..140) and source entry_2
// camera series; compute Pearson correlation for candidate track pairings.
const fs = require('node:fs');
const path = require('node:path');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { rotationFrames, positionFrames } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SHDC = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const PHASES = [100, 110, 120, 130, 140];
const CAMERA_RECORD = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 };

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return num / Math.sqrt(da * db || 1);
}

// native series
const native = {};
for (const phase of PHASES) {
  const file = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const parsed = parseClipsRecord(file, CAMERA_RECORD[phase]);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = [];
  for (const bone of parsed.bones) {
    const groups = [];
    for (let g = 0; g < bone.groups.length; g++) {
      const descs = [];
      for (let s = 0; s < 3; s++) {
        const e = parsed.rec.raw.group78[bone.track * 6 + g * 3 + s];
        descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
      }
      groups.push(evalGroup(stream, bone.groups[g], descs, parsed.rec.frameValue));
    }
    tracks.push(groups);
  }
  native[phase] = { frames: parsed.rec.frameValue, tracks };
}

// source series
const camBytes = fs.readFileSync(path.join(SHDC, fs.readdirSync(SHDC).filter((f) => f.endsWith('.bin')).sort()[2]));
const sections = decode(camBytes);
const source = {};
for (let si = 0; si < sections.length; si++) {
  const s = sections[si];
  const duration = s.tracks[0].frameCount;
  const tracks = s.tracks.map((t) => ({
    q: rotationFrames(t.primary, duration),
    p: t.secondary ? positionFrames(t.secondary, t.quantizationCandidates, duration) : null,
  }));
  source[si] = { frames: duration + 1, tracks };
}

// correlate native t? vs source sections of the same phase
const pairs = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
const report = {};
PHASES.forEach((phase, pi) => {
  const [sa, sb] = pairs[pi];
  report[phase] = {};
  for (const nt of [0, 1, 2]) {
    const ng = native[phase].tracks[nt];
    const nPos = ng[0]; const nRot = ng[1];
    for (const [tag, secIdx, st] of [['A', sa, 0], ['B', sb, 0], ['A1', sa, 1], ['B1', sb, 1]]) {
      const s = source[secIdx].tracks[st];
      if (!nPos || !s.p) continue;
      const cx = pearson(nPos.map((r) => r[0]), s.p.map((r) => r[0]));
      const cy = pearson(nPos.map((r) => r[1]), s.p.map((r) => r[1]));
      const cz = pearson(nPos.map((r) => r[2]), s.p.map((r) => r[2]));
      const key = `t${nt}.pos vs ${tag}.t${st}.pos`;
      report[phase][key] = { x: +cx.toFixed(4), y: +cy.toFixed(4), z: +cz.toFixed(4) };
      if (nRot) {
        const cq0 = pearson(nRot.map((r) => r[0]), s.q.map((r) => r[0]));
        const cq1 = pearson(nRot.map((r) => r[1]), s.q.map((r) => r[1]));
        const cq2 = pearson(nRot.map((r) => r[2]), s.q.map((r) => r[2]));
        report[phase][`t${nt}.rot vs ${tag}.t${st}.rot`] = { x: +cq0.toFixed(4), y: +cq1.toFixed(4), z: +cq2.toFixed(4) };
      }
    }
  }
});
console.log(JSON.stringify(report, null, 1));
fs.writeFileSync(path.join(__dirname, 'camera-correlation.json'), JSON.stringify(report, null, 1));
