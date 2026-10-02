'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { encode } = require('./tbuf-v1');
const { classifyComplexCases, classifyRangeLayouts, descriptorWord, inspectFile, inspectTableRanges, readBody, readU32Record, report, scanTwentyByteRecords, validateLayout } = require('./tbuf-v1-body-candidate-record');

function writeActs(filePath, u48 = 232, low = 89, u16 = 4896, options = {}) {
  const payload = Buffer.alloc(Math.max(8192, u16 + 1024));
  const descriptor = 0x10040000 + low;
  const at48Descriptor = options.at48Descriptor ?? descriptor;
  const at60DescriptorA = options.at60DescriptorA ?? descriptor;
  const at60DescriptorB = options.at60DescriptorB ?? descriptor;
  const at48TailOffset = options.at48TailOffset ?? (u16 - 300);
  const at60TailOffset = options.at60TailOffset ?? (at48TailOffset + 20);
  payload.writeUInt32LE(24, 0); payload.writeUInt32LE(u16, 16); payload.writeUInt32LE(8, 32);
  payload.writeUInt32LE(3614061049, 40); payload.writeUInt32LE(2097409, 44);
  payload.writeUInt32LE(u48, 48); payload.writeUInt32LE(0, 52); payload.writeUInt32LE(descriptor, 56); payload.writeUInt32LE(u48 + 20, 60);
  payload.writeUInt32LE(0, u48); payload.writeUInt32LE(at48Descriptor, u48 + 4); payload.writeUInt32LE(3146120028, u48 + 8); payload.writeUInt32LE(2097409, u48 + 12); payload.writeUInt32LE(at48TailOffset, u48 + 16);
  payload.writeUInt32LE(0, u48 + 20); payload.writeUInt32LE(at60DescriptorA, u48 + 24); payload.writeUInt32LE(at60TailOffset, u48 + 28); payload.writeUInt32LE(0, u48 + 32); payload.writeUInt32LE(at60DescriptorB, u48 + 36);
  payload.writeUInt32LE(3611788473, u48 + 40); payload.writeUInt32LE(524288, u48 + 44); payload.writeUInt32LE(0, u48 + 48); payload.writeUInt32LE(low, u48 + 52); payload.writeUInt32LE(0, u48 + 56);
  const entryPayload = Buffer.concat([encode(Buffer.alloc(8), 3), encode(payload, 6)]);
  const header = Buffer.alloc(16); header.write('AMYM'); header.writeUInt32LE(1, 4); header.writeUInt32LE(1, 8);
  const group = Buffer.alloc(16); group.writeUInt32LE(0, 8); group.writeUInt32LE(1, 12);
  const sizes = Buffer.alloc(4); sizes.writeUInt32LE(entryPayload.length, 0);
  const ids = Buffer.alloc(2); ids.writeUInt16LE(6100, 0);
  fs.writeFileSync(filePath, Buffer.concat([header, group, sizes, ids, entryPayload]));
}

test('readU32Record reads bounded words', () => {
  const buffer = Buffer.alloc(20); buffer.writeUInt32LE(7, 16);
  assert.deepEqual(readU32Record(buffer, 0), [0, 0, 0, 0, 7]);
  assert.throws(() => readU32Record(buffer, 4), /bounds/);
});

test('descriptorWord splits selector bytes from the low count', () => {
  assert.deepEqual(descriptorWord(0x1002005c), {
    value: 0x1002005c,
    highByte: 0x10,
    midByte: 0x02,
    low16: 0x005c,
  });
});

test('inspectFile validates candidate 20-byte records', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const file = path.join(dir, '6100.acts'); writeActs(file);
  const row = inspectFile(file);
  assert.equal(row.relationships.u60EqualsU48Plus20, true);
  assert.equal(row.relationships.at48Word2StableMarker, true);
  assert.equal(row.relationships.after60Word3MatchesLowU56, true);
  assert.equal(row.relationships.at48Word1Low16MatchesU56, true);
  assert.equal(row.derived.descriptorWords.prefix.low16, 89);
  assert.equal(row.derived.lowU56, 89);
});

test('inspectFile preserves complex descriptor selectors while validating low bits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const file = path.join(dir, '6103.acts');
  writeActs(file, 232, 92, 8936, {
    at48Descriptor: 0x1002005c,
    at60DescriptorA: 0x2002007a,
    at60TailOffset: 8520,
    at60DescriptorB: 0x1003005c,
  });
  const row = inspectFile(file);
  assert.equal(row.relationships.at48Word1MatchesU56, false);
  assert.equal(row.relationships.at48Word1Low16MatchesU56, true);
  assert.equal(row.relationships.at60Word1Low16MatchesU56, false);
  assert.equal(row.relationships.at60Word4Low16MatchesU56, true);
  assert.equal(row.derived.descriptorWords.at48Word1.midByte, 2);
  assert.equal(row.derived.descriptorWords.at60Word1.low16, 122);
});

test('inspectTableRanges summarizes bounded regions without exposing payload bytes', () => {
  const payload = Buffer.alloc(128);
  payload.writeUInt32LE(3146120028, 20);
  payload.writeUInt32LE(2097409, 44);
  payload.writeUInt32LE(3611788473, 84);
  const output = inspectTableRanges(payload, [0, 0, 0, 0, 16], [0, 0, 64, 0, 0], 96);
  assert.deepEqual(output.orderedOffsets, [16, 64, 96]);
  assert.deepEqual(output.ranges.map(range => [range.name, range.start, range.end, range.bytes]), [
    ['at48TailToNext', 16, 64, 48],
    ['at60TailToNext', 64, 96, 32],
    ['u16ToPayloadEnd', 96, 128, 32],
  ]);
  assert.equal(output.ranges[0].markerA, 1);
  assert.equal(output.ranges[0].markerB, 1);
  assert.equal(output.ranges[1].postRecordMarker, 1);
  assert.equal(output.at48ToAt60Records.fullRecords, 2);
  assert.equal(Object.hasOwn(output.at48ToAt60Records.samples[0], 'words'), false);
});

test('scanTwentyByteRecords emits hashes and summaries without raw payload words', () => {
  const payload = Buffer.alloc(64);
  payload.writeUInt32LE(3146120028, 0);
  payload.writeUInt32LE(0x1002005c, 4);
  payload.writeUInt32LE(2097409, 20);
  const output = scanTwentyByteRecords(payload, 0, 44, 3);
  assert.equal(output.fullRecords, 2);
  assert.equal(output.trailingBytes, 4);
  assert.equal(output.samples.length, 2);
  assert.match(output.samples[0].sha256, /^[0-9A-F]{64}$/);
  assert.equal(output.samples[0].summary.markerA, 1);
  assert.equal(output.samples[1].summary.markerB, 1);
  assert.equal(Object.hasOwn(output.samples[0], 'words'), false);
});

test('report summarizes corpus validators', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  writeActs(path.join(dir, '6100.acts'), 232, 89, 4896);
  writeActs(path.join(dir, '6101.acts'), 296, 129, 10648);
  const output = report(dir);
  assert.equal(output.summary.inspectedFiles, 2);
  assert.equal(output.summary.validators.u60EqualsU48Plus20, true);
  assert.equal(output.summary.validators.at48Word1Low16MatchesU56, true);
  assert.equal(output.summary.validators.after60MarkerStable, true);
  assert.equal(output.summary.validatorPassCounts.after60MarkerStable, 2);
  assert.deepEqual(output.summary.descriptorShapes.prefix, { 'high=16;mid=4': 2 });
  assert.deepEqual(output.summary.complexCases.rangeLayoutCounts, {});
  assert.equal(output.summary.rangeLayouts.simple.total, 2);
});

test('classifyComplexCases groups descriptor and offset-delta variants', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const simple = path.join(dir, '6100.acts');
  const complex = path.join(dir, '6103.acts');
  writeActs(simple);
  writeActs(complex, 232, 92, 8936, {
    at48Descriptor: 0x1002005c,
    at60DescriptorA: 0x2002007a,
    at48TailOffset: 8368,
    at60TailOffset: 8520,
    at60DescriptorB: 0x1003005c,
  });
  const rows = [inspectFile(simple), inspectFile(complex)];
  const output = classifyComplexCases(rows);
  assert.equal(output.total, 1);
  assert.deepEqual(output.reasonCounts, {
    'at48DescriptorDiffers+at60Word1Low16Differs+offsetDeltaDiffers': 1,
  });
  assert.deepEqual(output.prefixShapeCounts, { 'u48=232;u60=252': 1 });
  assert.deepEqual(output.subgroupCounts, { expandedRange: 1 });
  assert.deepEqual(output.orderedOffsetDeltaCounts, {
    'u16-at48=568;u16-at60=416;at60-at48=152': 1,
  });
  assert.deepEqual(output.samples[0].reasons, [
    'at48DescriptorDiffers',
    'at60Word1Low16Differs',
    'offsetDeltaDiffers',
  ]);
});

test('classifyRangeLayouts compares simple and complex offset gaps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const simple = path.join(dir, '6100.acts');
  const complex = path.join(dir, '6103.acts');
  writeActs(simple, 232, 89, 4896);
  writeActs(complex, 232, 92, 8936, {
    at48Descriptor: 0x1002005c,
    at60DescriptorA: 0x2002007a,
    at48TailOffset: 8368,
    at60TailOffset: 8520,
    at60DescriptorB: 0x1003005c,
  });
  const output = classifyRangeLayouts([inspectFile(simple), inspectFile(complex)]);
  assert.equal(output.simple.total, 1);
  assert.equal(output.complex.total, 1);
  assert.deepEqual(output.simple.at60MinusAt48, { 20: 1 });
  assert.deepEqual(output.complex.at60MinusAt48, { 152: 1 });
});

test('scanner rejects invalid bounds and limits and honors bounded sampling', () => {
  const payload = Buffer.alloc(64);
  for (const limit of [-1, 1.5, NaN, Infinity, '2']) {
    assert.throws(() => scanTwentyByteRecords(payload, 0, 64, limit), /sampleLimit/);
  }
  for (const [start, end] of [[-1, 20], [20, 19], [0, 65], [0.5, 20]]) {
    assert.throws(() => scanTwentyByteRecords(payload, start, end), /bounds/);
  }
  assert.throws(() => scanTwentyByteRecords(null, 0, 0), /Buffer/);
  assert.equal(scanTwentyByteRecords(payload, 0, 64, 0).samples.length, 0);
  const bounded = scanTwentyByteRecords(payload, 0, 64, 1);
  assert.equal(bounded.fullRecords, 3);
  assert.equal(bounded.samples.length, 1);
  assert.equal(bounded.trailingBytes, 4);
  assert.equal(scanTwentyByteRecords(payload, 64, 64).fullRecords, 0);
});

test('complex subgroups distinguish descriptor-only, short, reversed and out-of-bounds ranges', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-subgroups-'));
  try {
    const variants = [
      ['descriptor', 200, 220, 'descriptorOnly'],
      ['expanded', 200, 240, 'expandedRange'],
      ['short', 200, 216, 'shortRange'],
      ['empty', 200, 200, 'shortRange'],
      ['reversed', 200, 196, 'invalidRange'],
      ['outside', 8200, 8220, 'invalidRange'],
    ];
    const rows = variants.map(([name, start, end]) => {
      const file = path.join(dir, `${name}.acts`);
      writeActs(file, 232, 89, 4896, {
        at48Descriptor: 0x10020059,
        at48TailOffset: start,
        at60TailOffset: end,
      });
      return inspectFile(file);
    });
    const result = classifyComplexCases(rows);
    assert.deepEqual(result.samples.map(sample => sample.subgroup), variants.map(v => v[3]));
    assert.deepEqual(result.subgroupCounts, {
      descriptorOnly: 1, expandedRange: 1, shortRange: 2, invalidRange: 2,
    });
    assert.equal(rows[4].derived.tableRanges.at48ToAt60Records, null);
    assert.equal(rows[5].derived.tableRanges.at48ToAt60Records, null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readBody returns structured body data for all layout types', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const simple = path.join(dir, '6100.acts');
  const descExp = path.join(dir, '6103.acts');
  writeActs(simple);
  writeActs(descExp, 232, 92, 8936, {
    at48Descriptor: 0x1002005c,
    at60DescriptorA: 0x2002007a,
    at60TailOffset: 8520,
    at60DescriptorB: 0x1003005c,
  });
  const simpleBody = readBody(simple);
  const descExpBody = readBody(descExp);
  assert.equal(simpleBody.layoutType, 'simple');
  assert.equal(simpleBody.gap, 20);
  assert.equal(simpleBody.at60MatchesPrefix, true);
  assert.equal(simpleBody.expandedBytes, 0);
  assert.equal(descExpBody.layoutType, 'descriptorExpanded');
  assert.equal(descExpBody.at60MatchesPrefix, false);
  assert.equal(simpleBody.descriptor.highByte, 16);
  assert.equal(descExpBody.descriptor.highByte, 32);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('validateLayout confirms layout consistency', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-record-'));
  const simple = path.join(dir, '6100.acts');
  const descExp = path.join(dir, '6103.acts');
  writeActs(simple);
  writeActs(descExp, 232, 92, 8936, {
    at48Descriptor: 0x1002005c,
    at60DescriptorA: 0x2002007a,
    at60TailOffset: 8520,
    at60DescriptorB: 0x1003005c,
  });
  const simpleValid = validateLayout(simple);
  const descExpValid = validateLayout(descExp);
  assert.equal(simpleValid.layoutType, 'simple');
  assert.equal(simpleValid.consistent, true);
  assert.equal(descExpValid.layoutType, 'descriptorExpanded');
  assert.equal(descExpValid.consistent, true);
  fs.rmSync(dir, { recursive: true, force: true });
});
