'use strict';
// worker-11 lane - independent verification of the 2-track camera cell.
// Does not import the builder; re-parses both baseline and candidate from disk.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
const { parseClipsRecord } = require('C:/nt100-codebasemain/animation/tools/clips-codec/parse-clips-record.js');
const { evalGroup } = require('C:/nt100-codebasemain/animation/tools/clips-codec/eval-group.js');

const OUT = __dirname;
const BASE_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/builds/p14002-camera-source-v1/staging/Animation/CaeAdvanced';
const CELL_DIR = path.join(OUT, 'camera-2track', 'spliced');
const PHASES = [100, 110, 120, 130, 140];
const SHA = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const CAMERA = '0x54D1B2A64667E32E';
const TARGET = '0x5A3744A0D6E080B1';
const FOV = '0x188FD8CF51F19C95';
const STOCK_2TRACK = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced/1000158.clips';

function getSeries(file, recIndex, trackIndex, groupIndex) {
  const parsed = parseClipsRecord(file, recIndex);
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descs = [];
  for (let s = 0; s < 3; s++) {
    const e = parsed.rec.raw.group78[trackIndex * 6 + groupIndex * 3 + s];
    descs.push({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] });
  }
  return evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descs, parsed.rec.frameValue)
    || Array.from({ length: parsed.rec.frameValue }, () => descs.map((d) => d.rest));
}

function header(file, recIndex) {
  const layout = parseFile(file, { includeRaw: false });
  const r = layout.records[recIndex];
  const buf = fs.readFileSync(file);
  const P = r.offset;
  return {
    trackCount: buf.readUInt32LE(P + 0x20),
    g38: buf.readUInt32LE(P + 0x38),
    g60: buf.readUInt32LE(P + 0x60),
    descCount: buf.readUInt32LE(P + 0x78),
    g90count: buf.readUInt32LE(P + 0x90),
    bitLength: buf.readUInt32LE(P + 0x9c),
    frames: buf.readUInt32LE(P + 0x44),
    boneEntries: Array.from({ length: buf.readUInt32LE(P + 0x20) }, (_, i) => buf.subarray(P + 0xA0 + i * 8, P + 0xA0 + i * 8 + 8).toString('hex')),
  };
}

const layoutStock = parseFile(STOCK_2TRACK, { includeRaw: false });
const stockIdx = layoutStock.records.findIndex((r) => r.trackIdentifiers.length === 2 && r.trackIdentifiers[0] === CAMERA && r.trackIdentifiers[1] === FOV);
const stockHeader = header(STOCK_2TRACK, stockIdx);

const report = { schema: 'worker-11/camera-2track-verification-v1', generated: new Date().toISOString(), stock2TrackForm: stockHeader, phases: [], pass: true };
for (let pi = 0; pi < PHASES.length; pi++) {
  const phase = PHASES[pi];
  const baseFile = path.join(BASE_DIR, `1${pi}14002.clips`);
  const cellFile = path.join(CELL_DIR, `1${pi}14002.clips`);
  const baseLayout = parseFile(baseFile, { includeRaw: false });
  const cellLayout = parseFile(cellFile, { includeRaw: false });
  const baseCam = baseLayout.records.findIndex((r) => r.trackIdentifiers.length === 3 && r.trackIdentifiers[0] === CAMERA && r.trackIdentifiers[1] === TARGET && r.trackIdentifiers[2] === FOV);
  const cellCam = cellLayout.records.findIndex((r) => r.trackIdentifiers.length === 2 && r.trackIdentifiers[0] === CAMERA && r.trackIdentifiers[1] === FOV);
  const baseBuf = fs.readFileSync(baseFile);
  const cellBuf = fs.readFileSync(cellFile);
  // non-camera records byte-identical (payload bytes)
  let othersIdentical = true;
  const baseNonCam = baseLayout.records.filter((r) => r.index !== baseCam);
  const cellNonCam = cellLayout.records.filter((r) => r.index !== cellCam);
  if (baseNonCam.length !== cellNonCam.length) othersIdentical = false;
  else for (let i = 0; i < baseNonCam.length; i++) {
    const a = baseBuf.subarray(baseNonCam[i].offset, baseNonCam[i].offset + baseNonCam[i].length);
    const b = cellBuf.subarray(cellNonCam[i].offset, cellNonCam[i].offset + cellNonCam[i].length);
    if (!a.equals(b) || baseNonCam[i].id !== cellNonCam[i].id) { othersIdentical = false; break; }
  }
  // channel parity: pos/rot/fov equal the 9D94 source-camera series
  const basePos = getSeries(baseFile, baseCam, 0, 0);
  const baseRot = getSeries(baseFile, baseCam, 0, 1);
  const baseFov = getSeries(baseFile, baseCam, 2, 0);
  const cellPos = getSeries(cellFile, cellCam, 0, 0);
  const cellRot = getSeries(cellFile, cellCam, 0, 1);
  const cellFov = getSeries(cellFile, cellCam, 1, 0);
  let maxPos = 0, maxRot = 0, maxFov = 0;
  const frames = baseLayout.records[baseCam].frameValue;
  for (let f = 0; f < frames; f++) {
    maxPos = Math.max(maxPos, Math.hypot(cellPos[f][0] - basePos[f][0], cellPos[f][1] - basePos[f][1], cellPos[f][2] - basePos[f][2]));
    maxRot = Math.max(maxRot, Math.hypot(cellRot[f][0] - baseRot[f][0], cellRot[f][1] - baseRot[f][1], cellRot[f][2] - baseRot[f][2]));
    maxFov = Math.max(maxFov, Math.hypot(cellFov[f][0] - baseFov[f][0], cellFov[f][1] - baseFov[f][1], cellFov[f][2] - baseFov[f][2]));
  }
  const ch = header(cellFile, cellCam);
  const formMatchesStock = ch.trackCount === stockHeader.trackCount && ch.g38 === stockHeader.g38 && ch.g60 === stockHeader.g60 && ch.descCount === stockHeader.descCount && ch.boneEntries.join(',') === stockHeader.boneEntries.join(',');
  const cellRec = cellLayout.records[cellCam];
  const pass = othersIdentical
    && baseCam === cellCam
    && cellRec.id === baseLayout.records[baseCam].id
    && cellRec.frameValue === frames
    && cellRec.trackIdentifiers.length === 2
    && !cellRec.trackIdentifiers.includes(TARGET)
    && maxPos < 2 ** -9 && maxRot < 2 ** -22 && maxFov < 2 ** -16;
  const row = {
    phase, base: baseFile, cell: cellFile,
    baseSha256: SHA(baseBuf), cellSha256: SHA(cellBuf),
    baseCameraRecordIndex: baseCam, cellCameraRecordIndex: cellCam,
    recordId: cellRec.id, frames,
    cellTrackIds: cellRec.trackIdentifiers,
    othersIdentical, maxPosError: maxPos, maxRotError: maxRot, maxFovError: maxFov,
    layout: ch, attestedStock2TrackFormMatches: formMatchesStock,
    pass,
  };
  if (!pass) report.pass = false;
  report.phases.push(row);
  console.log(`phase ${phase}: othersIdentical=${othersIdentical} tracks=${cellRec.trackIdentifiers.length} frames=${frames} posErr=${maxPos.toExponential(2)} rotErr=${maxRot.toExponential(2)} fovErr=${maxFov.toExponential(2)} stockForm=${formMatchesStock} ${pass ? 'PASS' : 'FAIL'}`);
}
fs.writeFileSync(path.join(OUT, 'camera-2track-verification.json'), JSON.stringify(report, null, 1));
console.log('written camera-2track-verification.json', report.pass ? 'ALL PASS' : 'FAILURES');
if (!report.pass) process.exitCode = 1;
