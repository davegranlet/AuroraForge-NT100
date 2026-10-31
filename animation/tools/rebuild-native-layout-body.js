'use strict';

// Candidate G builder v2: rebuild the converted Victory body record into the NATIVE 73-track
// layout. The 64 converted choreography tracks are copied BIT-EXACT (descriptors + group bits
// from the converted stream — zero re-encode rounding); the 9 native-only tracking tracks
// (J_Cam1/J_Cam2/J_Cam_Offset/J_FootIK/J_Dock/J_Opponent family) are added with their native
// descriptors re-encoded at the converted 2421-frame count. Native track order + header
// rootIndex=1 (+0x40). Record identity stays the converted name id.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parse, build } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');
const { BitReader } = require('./clips-codec/bit-reader');
const { parseTimingGroup } = require('./clips-codec/parse-timing-group');
const { copyBits } = require('./clips-codec/copy-bits');
const { concatWriters } = require('./clips-codec/concat-writers');
const { encodeDenseGroup } = require('./clips-codec/encode-dense-group');
const fitDescriptor = require('./clips-codec/fit-descriptor');

const ROOT_ID = '0x1F4DA262FC146772';
const ORIGIN_ID = '0x11558A1746547CA2';
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function readDescriptor(raw, offset) {
  const d = { scale: raw.readInt8(offset), width: raw[offset + 1], rest: raw.readFloatLE(offset + 4) };
  if (d.width > 32 || !Number.isFinite(d.rest)) throw new Error(`invalid descriptor at ${offset}`);
  return d;
}
function readGroup(bytes, record, trackIndex, groupIndex) {
  const parsed = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const descriptors = readTrackDescriptors(parsed, trackIndex).slice(groupIndex * 3, groupIndex * 3 + 3);
  const values = evalGroup(stream, parsed.bones[trackIndex].groups[groupIndex], descriptors, record.frameValue);
  return { values: values ?? Array.from({ length: record.frameValue }, () => descriptors.map(d => d.rest)), skipped: !values, descriptors };
}

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
const convertedPath = path.resolve(arg('--converted') || '');
const nativePath = path.resolve(arg('--native') || '');
const outPath = path.resolve(arg('--out') || '');
if (!fs.existsSync(convertedPath)) throw new Error(`converted clips not found: ${convertedPath}`);
if (!fs.existsSync(nativePath)) throw new Error(`native clips not found: ${nativePath}`);
if (!arg('--out')) throw new Error('missing --out <output.clips>');
if (fs.existsSync(outPath)) throw new Error(`refusing to overwrite output: ${outPath}`);
const convertedBytes = fs.readFileSync(convertedPath);
const nativeBytes = fs.readFileSync(nativePath);
const cLayout = parse(convertedBytes, { includeRaw: false });
const nLayout = parse(nativeBytes, { includeRaw: false });
const cBody = cLayout.records[0];
const nBody = nLayout.records[2];
if (cBody.trackIdentifiers.length !== 64 || nBody.trackIdentifiers.length !== 73) throw new Error('unexpected track counts');
const CUSTOM_BODY_ID = cBody.id;

const cRaw = convertedBytes.subarray(cBody.offset, cBody.offset + cBody.length);
const cGroup78 = cBody.sections.find(s => s.name === 'group78 descriptors');
const cGroup90 = cBody.sections.find(s => s.name === 'group90');
const cDescriptorBase = Number.parseInt(cGroup78.relativeOffset, 16);
const cStreamBase = Number.parseInt(cGroup90.relativeOffset, 16);
const cStream = cRaw.subarray(cStreamBase, cStreamBase + cGroup90.bytes);

// converted per-track group bit ranges
const cReader = new BitReader(cStream);
const convertedGroupBits = new Map(); // trackId -> [{start,end},{start,end}]
for (let t = 0; t < 64; t++) {
  const id = cBody.trackIdentifiers[t];
  const ranges = [];
  for (let g = 0; g < 2; g++) {
    const first = t * 6 + g * 3;
    const descs = Array.from({ length: 3 }, (_, axis) => readDescriptor(cRaw, cDescriptorBase + (first + axis) * 8));
    const timing = parseTimingGroup(cReader, cBody.frameValue, descs.map(d => d.width));
    ranges.push({ start: timing.start, end: timing.end });
  }
  convertedGroupBits.set(id, ranges);
}
const expectedBonePrefix = cRaw.readUInt32LE(0x9c);
if (cReader.pos !== expectedBonePrefix) throw new Error(`converted bone prefix ${cReader.pos} != header ${expectedBonePrefix}`);

// native per-track group bit ranges + per-track constant-rest decode for the 9 added tracks
const nRaw = nativeBytes.subarray(nBody.offset, nBody.offset + nBody.length);
const nGroup78 = nBody.sections.find(s => s.name === 'group78 descriptors');
const nGroup90 = nBody.sections.find(s => s.name === 'group90');
const nDescriptorBase = Number.parseInt(nGroup78.relativeOffset, 16);
const nStreamBase = Number.parseInt(nGroup90.relativeOffset, 16);
const nStream = nRaw.subarray(nStreamBase, nStreamBase + nGroup90.bytes);
const nReader = new BitReader(nStream);
const nativeGroupBits = new Map();
for (let t = 0; t < 73; t++) {
  const id = nBody.trackIdentifiers[t];
  const ranges = [];
  for (let g = 0; g < 2; g++) {
    const first = t * 6 + g * 3;
    const descs = Array.from({ length: 3 }, (_, axis) => readDescriptor(nRaw, nDescriptorBase + (first + axis) * 8));
    const timing = parseTimingGroup(nReader, nBody.frameValue, descs.map(d => d.width));
    ranges.push({ start: timing.start, end: timing.end });
  }
  nativeGroupBits.set(id, ranges);
}

// ---- build the output record ----
// prefix = the NATIVE prefix (73-track descriptor scaffold, rootIndex=1 at +0x40), patched:
const prefix = Buffer.from(nRaw.subarray(0, nStreamBase));
const customIdBytes = Buffer.alloc(8);
let v = BigInt(CUSTOM_BODY_ID); for (let i = 0; i < 8; i++) { customIdBytes[i] = Number(v & 0xffn); v >>= 8n; }
customIdBytes.copy(prefix, 0);
prefix.writeUInt32LE(cBody.frameValue, 0x44);

const frameCount = cBody.frameValue;
const writers = [];
const addedTracks = [];
// descriptors: for converted tracks copy the CONVERTED descriptor triplets into the prefix;
// for added native tracks keep the native descriptor bytes.
for (let track = 0; track < 73; track += 1) {
  const id = nBody.trackIdentifiers[track];
  const hasConverted = convertedGroupBits.has(id);
  const convertedTrackIndex = hasConverted ? cBody.trackIdentifiers.indexOf(id) : -1;
  const first = track * 6;
  for (let axis = 0; axis < 6; axis += 1) {
    const srcDescriptor = hasConverted
      ? readDescriptor(cRaw, cDescriptorBase + (convertedTrackIndex * 6 + axis) * 8)
      : readDescriptor(nRaw, nDescriptorBase + (first + axis) * 8);
    const at = nDescriptorBase + (first + axis) * 8;
    prefix.writeInt8(srcDescriptor.scale, at);
    prefix.writeUInt8(srcDescriptor.width, at + 1);
    prefix.writeFloatLE(srcDescriptor.rest, at + 4);
  }
  for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
    if (hasConverted) {
      const range = convertedGroupBits.get(id)[groupIndex];
      writers.push(copyBits(cStream, range.start, range.end));
    } else {
      // re-encode the native static/rest series at the converted frame count with native descriptors
      const channelDescriptors = Array.from({ length: 3 }, (_, axis) => readDescriptor(nRaw, nDescriptorBase + (first + groupIndex * 3 + axis) * 8));
      const g = readGroup(nativeBytes, nBody, track, groupIndex);
      const nativeDecoded = g.values;
      const rate = (nBody.frameValue - 1) / (frameCount - 1);
      const rows = g.skipped
        ? Array.from({ length: frameCount }, () => channelDescriptors.map(d => d.rest))
        : Array.from({ length: frameCount }, (_, frame) => {
            const src = frame * rate, lo = Math.min(nativeDecoded.length - 1, Math.floor(src)), hi = Math.min(nativeDecoded.length - 1, lo + 1), t2 = src - lo;
            return nativeDecoded[lo].map((value, axis) => value + (nativeDecoded[hi][axis] - value) * t2);
          });
      const fitted = channelDescriptors.map((d, axis) => rows.every(row => row[axis] === d.rest) ? { ...d } : fitDescriptor(rows.map(row => row[axis]), d));
      const encoded = encodeDenseGroup(rows, fitted);
      if (encoded.clampCount) throw new Error(`clamps added track ${track} (${id}) group ${groupIndex}: ${encoded.clampCount}`);
      for (let axis = 0; axis < 3; axis += 1) {
        const at = nDescriptorBase + (first + groupIndex * 3 + axis) * 8;
        prefix.writeInt8(fitted[axis].scale, at);
        prefix.writeUInt8(fitted[axis].width, at + 1);
        prefix.writeFloatLE(fitted[axis].rest, at + 4);
      }
      addedTracks.push({ track, trackId: id, group: groupIndex });
    }
  }
}
const boneWriter = concatWriters(writers), tail = copyBits(nStream, nReader.pos, nStream.length * 8);
const combined = concatWriters([boneWriter, tail]), usedBits = combined.bitLength(), packed = combined.flush();
const newStream = Buffer.concat([packed, Buffer.alloc((8 - (packed.length % 8)) % 8)]);
prefix.writeUInt32LE(newStream.length / 8, 0x90);
prefix.writeUInt32LE(Math.ceil(usedBits / 64), 0x94);
prefix.writeUInt32LE(boneWriter.bitLength(), 0x9c);
const outputRecord = Buffer.concat([prefix, newStream]);

// ---- assemble the container ----
const originalRecords = parse(convertedBytes, { includeRaw: false }).records;
const outputRecords = originalRecords.map(record => record.index === cBody.index ? outputRecord : convertedBytes.subarray(record.offset, record.offset + record.length));
const output = build(outputRecords);

// ---- readback verification ----
const outLayout = parse(output, { includeRaw: false });
const outBody = outLayout.records[0];
if (outBody.trackIdentifiers.length !== 73) throw new Error('output track count != 73');
if (String(outBody.id) !== String(CUSTOM_BODY_ID)) throw new Error('output record id mismatch');
const outRawCheck = output.subarray(outBody.offset, outBody.offset + outBody.length);
const rootIndexHeader = outRawCheck.readUInt32LE(0x40);
if (rootIndexHeader !== 1) throw new Error(`header rootIndex ${rootIndexHeader} != 1`);
if (outRawCheck.readUInt32LE(0x44) !== cBody.frameValue) throw new Error('frame count mismatch');
// every track's decode must match its source (converted data or native static) within one quantum
function readGroupOf(buffer, layoutRoot, track, groupIndex) {
  return readGroup(buffer, layoutRoot, track, groupIndex).values;
}
let maxError = 0, worst = null;
for (let track = 0; track < 73; track += 1) {
  const id = outBody.trackIdentifiers[track];
  for (let groupIndex = 0; groupIndex < 2; groupIndex += 1) {
    const after = readGroupOf(output, outBody, track, groupIndex);
    let expected;
    if (convertedGroupBits.has(id)) {
      expected = readGroupOf(convertedBytes, cBody, cBody.trackIdentifiers.indexOf(id), groupIndex);
    } else {
      expected = readGroupOf(nativeBytes, nBody, nBody.trackIdentifiers.indexOf(id), groupIndex);
      const rate = (nBody.frameValue - 1) / (frameCount - 1);
      expected = Array.from({ length: frameCount }, (_, frame) => {
        const src = frame * rate, lo = Math.min(expected.length - 1, Math.floor(src)), hi = Math.min(expected.length - 1, lo + 1), t2 = src - lo;
        return expected[lo].map((value, axis) => value + (expected[hi][axis] - value) * t2);
      });
    }
    for (let frame = 0; frame < frameCount; frame += 1) for (let axis = 0; axis < 3; axis += 1) {
      const d = Math.abs(after[frame][axis] - expected[frame][axis]);
      if (d > maxError) { maxError = d; worst = { track, id, groupIndex, frame, axis }; }
    }
  }
}
let untouchedRecordBytesChanged = 0;
for (const record of originalRecords) if (record.index !== cBody.index) {
  const before = convertedBytes.subarray(record.offset, record.offset + record.length), out = outLayout.records[record.index];
  if (!before.equals(output.subarray(out.offset, out.offset + out.length))) untouchedRecordBytesChanged += 1;
}
if (untouchedRecordBytesChanged !== 0 || maxError > 0.02) {
  throw new Error(`readback failed: maxError=${maxError} at ${JSON.stringify(worst)}, untouchedRecords=${untouchedRecordBytesChanged}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, { flag: 'wx' });
console.log(JSON.stringify({
  schema: 'aurora-forge/native-layout-body/v2',
  inputSha256: sha256(convertedBytes), outputSha256: sha256(output),
  tracks: 73, frameCount, rootIndexHeader,
  addedTracks: addedTracks.length,
  maxError, worst, untouchedRecordBytesChanged,
  pass: true,
}, null, 2));




