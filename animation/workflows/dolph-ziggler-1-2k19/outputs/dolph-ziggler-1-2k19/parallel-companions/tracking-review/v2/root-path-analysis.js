'use strict';
// root-path-analysis.js — compare the SOURCE body root path, the NATIVE 2K26 273 body root
// path, and the CONVERTED 14002 body root path (9D94 staging), per phase, with continuity
// across phases. This tests whether the derived target root lives in the same world segment
// as the source camera expects, and whether phase joins are continuous or phase-local.
const fs = require('node:fs');
const path = require('node:path');
const { decodeEntrance } = require('C:/nt100-codebasemain/animation/tools/decode-2k19-entrance-source.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const SOURCE_ENTRANCE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const NATIVE_DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const CONVERTED_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];

function seriesOfRecord(file, recordIndex, track, group) {
  const parsed = parseClipsRecord(file, recordIndex);
  if (!parsed.bones[track]) return null;
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descs = [];
  for (let s = 0; s < 3; s++) {
    const e = parsed.rec.raw.group78[track * 6 + group * 3 + s];
    descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
  }
  const decoded = evalGroup(stream, parsed.bones[track].groups[group], descs, parsed.rec.frameValue);
  return decoded || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
}
function findRecord(file, trackCount) {
  const buf = fs.readFileSync(file);
  const count = buf.readUInt32LE(0x10);
  for (let i = 0; i < count; i++) {
    const t = 0x18 + i * 16;
    const off = buf.readUInt32LE(t + 12);
    if (buf.readUInt32LE(off + 0x20) === trackCount) return i;
  }
  return -1;
}
const f3 = (v) => v.map((x) => +x.toFixed(1));
const ranges = (ser, c) => { const a = ser.map((r) => r[c]); return [+Math.min(...a).toFixed(1), +Math.max(...a).toFixed(1)]; };

const entrance = decodeEntrance(SOURCE_ENTRANCE);
const report = { schema: 'aurora-forge-parallel-companions/root-path-analysis-v1', generated: new Date().toISOString(), phases: [] };

console.log('== SOURCE body root path (hips x/z + vector y) ==');
for (let pi = 0; pi < 5; pi++) {
  const motion = entrance.phases[pi].sourceTracks;
  const hips = motion[1].p, vec = motion[61].p;
  const root = hips.map((h, f) => [h[0], vec[f][1], h[2]]);
  console.log(` phase ${PHASES[pi]}: start ${JSON.stringify(f3(root[0]))} end ${JSON.stringify(f3(root[root.length - 1]))} x${JSON.stringify(ranges(root, 0))} y${JSON.stringify(ranges(root, 1))} z${JSON.stringify(ranges(root, 2))}`);
  report.phases[pi] = report.phases[pi] || { phase: PHASES[pi] };
  report.phases[pi].source = { start: f3(root[0]), end: f3(root[root.length - 1]), ranges: [ranges(root, 0), ranges(root, 1), ranges(root, 2)] };
}

console.log('== NATIVE 2K26 273 body root (track62) and hips (track1) ==');
for (let pi = 0; pi < 5; pi++) {
  const file = path.join(NATIVE_DIR, `${PHASES[pi]}0273.clips`);
  const rec = findRecord(file, 64);
  const root62 = seriesOfRecord(file, rec, 62, 0);
  const hips1 = seriesOfRecord(file, rec, 1, 0);
  console.log(` phase ${PHASES[pi]} (rec ${rec}): t62 start ${JSON.stringify(f3(root62[0]))} end ${JSON.stringify(f3(root62[root62.length - 1]))} x${JSON.stringify(ranges(root62, 0))} y${JSON.stringify(ranges(root62, 1))} z${JSON.stringify(ranges(root62, 2))}`);
  console.log(`            t1 hips start ${JSON.stringify(f3(hips1[0]))} end ${JSON.stringify(f3(hips1[hips1.length - 1]))}`);
  report.phases[pi].native = { record: rec, t62: { start: f3(root62[0]), end: f3(root62[root62.length - 1]), ranges: [ranges(root62, 0), ranges(root62, 1), ranges(root62, 2)] }, t1: { start: f3(hips1[0]), end: f3(hips1[hips1.length - 1]) } };
}

console.log('== CONVERTED 14002 body root (track62) and hips (track1) ==');
for (let pi = 0; pi < 5; pi++) {
  const file = path.join(CONVERTED_DIR, `1${pi}14002.clips`);
  const rec = findRecord(file, 64);
  const root62 = seriesOfRecord(file, rec, 62, 0);
  const hips1 = seriesOfRecord(file, rec, 1, 0);
  console.log(` phase ${PHASES[pi]} (rec ${rec}): t62 start ${JSON.stringify(f3(root62[0]))} end ${JSON.stringify(f3(root62[root62.length - 1]))} x${JSON.stringify(ranges(root62, 0))} y${JSON.stringify(ranges(root62, 1))} z${JSON.stringify(ranges(root62, 2))}`);
  console.log(`            t1 hips start ${JSON.stringify(f3(hips1[0]))} end ${JSON.stringify(f3(hips1[hips1.length - 1]))}`);
  report.phases[pi].converted = { record: rec, t62: { start: f3(root62[0]), end: f3(root62[root62.length - 1]), ranges: [ranges(root62, 0), ranges(root62, 1), ranges(root62, 2)] }, t1: { start: f3(hips1[0]), end: f3(hips1[hips1.length - 1]) } };
}
fs.writeFileSync(path.join(__dirname, 'root-path-analysis.json'), JSON.stringify(report, null, 1));
console.log('written root-path-analysis.json');
