'use strict';
// Converts the 2K19 273 source facial performance (7 tracks: J_Eye_L, J_Eye_R, J_Jaw, J_Tongue1..4 per the
// lead's exact ROL32/XOR hash binding) into new native-format 2K26 facial records for all five phases.
//
// Native facial record facts (verified against Clips Editor decompilation, see RESULT):
//  - the bone pass decodes `trackCount` bones x 2 timing groups: position = descriptors [6b..6b+2],
//    rotation = descriptors [6b+3..6b+5]; for the 8-track facial record that is descriptors 0..47.
//  - header word 0x9C equals the bit offset where the bone pass ends (verified exactly on all five phases).
//  - rotation channels are half-angle rotation vectors v with q = (cos|v|, sin|v| * v/|v|) (same halfLog
//    convention as the body candidate builder, confirmed by stock-vs-source quaternion agreement).
//  - channel value = rest + packed * 2^scale (descriptor = int8 scale, uint8 width, 2 zero bytes, float32 rest).
//  - everything after 0x9C (morph channels: descriptors 48..767 + group38 keys) is a separate native section
//    and is preserved bit-for-bit, only shifted by the new bone-pass length.
//
// Base bone (id 0x9A7CE19BAA54C278 "base") has no 2K19 source counterpart: its native descriptor block (0..5)
// and values are preserved as-is (static identity in the current stock records).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parse, build } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const { encodeDenseGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'encode-dense-group.js'));
const { concatWriters } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'concat-writers.js'));
const { decodeEntrance, halfLog } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const SRC = path.join(ROOT, 'animation/workflows/entrance-2k19-to-2k26-20261023/275-dolph-ziggler-3/source/275.bin');
const OUT = path.join(__dirname, 'facial-clips');
fs.mkdirSync(OUT, { recursive: true });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

const EXPECTED_BONE_IDS = ['0x9A7CE19BAA54C278', '0xDD8399C6738EDEA4', '0xDD839FC6738EE8D6', '0x0E2668572C6D1C38', '0x8695D8942CA94585', '0x8695D5942CA9406C', '0x8695D6942CA9421F', '0x8695D3942CA93D06'];

function descriptor(series, scale) {
  const step = Math.pow(2, scale);
  const lo = Math.min(...series), hi = Math.max(...series);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw new Error('non-finite channel values');
  if (hi === lo) return { scale: 0, width: 0, rest: lo };
  const rest = Math.fround(Math.floor(lo / step) * step);
  let width = Math.max(1, Math.ceil(Math.log2(Math.ceil((hi - rest) / step + 1e-9) + 1)));
  let s = scale;
  while (width > 30) { s += 1; width = Math.max(1, Math.ceil(Math.log2(Math.ceil((hi - Math.fround(Math.floor(lo / Math.pow(2, s)) * Math.pow(2, s))) / Math.pow(2, s) + 1e-9) + 1))); }
  const restFinal = Math.fround(Math.floor(lo / Math.pow(2, s)) * Math.pow(2, s));
  return { scale: s, width, rest: restFinal };
}

function rotVecToQuat(v) {
  const th = Math.hypot(v[0], v[1], v[2]);
  if (th < 1e-12) return [1, 0, 0, 0];
  const s = Math.sin(th) / th;
  return [Math.cos(th), v[0] * s, v[1] * s, v[2] * s];
}
function quatAngleDeg(qa, qb) {
  const d = Math.abs(qa.reduce((s, v, i) => s + v * qb[i], 0));
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}

const source = decodeEntrance(SRC);
const sourceByPhase = new Map(source.phases.map((p) => [p.phase, p]));
const report = { schema: 'aurora-forge-facial-conversion/v1', source: { path: SRC, sha256: source.sourceSha256, eventId:275, name:'DOLPH ZIGGLER 3' }, phases: [] };

for (let p = 0; p < 5; p++) {
  const phase = 100 + p * 10;
  const srcPhase = sourceByPhase.get(phase);
  if (srcPhase.facial.length !== 7) throw new Error(`phase ${phase}: expected 7 source facial tracks`);
  const file = path.join(NAT, '1' + p + '00273.clips');
  const buf = fs.readFileSync(file);
  const layout = parse(buf, { includeRaw: true });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  rec.trackIdentifiers.forEach((id, i) => { if (id !== EXPECTED_BONE_IDS[i]) throw new Error(`phase ${phase}: unexpected facial track id ${id} at ${i}`); });
  const payload = Buffer.from(buf.subarray(rec.offset, rec.offset + rec.length));
  const nativeFrames = rec.frameValue, F = srcPhase.frames;
const x9c = payload.readUInt32LE(0x9c);
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const g90Off = parseInt(g90.relativeOffset, 16);
  const descOff = parseInt(rec.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const nativeStream = payload.subarray(g90Off, g90Off + g90.bytes);
  const nativeTotalBits = g90.bytes * 8;

  // ---- decode native base block (bone 0) values for preservation evidence ----
  const desc = rec.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
  const baseRotFirst = [0, 1, 2].map((c) => desc[3 + c].rest);
  const basePosFirst = [0, 1, 2].map((c) => desc[c].rest);

  // ---- build converted bone blocks 1..7 from source ----
  const boneData = [{ bone: 0, name: 'base', pos: null, rot: null, preserved: true, posDesc: desc.slice(0, 3), rotDesc: desc.slice(3, 6) }];
  srcPhase.facial.forEach((track, i) => {
    const bone = i + 1;
    const pos = track.p;
    const rot = track.q.map((q) => halfLog(q));
    const posDesc = [0, 1, 2].map((c) => descriptor(pos.map((r) => r[c]), -14));
    const rotDesc = [0, 1, 2].map((c) => descriptor(rot.map((r) => r[c]), -18));
    boneData.push({ bone, name: ['J_Eye_L', 'J_Eye_R', 'J_Jaw', 'J_Tongue1', 'J_Tongue2', 'J_Tongue3', 'J_Tongue4'][i], sourceIndex: i, pos, rot, posDesc, rotDesc, preserved: false });
  });

  // ---- write dense groups in native order: bone b pos then rot; skip zero-width groups ----
  const writers = [];
  const groupLog = [];
  for (const bd of boneData) {
    if (bd.preserved) { groupLog.push({ bone: bd.bone, pos: 'preserved-zero-width', rot: 'preserved-zero-width' }); continue; }
    const posW = encodeDenseGroup(bd.pos, bd.posDesc);
    const rotW = encodeDenseGroup(bd.rot, bd.rotDesc);
    if (posW.bitLength() > 0) writers.push(posW);
    if (rotW.bitLength() > 0) writers.push(rotW);
    if (posW.clampCount || rotW.clampCount) throw new Error(`phase ${phase} bone ${bd.bone}: clamp occurred`);
    groupLog.push({ bone: bd.bone, name: bd.name, posBits: posW.bitLength(), rotBits: rotW.bitLength(), posStride: bd.posDesc.reduce((s, d) => s + d.width, 0), rotStride: bd.rotDesc.reduce((s, d) => s + d.width, 0) });
  }
  const boneWriter = concatWriters(writers);
  const boneBits = boneWriter.bitLength();
  const boneBytes = boneWriter.flush();
  const nativeTail = nativeStream.subarray(x9c >> 3); // byte offset for tail copy; handle bit offset below
  // ---- assemble new group90: bone bits + native tail bits (bit-exact copy from bit x9c) ----
  const totalBits = boneBits + (nativeTotalBits - x9c);
  const outBytes = Buffer.alloc(Math.ceil(totalBits / 64) * 8);
  for (let i = 0; i < boneBits; i++) if ((boneBytes[i >> 3] >> (i & 7)) & 1) outBytes[i >> 3] |= 1 << (i & 7);
  for (let i = x9c; i < nativeTotalBits; i++) {
    if ((nativeStream[i >> 3] >> (i & 7)) & 1) { const at = boneBits + (i - x9c); outBytes[at >> 3] |= 1 << (at & 7); }
  }

  // ---- assemble new payload ----
  const beforeG90 = payload.subarray(0, g90Off);
  const newPayload = Buffer.concat([beforeG90, outBytes]);
  newPayload.writeUInt32LE(F, 0x44);
  newPayload.writeUInt32LE(0x9c, 0x9c); // placeholder, set below
  const qwords = outBytes.length / 8;
  newPayload.writeUInt32LE(qwords, 0x90);
  newPayload.writeUInt32LE(qwords, 0x94);
  newPayload.writeUInt32LE(boneBits, 0x9c);
  for (const bd of boneData) {
    const write = (base, d) => {
      const at = descOff + base * 8;
      newPayload.writeInt8(d.scale, at);
      newPayload.writeUInt8(d.width, at + 1);
      newPayload.writeUInt16LE(0, at + 2);
      newPayload.writeFloatLE(d.rest, at + 4);
    };
    if (bd.preserved) continue;
    [0, 1, 2].forEach((c) => write(bd.bone * 6 + c, bd.posDesc[c]));
    [0, 1, 2].forEach((c) => write(bd.bone * 6 + 3 + c, bd.rotDesc[c]));
  }

  // ---- validate: structural parse of rebuilt container ----
  const container = build([newPayload]);
  const reparsed = parse(container, { includeRaw: true });
  if (reparsed.count !== 1) throw new Error(`phase ${phase}: rebuilt container not single-record`);
  const rr = reparsed.records[0];
  const rp = container.subarray(rr.offset, rr.offset + rr.length);
  const rDesc = rr.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
  const rG90 = rr.sections.find((s) => s.name === 'group90');
  const rStream = rp.subarray(parseInt(rG90.relativeOffset, 16), parseInt(rG90.relativeOffset, 16) + rG90.bytes);
  const rd = new BitReader(rStream);
  const groups = [];
  for (let gi = 0; gi < 16; gi++) {
    const k = gi * 3;
    const w = [rDesc[k].width, rDesc[k + 1].width, rDesc[k + 2].width];
    groups.push(w.every((x) => x === 0) ? null : parseTimingGroup(rd, F, w));
  }
  const walkEnd = rd.pos;
  if (walkEnd !== boneBits) throw new Error(`phase ${phase}: decode-back bone-pass walk ${walkEnd} != written ${boneBits}`);
  if (rp.readUInt32LE(0x9c) !== boneBits) throw new Error(`phase ${phase}: 0x9C mismatch`);

  // ---- fidelity: decode back and compare to source ----
  let maxRotDeg = 0, maxPosErr = 0, sumsq = 0, count = 0;
  const boneChecks = [];
  for (let b = 1; b < 8; b++) {
    const pgPos = groups[2 * b], pgRot = groups[2 * b + 1];
    const dP = [0, 1, 2].map((c) => rDesc[2 * b * 3 + c]);
    const dR = [0, 1, 2].map((c) => rDesc[(2 * b + 1) * 3 + c]);
    const pos = pgPos ? evalGroup(rStream, pgPos, dP, F) : Array.from({ length: F }, () => dP.map((x) => x.rest));
    const rot = pgRot ? evalGroup(rStream, pgRot, dR, F) : Array.from({ length: F }, () => dR.map((x) => x.rest));
    const src = srcPhase.facial[b - 1];
    let bRot = 0, bPos = 0;
    for (let f = 0; f < F; f++) {
      const ang = quatAngleDeg(rotVecToQuat(rot[f]), src.q[f]);
      if (ang > bRot) bRot = ang;
      for (let c = 0; c < 3; c++) {
        const e = Math.abs(pos[f][c] - src.p[f][c]);
        if (e > bPos) bPos = e;
        sumsq += e * e; count++;
      }
    }
    maxRotDeg = Math.max(maxRotDeg, bRot); maxPosErr = Math.max(maxPosErr, bPos);
    boneChecks.push({ bone: b, name: boneData[b].name, maxRotDeg: +bRot.toFixed(5), maxPosErr: +bPos.toExponential(3) });
  }
  // ---- phase 2 preservation: compare native tail bits vs new tail bits ----
  let tailMismatch = 0;
  for (let i = x9c; i < nativeTotalBits; i++) {
    const a = (nativeStream[i >> 3] >> (i & 7)) & 1;
    const at = boneBits + (i - x9c);
    const b2 = (rp[parseInt(rG90.relativeOffset, 16) + (at >> 3)] >> (at & 7)) & 1;
    if (a !== b2) tailMismatch++;
  }
  // ---- base block preservation ----
  const baseDescRoundTrip = [0, 1, 2, 3, 4, 5].every((k) => {
    const at = parseInt(rr.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16) + k * 8;
    return rp.readInt8(at) === desc[k].scale && rp[at + 1] === desc[k].width && rp.readFloatLE(at + 4) === desc[k].rest;
  });

  const outName = `1${p}14004-source275-facial-converted`;
  fs.writeFileSync(path.join(OUT, outName + '.clips'), container);
  fs.writeFileSync(path.join(OUT, outName + '.payload.bin'), newPayload);
  report.phases.push({
    phase, frames: F, nativeTemplateFrames: nativeFrames,
    nativeFile: file, nativeSha256: sha(buf), nativeRecordOffset: rec.offset, nativeRecordLength: rec.length,
    nativeBonePassBits: x9c, convertedBonePassBits: boneBits, convertedTotalBits: totalBits, convertedQwords: qwords,
    convertedClipsSha256: sha(container), convertedPayloadSha256: sha(newPayload), convertedBytes: newPayload.length,
    base: { preserved: true, posFirst: basePosFirst, rotFirst: baseRotFirst, descriptorRoundTrip: baseDescRoundTrip },
    groups: groupLog, boneChecks, fidelity: { maxRotDeg: +maxRotDeg.toFixed(5), maxPosErr: +maxPosErr.toExponential(3) },
    phase2TailBitsPreserved: tailMismatch === 0, phase2TailMismatchBits: tailMismatch,
    sourceMapping: boneData.slice(1).map((b) => ({ bone: b.bone, target: b.name, sourceFacialIndex: b.sourceIndex, sourceHash32: srcPhase.facial[b.sourceIndex].hash32 })),
  });
  process.stdout.write(`phase ${phase}: bones=${boneBits} bits (native ${x9c}), total=${totalBits} bits, maxRotErr=${maxRotDeg.toFixed(5)}deg, maxPosErr=${maxPosErr.toExponential(2)}, tailPreserved=${tailMismatch === 0}, baseDescRT=${baseDescRoundTrip}\n`);
}
fs.writeFileSync(path.join(OUT, 'facial-conversion-evidence.json'), JSON.stringify(report, null, 1), 'utf8');
process.stdout.write('facial-conversion-evidence.json written\n');
