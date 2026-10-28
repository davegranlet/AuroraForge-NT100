'use strict';
// worker-11 lane - builds a 2-track camera cell (Camera pose + fov.Camera) from the source-camera
// 9D94 staging, removing the optional tgt.Camera track. Read-only against inputs; writes only here.
// The 2-track camera record form is used by 243/861 stock 2K26 phase-100 camera records, so the
// consumer accepts a camera record without a target track.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { build, parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');
const { encodeDenseGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/encode-dense-group');
const { concatWriters } = require('C:/nt100-codebasemain/animation/tools/clips-codec/concat-writers');

const OUT = path.join(__dirname, 'camera-2track');
const SRC_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const PHASES = [100, 110, 120, 130, 140];
const TAGS = ['00', '05', '10', '15', '20'];
const CAMERA = '0x54D1B2A64667E32E';
const TARGET = '0x5A3744A0D6E080B1';
const FOV = '0x188FD8CF51F19C95';
const POS_SCALE = -10, ROT_SCALE = -23, T2_SCALE = -17;

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
function descriptorFixed(series, scale) {
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('Non-finite camera transform');
  const step = 2 ** scale, rest = Math.floor(lo / step) * step;
  if (hi - rest <= 0) return { scale, width: 0, rest };
  const width = Math.max(1, Math.ceil(Math.log2((hi - rest) / step + 1)));
  if (width > 31) throw new Error('Camera transform exceeds encoding range');
  return { scale, width, rest };
}
function decodeTrack(parsed, stream, trackIndex, groupIndex) {
  const descs = [];
  for (let s = 0; s < 3; s++) {
    const e = parsed.rec.raw.group78[trackIndex * 6 + groupIndex * 3 + s];
    descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
  }
  const series = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descs, parsed.rec.frameValue);
  return series || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
}

function buildPayload(payload, parsed, stream) {
  const frames = parsed.rec.frameValue;
  const pos = decodeTrack(parsed, stream, 0, 0);
  const rot = decodeTrack(parsed, stream, 0, 1);
  const fov = decodeTrack(parsed, stream, 2, 0);

  const prefix = Buffer.from(payload.subarray(0, 0xA0));
  const poseEntry = Buffer.from(payload.subarray(0xA0, 0xA8));
  const fovEntry = Buffer.from(payload.subarray(0xA0 + 2 * 8, 0xA0 + 2 * 8 + 8));
  const descCount = 12;
  const descOffset = 0xA0 + 2 * 8; // g60 = 0, g38 = 0
  const descTable = Buffer.alloc(descCount * 8);
  const writeDescs = (track, group, descs) => {
    for (let c = 0; c < 3; c++) {
      const at = (track * 6 + group * 3 + c) * 8;
      descTable.writeInt8(descs[c].scale, at);
      descTable.writeUInt8(descs[c].width, at + 1);
      descTable.writeFloatLE(descs[c].rest, at + 4);
    }
  };
  const parts = [];
  const push = (track, group, series, scale) => {
    const descs = [0, 1, 2].map((c) => descriptorFixed(series.map((r) => r[c]), scale));
    writeDescs(track, group, descs);
    const w = encodeDenseGroup(series, descs);
    if (w.clampCount) throw new Error(`clamp at track ${track} group ${group}`);
    parts.push(w);
  };
  push(0, 0, pos, POS_SCALE);
  push(0, 1, rot, ROT_SCALE);
  push(1, 0, fov, T2_SCALE);
  const zero = [{ scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }, { scale: 0, width: 0, rest: 0 }];
  writeDescs(1, 1, zero);
  parts.push(encodeDenseGroup([[0, 0, 0]], [{ width: 0 }, { width: 0 }, { width: 0 }]));
  const writer = concatWriters(parts);
  const bitLength = writer.bitLength();
  const packed = writer.flush();
  const group = Buffer.concat([packed, Buffer.alloc((8 - packed.length % 8) % 8)]);

  prefix.writeUInt32LE(2, 0x20); prefix.writeUInt32LE(2, 0x24);
  prefix.writeUInt32LE(0, 0x60); prefix.writeUInt32LE(0, 0x64);
  prefix.writeUInt32LE(descCount, 0x78); prefix.writeUInt32LE(descCount, 0x7C);
  prefix.writeUInt32LE(frames, 0x44);
  prefix.writeUInt32LE(group.length / 8, 0x90); prefix.writeUInt32LE(group.length / 8, 0x94);
  prefix.writeUInt32LE(bitLength, 0x9C);
  const output = Buffer.concat([prefix, poseEntry, fovEntry, descTable, group]);
  return { output, frames, bitLength, groupBytes: group.length, pos, rot, fov };
}

function main() {
  fs.mkdirSync(path.join(OUT, 'spliced'), { recursive: true });
  const manifest = { schema: 'worker-11/camera-2track-cell-v1', generated: new Date().toISOString(), note: 'source pose+fov retained; optional tgt.Camera track removed; no other record touched', phases: [], pass: true };
  for (let pi = 0; pi < 5; pi++) {
    const phase = PHASES[pi];
    const srcFile = path.join(SRC_DIR, `1${pi}14002.clips`);
    const layout = parseFile(srcFile, { includeRaw: false });
    const camIdx = layout.records.findIndex((r) => r.trackIdentifiers.length === 3 && r.trackIdentifiers.includes(CAMERA) && r.trackIdentifiers.includes(TARGET) && r.trackIdentifiers.includes(FOV));
    if (camIdx < 0) throw new Error(`phase ${phase}: 3-track camera record not found`);
    const parsed = parseClipsRecord(srcFile, camIdx);
    const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
    const rawBuf = fs.readFileSync(srcFile);
    const payload = Buffer.from(rawBuf.subarray(layout.records[camIdx].offset, layout.records[camIdx].offset + layout.records[camIdx].length));
    const built = buildPayload(payload, parsed, stream);

    const compBuf = build([built.output]);
    const compFile = path.join(OUT, `${TAGS[pi]}-camera-2track.clips`);
    fs.writeFileSync(compFile, compBuf);

    const payloads = layout.records.map((r) => Buffer.from(rawBuf.subarray(r.offset, r.offset + r.length)));
    payloads[camIdx] = built.output;
    const spliced = build(payloads);
    const splicedFile = path.join(OUT, 'spliced', `1${pi}14002.clips`);
    fs.writeFileSync(splicedFile, spliced);

    const outParsed = parseFile(splicedFile, { includeRaw: false });
    let othersIdentical = true;
    for (const r of layout.records) {
      if (r.index === camIdx) continue;
      const a = rawBuf.subarray(r.offset, r.offset + r.length);
      const nr = outParsed.records[r.index];
      const b = spliced.subarray(nr.offset, nr.offset + nr.length);
      if (!a.equals(b)) { othersIdentical = false; break; }
    }
    const outRec = outParsed.records[camIdx];
    const camParsed = parseClipsRecord(splicedFile, camIdx);
    const camStream = camParsed.file.subarray(camParsed.base, camParsed.base + camParsed.group.bytes);
    const outPos = decodeTrack(camParsed, camStream, 0, 0);
    const outRot = decodeTrack(camParsed, camStream, 0, 1);
    const outFov = decodeTrack(camParsed, camStream, 1, 0);
    let maxPos = 0, maxRot = 0, maxFov = 0;
    for (let f = 0; f < built.frames; f++) {
      maxPos = Math.max(maxPos, Math.hypot(outPos[f][0] - built.pos[f][0], outPos[f][1] - built.pos[f][1], outPos[f][2] - built.pos[f][2]));
      maxRot = Math.max(maxRot, Math.hypot(outRot[f][0] - built.rot[f][0], outRot[f][1] - built.rot[f][1], outRot[f][2] - built.rot[f][2]));
      maxFov = Math.max(maxFov, Math.hypot(outFov[f][0] - built.fov[f][0], outFov[f][1] - built.fov[f][1], outFov[f][2] - built.fov[f][2]));
    }
    const pass = othersIdentical && outRec.trackIdentifiers.length === 2 && outRec.trackIdentifiers[0] === CAMERA && outRec.trackIdentifiers[1] === FOV && outRec.frameValue === built.frames && maxPos < 2 ** -9 && maxRot < 2 ** -22 && maxFov < 2 ** -16;
    manifest.phases.push({
      phase, source: srcFile, cameraRecordIndex: camIdx, cameraRecordId: layout.records[camIdx].id, frames: built.frames,
      component: compFile.replace(/\\/g, '/'), componentSha256: sha(built.output),
      spliced: splicedFile.replace(/\\/g, '/'), splicedSha256: sha(spliced),
      trackIds: outRec.trackIdentifiers, othersIdentical, maxPosError: maxPos, maxRotError: maxRot, maxFovError: maxFov, pass,
    });
    if (!pass) manifest.pass = false;
    console.log(`phase ${phase}: tracks=${outRec.trackIdentifiers.length} frames=${outRec.frameValue} othersIdentical=${othersIdentical} maxErr pos=${maxPos.toExponential(2)} rot=${maxRot.toExponential(2)} fov=${maxFov.toExponential(2)} ${pass ? 'PASS' : 'FAIL'}`);
  }
  fs.writeFileSync(path.join(OUT, 'camera-2track-manifest.json'), JSON.stringify(manifest, null, 1));
  console.log('written camera-2track-manifest.json', manifest.pass ? 'ALL PASS' : 'FAILURES');
  if (!manifest.pass) process.exitCode = 1;
}
main();
