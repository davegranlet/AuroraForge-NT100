'use strict';
// verify-camera-roundtrip.js — decode the generated camera records with the canonical
// tools and compare against the source-derived series and the retained template series.
// Writes camera-roundtrip-report.json; exits nonzero on any check failure.
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');
const { rotationFrames, positionFrames, halfLog } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');

const OUT = path.join(__dirname, 'output');
const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_2 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[2];
const PHASES = [100, 110, 120, 130, 140];

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

function maxError(a, b) {
  if (a.length !== b.length) throw new Error(`length mismatch ${a.length} vs ${b.length}`);
  let max = 0, at = null;
  for (let i = 0; i < a.length; i++) for (let c = 0; c < 3; c++) {
    const e = Math.abs(a[i][c] - b[i][c]);
    if (e > max) { max = e; at = { frame: i, channel: c, out: a[i][c], expected: b[i][c] }; }
  }
  return { max, at };
}

const camBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_2));
const sections = decode(camBytes);
const report = { schema: 'aurora-forge-parallel-companions/camera-roundtrip-v1', generated: new Date().toISOString(), phases: [], pass: true };

PHASES.forEach((phase, pi) => {
  const file = path.join(OUT, 'camera-c0', `${phase}-camera-c0.clips`);
  const structural = parseFile(file, { includeRaw: false });
  const rec = structural.records[0];
  const okStructure = structural.count === 1 && rec.trackIdentifiers.length === 3;
  const { parsed, tracks } = decodeRecordSeries(file, 0);
  const secA = sections[pi * 2], secB = sections[pi * 2 + 1];
  const duration = secA.tracks[0].frameCount;
  const q0 = rotationFrames(secA.tracks[0].primary, duration);
  const p0 = positionFrames(secA.tracks[0].secondary, secA.tracks[0].quantizationCandidates, duration);
  const p1 = positionFrames(secA.tracks[1].secondary, secA.tracks[1].quantizationCandidates, duration);
  const h0 = q0.map(halfLog);
  const e0 = maxError(tracks[0][0], p0);
  const er0 = maxError(tracks[0][1], h0);
  const e1 = maxError(tracks[1][0], p1);

  const nativeFile = `D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/${phase}0273.clips`;
  const nativeRec = { 100: 3, 110: 3, 120: 3, 130: 4, 140: 3 }[phase];
  const native = decodeRecordSeries(nativeFile, nativeRec);
  const e2 = maxError(tracks[2][0], native.tracks[2][0]);

  const pass = okStructure && e0.max < 2 ** -9 && er0.max < 2 ** -22 && e1.max < 2 ** -9 && e2.max < 2 ** -16;
  report.phases.push({
    phase, file, frames: rec.frameValue, expectedFrames: duration + 1,
    structural: { records: structural.count, tracks: rec.trackIdentifiers.length, pass: okStructure },
    t0_position_max_error: e0, t0_rotation_halfLog_max_error: er0, t1_position_max_error: e1, t2_native_retention_max_error: e2,
    pass,
  });
  if (!pass) report.pass = false;
  console.log(`phase ${phase}: struct ${okStructure ? 'OK' : 'FAIL'} | t0.pos ${e0.max.toExponential(2)} | t0.rot ${er0.max.toExponential(2)} | t1.pos ${e1.max.toExponential(2)} | t2 retention ${e2.max.toExponential(2)} | ${pass ? 'PASS' : 'FAIL'}`);
});
fs.writeFileSync(path.join(OUT, '..', 'camera-roundtrip-report.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
if (!report.pass) process.exitCode = 1;
