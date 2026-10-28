'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { build, parse } = require('./clips-layout');
const { reconcileRecord, reconcileFiles } = require('./reconcile-clips-record-layout');
const { BitWriter } = require('./clips-codec/bit-writer');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');

function makeRecord(id, trackIds, descriptors, group90 = []) {
  const header = Buffer.alloc(0xA0);
  header.writeBigUInt64LE(BigInt(id), 0);
  header.writeUInt32LE(60, 0x0C);
  header.writeUInt32LE(trackIds.length, 0x20);
  header.writeUInt32LE(0, 0x38);
  header.writeUInt32LE(0, 0x60);
  header.writeUInt32LE(descriptors.length, 0x78);
  header.writeUInt32LE(group90.length, 0x90);
  const ids = Buffer.alloc(trackIds.length * 8);
  trackIds.forEach((trackId, index) => ids.writeBigUInt64LE(BigInt(trackId), index * 8));
  const desc = Buffer.alloc(descriptors.length * 8);
  descriptors.forEach((value, index) => desc.writeBigUInt64LE(BigInt(value), index * 8));
  const g90 = Buffer.alloc(group90.length * 8);
  group90.forEach((value, index) => g90.writeBigUInt64LE(BigInt(value), index * 8));
  return Buffer.concat([header, ids, desc, g90]);
}

test('reorders descriptor blocks by target bone id and inserts only verified empty target channels', () => {
  const a = 0x101n, b = 0x202n, c = 0x303n, empty = 0x404n;
  const source = makeRecord(0xabc, [a, b, c], Array.from({ length: 18 }, (_, i) => BigInt(i + 1)));
  const native = makeRecord(0xabc, [b, empty, a, c], [...Array(6).fill(9n), ...Array(6).fill(0n), ...Array(6).fill(1n), ...Array(6).fill(3n)]);
  const result = reconcileRecord(source, native);
  assert.equal(result.changed, true);
  assert.deepEqual(result.insertedZeroTracks, ['0x0000000000000404']);
  assert.equal(result.group90Reordered, true);
  assert.equal(result.group90PerTrackGroupsPreserved, 0);
  assert.deepEqual([...Array(4)].map((_, i) => result.payload.readBigUInt64LE(0xA0 + i * 8)), [b, empty, a, c]);
  const descriptorStart = 0xA0 + 4 * 8;
  assert.deepEqual([...Array(24)].map((_, i) => result.payload.readBigUInt64LE(descriptorStart + i * 8)), [7n,8n,9n,10n,11n,12n,0n,0n,0n,0n,0n,0n,1n,2n,3n,4n,5n,6n,13n,14n,15n,16n,17n,18n]);
  assert.equal(parse(build([result.payload])).records[0].trackIdentifiers.length, 4);
});

function makeDenseTransformRecord(id, trackIds, animatedIds, group90Bytes = null) {
  const frames = 4;
  const header = Buffer.alloc(0xA0);
  header.writeBigUInt64LE(BigInt(id), 0);
  header.writeFloatLE(60, 0x0C);
  header.writeUInt32LE(trackIds.length, 0x20);
  header.writeUInt32LE(trackIds.length * 6, 0x78);
  header.writeUInt32LE(frames, 0x44);
  const ids = Buffer.alloc(trackIds.length * 8);
  trackIds.forEach((trackId, index) => ids.writeBigUInt64LE(BigInt(trackId), index * 8));
  const descriptors = Buffer.alloc(trackIds.length * 6 * 8);
  trackIds.forEach((trackId, trackIndex) => {
    if (!animatedIds.has(BigInt(trackId).toString())) return;
    for (let channel = 0; channel < 6; channel += 1) {
      const offset = (trackIndex * 6 + channel) * 8;
      descriptors.writeInt8(0, offset);
      descriptors.writeUInt8(1, offset + 1);
      descriptors.writeUInt16LE(0, offset + 2);
      descriptors.writeFloatLE(0, offset + 4);
    }
  });
  const writer = new BitWriter();
  if (group90Bytes === null) {
    trackIds.forEach((trackId, trackIndex) => {
      if (!animatedIds.has(BigInt(trackId).toString())) return;
      for (let group = 0; group < 2; group += 1) {
        writer.write(0, 1); // one full-frame timing segment
        writer.write(0, 1);
        writer.write(0, 8); // dense mode
        for (let frame = 0; frame < frames; frame += 1) {
          for (let channel = 0; channel < 3; channel += 1) writer.write((trackIndex + group + frame + channel) & 1, 1);
        }
      }
    });
    while (writer.bitLength() % 64) writer.write(0, 1);
    group90Bytes = writer.flush();
  }
  header.writeUInt32LE(group90Bytes.length / 8, 0x90);
  return Buffer.concat([header, ids, descriptors, group90Bytes]);
}

function trackGroupBits(parsed, trackIndex, groupIndex) {
  const stream = parsed.file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const group = parsed.bones[trackIndex].groups[groupIndex];
  let bits = '';
  for (let bit = group.start; bit < group.end; bit += 1) bits += (stream[bit >> 3] >> (bit & 7)) & 1;
  return bits;
}

test('reorders Group90 transform streams with track IDs and preserves each source group bit-for-bit', () => {
  const a = 0x101n, b = 0x202n, c = 0x303n, empty = 0x404n;
  const source = makeDenseTransformRecord(0xabc, [a, b, c], new Set([a, b, c].map(String)));
  const sourceParsed = parseClipsRecordBuffer(build([source]), 0);
  assert.equal(sourceParsed.totalBits - sourceParsed.consumed, 60);
  const native = makeDenseTransformRecord(0xabc, [b, empty, a, c], new Set([a, b, c].map(String)), source.subarray(source.length - sourceParsed.group.bytes));
  const result = reconcileRecord(source, native);
  assert.equal(result.group90PerTrackGroupsPreserved, 6);
  const outputParsed = parseClipsRecordBuffer(build([result.payload]), 0);
  assert.equal(outputParsed.consumed, sourceParsed.consumed);
  assert.equal(outputParsed.totalBits, sourceParsed.totalBits);
  for (const id of [a, b, c]) {
    const sourceIndex = [a, b, c].indexOf(id);
    const outputIndex = [b, empty, a, c].indexOf(id);
    for (let group = 0; group < 2; group += 1) {
      assert.equal(trackGroupBits(outputParsed, outputIndex, group), trackGroupBits(sourceParsed, sourceIndex, group));
    }
  }
  assert.deepEqual(outputParsed.bones[1].groups.map(group => group.stride), [0, 0]);
});

test('preserves an already target-aligned payload byte for byte', () => {
  const source = makeRecord(0xabc, [1n, 2n], Array.from({ length: 12 }, (_, i) => BigInt(i + 1)), [5n]);
  const result = reconcileRecord(source, source);
  assert.equal(result.changed, false);
  assert.equal(result.payload, source);
});

test('rejects source-only channels', () => {
  const source = makeRecord(1, [1n, 2n], Array(12).fill(0n));
  const native = makeRecord(1, [1n], Array(6).fill(0n));
  assert.throws(() => reconcileRecord(source, native), /absent from native target/);
});

test('rejects a native-only channel with nonzero descriptors', () => {
  const source = makeRecord(1, [1n], Array(6).fill(0n));
  const native = makeRecord(1, [1n, 2n], [...Array(6).fill(0n), 1n, 0n, 0n, 0n, 0n, 0n]);
  assert.throws(() => reconcileRecord(source, native), /has animated descriptors/);
});

test('rejects track remapping when Group38 or Group60 carries entries', () => {
  const ungrouped = makeRecord(1, [1n, 2n], Array(12).fill(0n));
  const idsEnd = 0xA0 + 2 * 8;
  const source = Buffer.concat([ungrouped.subarray(0, idsEnd), Buffer.alloc(4), ungrouped.subarray(idsEnd)]);
  source.writeUInt32LE(1, 0x38);
  const native = makeRecord(1, [2n, 1n], Array(12).fill(0n));
  assert.throws(() => reconcileRecord(source, native), /Group38 or Group60/);
});

test('reorders source records by ID and drops only an explicitly selected duplicate source record', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-clips-rebase-'));
  const sourcePath = path.join(dir, 'source.clips');
  const nativePath = path.join(dir, 'native.clips');
  const outputPath = path.join(dir, 'output.clips');
  const a = 0xabc, b = 0xdef;
  const sourceA = makeRecord(a, [1n], [1n, 2n, 3n, 4n, 5n, 6n], [81n]);
  const sourceB = makeRecord(b, [2n], [7n, 8n, 9n, 10n, 11n, 12n], [82n]);
  const duplicateA = makeRecord(a, [3n], [13n, 14n, 15n, 16n, 17n, 18n], [83n]);
  const nativeA = makeRecord(a, [1n], [0n, 0n, 0n, 0n, 0n, 0n], [0n]);
  const nativeB = makeRecord(b, [2n], [0n, 0n, 0n, 0n, 0n, 0n], [0n]);
  try {
    fs.writeFileSync(sourcePath, build([sourceA, sourceB, duplicateA]));
    fs.writeFileSync(nativePath, build([nativeB, nativeA]));
    assert.throws(() => reconcileFiles(sourcePath, nativePath, outputPath), /duplicate record identifiers/);
    const report = reconcileFiles(sourcePath, nativePath, outputPath, { dropSourceRecordIndices: [2] });
    assert.deepEqual(report.droppedSourceRecordIndices, [2]);
    const parsed = parse(fs.readFileSync(outputPath));
    assert.deepEqual(parsed.records.map(record => record.id), ['0x0000000000000DEF', '0x0000000000000ABC']);
    const bytes = fs.readFileSync(outputPath);
    assert.deepEqual(bytes.subarray(parsed.records[0].offset, parsed.records[0].offset + parsed.records[0].length), sourceB);
    assert.deepEqual(bytes.subarray(parsed.records[1].offset, parsed.records[1].offset + parsed.records[1].length), sourceA);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('refuses to drop a unique source clip record', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-clips-drop-unique-'));
  const sourcePath = path.join(dir, 'source.clips');
  const nativePath = path.join(dir, 'native.clips');
  try {
    fs.writeFileSync(sourcePath, build([makeRecord(0xabc, [1n], Array(6).fill(1n))]));
    fs.writeFileSync(nativePath, build([makeRecord(0xabc, [1n], Array(6).fill(0n))]));
    assert.throws(() => reconcileFiles(sourcePath, nativePath, path.join(dir, 'output.clips'), { dropSourceRecordIndices: [0] }), /not a duplicate ID/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
