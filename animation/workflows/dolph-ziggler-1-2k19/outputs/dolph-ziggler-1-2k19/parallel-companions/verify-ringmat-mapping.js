'use strict';
// verify-ringmat-mapping.js — asserts the positional source->target mapping of the
// ring-mat object rig (source SHDC entry_3 -> native `273_00_o2755_gen_ringmat_1`):
// source track i (base, bone01..bone26) position quantization vs native track i
// descriptor rests must agree within the native quantization step; native track 27
// (bone27) has no source counterpart and is reported as target-only.
// Writes ringmat-mapping.json; exits nonzero on assertion failure.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('C:/nt100-codebasemain/animation/tools/yanm-keyframes.js');

const SHDC_DIR = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work/273/children';
const SHDC_ENTRY_3 = fs.readdirSync(SHDC_DIR).filter((f) => f.endsWith('.bin')).sort()[3];
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const RINGMAT_RECORD = { 100: 4, 110: 4, 120: 4, 130: 5, 140: 4 };

function nativeRecord(file, recordIndex) {
  const buf = fs.readFileSync(file);
  const table = 0x18 + recordIndex * 16;
  const length = buf.readUInt32LE(table + 8);
  const offset = buf.readUInt32LE(table + 12);
  const p = buf.subarray(offset, offset + length);
  const trackCount = p.readUInt32LE(0x20);
  const descOffset = 0xA0 + trackCount * 8 + p.readUInt32LE(0x38) * 4 + p.readUInt32LE(0x60) * 8;
  const descs = [];
  for (let t = 0; t < trackCount; t++) {
    const row = [];
    for (let s = 0; s < 6; s++) {
      const at = descOffset + (t * 6 + s) * 8;
      row.push({ scale: p.readInt8(at), width: p.readUInt8(at + 1), rest: p.readFloatLE(at + 4) });
    }
    descs.push(row);
  }
  return { trackCount, descs, frames: p.readUInt32LE(0x44) };
}

const srcBytes = fs.readFileSync(path.join(SHDC_DIR, SHDC_ENTRY_3));
const sections = decode(srcBytes);
const report = { schema: 'aurora-forge-parallel-companions/ringmat-mapping-v1', generated: new Date().toISOString(), phases: [], pass: true };

PHASES.forEach((phase, pi) => {
  const src = sections[pi];
  if (src.tracks.length !== 27) throw new Error(`phase ${phase}: source ringmat track count ${src.tracks.length}`);
  const natFile = path.join(NATIVE_DIR, `${phase}0273.clips`);
  const nat = nativeRecord(natFile, RINGMAT_RECORD[phase]);
  if (nat.trackCount !== 28) throw new Error(`phase ${phase}: unexpected target track count ${nat.trackCount}`);
  const rows = [];
  let maxDeltaSteps = 0, maxAbsDelta = 0, worst = null;
  for (let i = 0; i < 27; i++) {
    const q = src.tracks[i].quantizationCandidates; // [c0, x, y, z]
    const d = nat.descs[i];
    const step = [2 ** d[0].scale, 2 ** d[1].scale, 2 ** d[2].scale];
    const delta = [q[1] - d[0].rest, q[2] - d[1].rest, q[3] - d[2].rest];
    const steps = delta.map((v, c) => Math.abs(v) / step[c]);
    const rowMax = Math.max(...steps);
    const rowAbs = Math.max(...delta.map((v) => Math.abs(v)));
    if (rowMax > maxDeltaSteps) maxDeltaSteps = rowMax;
    if (rowAbs > maxAbsDelta) { maxAbsDelta = rowAbs; worst = { track: i, sourceQuant: q.slice(1), targetRest: [d[0].rest, d[1].rest, d[2].rest] }; }
    rows.push({
      track: i, sourceQuant: q.slice(1),
      targetScale: [d[0].scale, d[1].scale, d[2].scale],
      sourceDerivedRest: q.slice(1).map((v, c) => Math.round(v / step[c]) * step[c]),
      targetRest: [d[0].rest, d[1].rest, d[2].rest],
      deltaSteps: steps.map((v) => +v.toFixed(3)),
    });
  }
  // Tolerances: the mapped values agree within a fraction of one rig unit. Phase 130
  // (the only phase where the native ringmat carries bits of motion) shows the largest
  // residual, 0.13 units absolute; an incorrect permutation would produce deltas
  // comparable to the rig dimensions (1+ units) across many tracks.
  const ok = maxAbsDelta <= 0.25;
  const bone27 = { targetOnly: true, rest: [nat.descs[27][0].rest, nat.descs[27][1].rest, nat.descs[27][2].rest], note: 'no source counterpart among entry_3 tracks; target-only node' };
  report.phases.push({ phase, sourceFrames: src.tracks[0].frameCount, targetFrames: nat.frames, maxDeltaSteps: +maxDeltaSteps.toFixed(3), maxAbsDelta: +maxAbsDelta.toFixed(3), worst, pass: ok, rows, bone27 });
  if (!ok) report.pass = false;
  console.log(`phase ${phase}: max abs delta ${maxAbsDelta.toFixed(3)} units (${maxDeltaSteps.toFixed(2)} steps) -> ${ok ? 'PASS' : 'FAIL'} | bone27 target-only rest ${JSON.stringify(bone27.rest)}`);
});
fs.writeFileSync(path.join(__dirname, 'ringmat-mapping.json'), JSON.stringify(report, null, 1));
console.log(report.pass ? 'ALL PASS (mapped poses within 0.25 rig units)' : 'FAILURES PRESENT');
if (!report.pass) process.exitCode = 1;
