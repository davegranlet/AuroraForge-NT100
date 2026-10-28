'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { findTbufBlocks, readWrapper } = require('./amym-tbuf-report');
const { inspectOffsetHypotheses, summarizeOffsetHypotheses } = require('./tbuf-v1-body-offset-hypotheses');

const RECORD_BYTES = 20;
const MARKER_A = 3146120028;
const MARKER_B = 2097409;
const POST_RECORD_MARKER = 3611788473;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();

function descriptorWord(value) {
  return {
    value,
    highByte: value >>> 24,
    midByte: (value >>> 16) & 0xff,
    low16: value & 0xffff,
  };
}

function readU32Record(buffer, offset, words = 5) {
  if (!Buffer.isBuffer(buffer) || !Number.isInteger(offset) || offset < 0 || offset + words * 4 > buffer.length) {
    throw new Error('u32 record exceeds buffer bounds');
  }
  return Array.from({ length: words }, (_, index) => buffer.readUInt32LE(offset + index * 4));
}

function countU32(buffer, value) {
  let count = 0;
  const alignedBytes = buffer.length - (buffer.length % 4);
  for (let offset = 0; offset < alignedBytes; offset += 4) {
    if (buffer.readUInt32LE(offset) === value) count += 1;
  }
  return count;
}

function rangeSummary(payload, start, end, name) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > payload.length) {
    throw new Error(`${name} range exceeds payload bounds`);
  }
  const bytes = payload.subarray(start, end);
  return {
    name,
    start,
    end,
    bytes: bytes.length,
    sha256: sha256(bytes),
    u32Words: Math.floor(bytes.length / 4),
    zeroU32: countU32(bytes, 0),
    markerA: countU32(bytes, MARKER_A),
    markerB: countU32(bytes, MARKER_B),
    postRecordMarker: countU32(bytes, POST_RECORD_MARKER),
  };
}

function wordSummary(words) {
  return {
    zeroWords: words.filter(word => word === 0).length,
    markerA: words.filter(word => word === MARKER_A).length,
    markerB: words.filter(word => word === MARKER_B).length,
    postRecordMarker: words.filter(word => word === POST_RECORD_MARKER).length,
    descriptorShapes: words
      .map(descriptorWord)
      .filter(word => word.highByte || word.midByte)
      .map(word => descriptorShape(word)),
  };
}

function scanTwentyByteRecords(payload, start, end, sampleLimit = 12) {
  if (!Buffer.isBuffer(payload)) throw new Error('20-byte record scan requires a Buffer');
  if (!Number.isSafeInteger(sampleLimit) || sampleLimit < 0) {
    throw new Error('20-byte record scan sampleLimit must be a non-negative safe integer');
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > payload.length) {
    throw new Error('20-byte record scan range exceeds payload bounds');
  }
  const bytes = payload.subarray(start, end);
  const fullRecords = Math.floor(bytes.length / RECORD_BYTES);
  const records = [];
  for (let index = 0; index < fullRecords && index < sampleLimit; index += 1) {
    const offset = start + index * RECORD_BYTES;
    const words = readU32Record(payload, offset);
    records.push({
      index,
      offset,
      sha256: sha256(payload.subarray(offset, offset + RECORD_BYTES)),
      summary: wordSummary(words),
    });
  }
  return {
    start,
    end,
    bytes: bytes.length,
    fullRecords,
    trailingBytes: bytes.length % RECORD_BYTES,
    sampleLimit,
    samples: records,
  };
}

function inspectTableRanges(payload, at48, at60, u16) {
  const starts = [at48[4], at60[2], u16]
    .filter(offset => Number.isInteger(offset) && offset >= 0 && offset <= payload.length)
    .sort((a, b) => a - b);
  const uniqueStarts = [...new Set(starts)];
  const ranges = [];
  for (let index = 0; index < uniqueStarts.length; index += 1) {
    const start = uniqueStarts[index];
    const end = uniqueStarts[index + 1] ?? payload.length;
    const name = start === at48[4]
      ? 'at48TailToNext'
      : start === at60[2]
        ? 'at60TailToNext'
        : 'u16ToPayloadEnd';
    ranges.push(rangeSummary(payload, start, end, name));
  }
  return {
    offsets: {
      at48Word4: at48[4],
      at60Word2: at60[2],
      u16,
    },
    orderedOffsets: uniqueStarts,
    ranges,
    at48ToAt60Records: inspectAt48ToAt60Records(payload, at48[4], at60[2]),
  };
}

function inspectAt48ToAt60Records(payload, start, end) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > payload.length) {
    return null;
  }
  return scanTwentyByteRecords(payload, start, end);
}

function findSingleBodyBlock(buffer) {
  readWrapper(buffer);
  const blocks = findTbufBlocks(buffer).map((block, index) => ({ ...block, index }));
  const bodyBlocks = blocks.filter(block => block.relocationCount === 6);
  if (bodyBlocks.length !== 1) throw new Error(`expected one 6-relocation body block, found ${bodyBlocks.length}`);
  return { blocks, body: bodyBlocks[0] };
}

function inspectFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { blocks, body } = findSingleBodyBlock(buffer);
  const payload = buffer.subarray(body.animDataOffset, body.animDataOffset + body.animDataBytes);
  const u16 = payload.readUInt32LE(16);
  const u48 = payload.readUInt32LE(48);
  const u56 = payload.readUInt32LE(56);
  const u60 = payload.readUInt32LE(60);
  if (u48 + RECORD_BYTES > payload.length || u60 + RECORD_BYTES > payload.length) throw new Error('candidate body records exceed payload bounds');
  const at48 = readU32Record(payload, u48);
  const at60 = readU32Record(payload, u60);
  const after60 = readU32Record(payload, u60 + RECORD_BYTES);
  const prefixDescriptor = descriptorWord(u56);
  const at48Descriptor = descriptorWord(at48[1]);
  const at60DescriptorA = descriptorWord(at60[1]);
  const at60DescriptorB = descriptorWord(at60[4]);
const at60_1_value = at60[1];
  const at60_1_desc = descriptorWord(at60_1_value);
  const prefixValue = u56;
  const at60_1_matches_prefix = at60_1_value === prefixValue;
  const gap = at60[2] - at48[4];
  const gapIsSimple = gap === RECORD_BYTES;
  const layoutType = (!at60_1_matches_prefix) ? 'descriptorExpanded' : (!gapIsSimple) ? 'offsetExpanded' : 'simple';
  const relationships = {
    bodyIsLastBlock: body.index === blocks.length - 1,
    u60EqualsU48Plus20: u60 === u48 + RECORD_BYTES,
    at48Word0Zero: at48[0] === 0,
    at48Word1MatchesU56: at48[1] === u56,
    at48Word1Low16MatchesU56: at48Descriptor.low16 === prefixDescriptor.low16,
    at48Word2StableMarker: at48[2] === MARKER_A,
    at48Word3StableMarker: at48[3] === MARKER_B,
    at60Word0Zero: at60[0] === 0,
    at60Word1Low16MatchesU56: at60DescriptorA.low16 === prefixDescriptor.low16,
    at60Word2EqualsAt48Word4Plus20: at60[2] === at48[4] + RECORD_BYTES,
    at60Word4Low16MatchesU56: at60DescriptorB.low16 === prefixDescriptor.low16,
    after60MarkerStable: after60[0] === POST_RECORD_MARKER,
    after60Word1Stable: after60[1] === 524288,
    after60Word3MatchesLowU56: after60[3] === (u56 & 0xffff),
    at60Word1MatchesPrefix: at60_1_matches_prefix,
    gapIsSimple: gapIsSimple,
    descriptorExpanded: !at60_1_matches_prefix,
    offsetExpanded: at60_1_matches_prefix && !gapIsSimple,
    descriptorSelector: at60_1_desc,
    layoutType: layoutType,
  };
  return {
    file: path.basename(filePath),
    bodyBytes: body.animDataBytes,
    declaredNativeDataBytes: body.declaredBufferBytes,
    relocationCount: body.relocationCount,
    channelCount: body.channelCount,
    tbufBlocks: blocks.length,
    bodyBlockIndex: body.index,
    prefix: { u16, u48, u56, u60 },
    candidateRecords: { at48, at60, after60 },
    derived: {
      at48Word4DeltaFromU16: u16 - at48[4],
      at60Word2DeltaFromU16: u16 - at60[2],
      lowU56: u56 & 0xffff,
      descriptorWords: {
        prefix: prefixDescriptor,
        at48Word1: at48Descriptor,
        at60Word1: at60DescriptorA,
        at60Word4: at60DescriptorB,
      },
      tableRanges: inspectTableRanges(payload, at48, at60, u16),
      offsetHypotheses: inspectOffsetHypotheses(payload, u48, u60, at48, at60, prefixDescriptor.low16),
    },
    relationships,
  };
}

function filesWithExtension(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map(entry => path.join(directory, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function frequency(rows, selector) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(selector(row));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
}

function descriptorShape(word) {
  return `high=${word.highByte};mid=${word.midByte}`;
}

function complexReasons(row) {
  const reasons = [];
  if (!row.relationships.at48Word1MatchesU56) reasons.push('at48DescriptorDiffers');
  if (!row.relationships.at48Word1Low16MatchesU56) reasons.push('at48Low16Differs');
  if (!row.relationships.at60Word1Low16MatchesU56) reasons.push('at60Word1Low16Differs');
  if (!row.relationships.at60Word2EqualsAt48Word4Plus20) reasons.push('offsetDeltaDiffers');
  if (!row.relationships.at60Word4Low16MatchesU56) reasons.push('at60Word4Low16Differs');
  return reasons;
}

function complexSubgroup(row) {
  const { at48Word4: start, at60Word2: end } = row.derived.tableRanges.offsets;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > row.bodyBytes) {
    return 'invalidRange';
  }
  const bytes = end - start;
  if (bytes === RECORD_BYTES) return 'descriptorOnly';
  return bytes > RECORD_BYTES ? 'expandedRange' : 'shortRange';
}

function classifyComplexCases(rows, sampleLimit = 25) {
  const complex = rows
    .map(row => ({ row, reasons: complexReasons(row) }))
    .filter(item => item.reasons.length > 0);
  const reasonCounts = frequency(complex, item => item.reasons.join('+'));
  const shapeCounts = frequency(complex, item => [
    descriptorShape(item.row.derived.descriptorWords.at48Word1),
    descriptorShape(item.row.derived.descriptorWords.at60Word1),
    descriptorShape(item.row.derived.descriptorWords.at60Word4),
  ].join('|'));
  const prefixShapeCounts = frequency(complex, item => `u48=${item.row.prefix.u48};u60=${item.row.prefix.u60}`);
  const subgroupCounts = frequency(complex, item => complexSubgroup(item.row));
  const orderedOffsetDeltaCounts = frequency(complex, item => {
    const offsets = item.row.derived.tableRanges.offsets;
    return [
      `u16-at48=${offsets.u16 - offsets.at48Word4}`,
      `u16-at60=${offsets.u16 - offsets.at60Word2}`,
      `at60-at48=${offsets.at60Word2 - offsets.at48Word4}`,
    ].join(';');
  });
  const rangeLayoutCounts = frequency(complex, item => item.row.derived.tableRanges.ranges.map(range => `${range.name}:${range.bytes}`).join('|'));
  return {
    total: complex.length,
    reasonCounts,
    shapeCounts,
    prefixShapeCounts,
    subgroupCounts,
    orderedOffsetDeltaCounts,
    rangeLayoutCounts,
    samples: complex.slice(0, sampleLimit).map(({ row, reasons }) => ({
      file: row.file,
      reasons,
      bodyBytes: row.bodyBytes,
      tbufBlocks: row.tbufBlocks,
      prefix: row.prefix,
      derived: row.derived,
      subgroup: complexSubgroup(row),
    })),
  };
}

function classifyRangeLayouts(rows) {
  const grouped = {
    simple: rows.filter(row => complexReasons(row).length === 0),
    complex: rows.filter(row => complexReasons(row).length > 0),
  };
  return Object.fromEntries(Object.entries(grouped).map(([name, group]) => [name, {
    total: group.length,
    at60MinusAt48: frequency(group, row => row.derived.tableRanges.offsets.at60Word2 - row.derived.tableRanges.offsets.at48Word4),
    u16MinusAt60: frequency(group, row => row.derived.tableRanges.offsets.u16 - row.derived.tableRanges.offsets.at60Word2),
    u16MinusAt48: frequency(group, row => row.derived.tableRanges.offsets.u16 - row.derived.tableRanges.offsets.at48Word4),
  }]));
}

function report(directory, sampleLimit = 25) {
  const dir = path.resolve(directory);
  const rows = [];
  const skipped = [];
  for (const file of filesWithExtension(dir, '.acts')) {
    try { rows.push(inspectFile(file)); }
    catch (error) { skipped.push({ file: path.basename(file), reason: error.message }); }
  }
  const relationKeys = rows.length ? Object.keys(rows[0].relationships) : [];
  const validatorPassCounts = Object.fromEntries(relationKeys.map(key => [key, rows.filter(row => row.relationships[key]).length]));
  const validators = Object.fromEntries(relationKeys.map(key => [key, validatorPassCounts[key] === rows.length]));
const descriptorSelectorCounts = frequency(rows, row => row.relationships.layoutType);
      const descriptorSelectorDetail = {
        simpleCount: descriptorSelectorCounts.simple || 0,
        descriptorExpandedCount: descriptorSelectorCounts.descriptorExpanded || 0,
        offsetExpandedCount: descriptorSelectorCounts.offsetExpanded || 0,
        descriptorOnlyCount: rows.filter(row => row.relationships.at60Word1MatchesPrefix && row.relationships.at48Word1 !== row.prefix.u56).length,
        simpleDescriptor: descriptorShape(rows.find(row => row.relationships.layoutType === 'simple')?.derived.descriptorWords.at60Word1),
        descriptorWordCounts: frequency(rows, row => {
          const d = row.derived.descriptorWords.at60Word1;
          return `high=${d.highByte};mid=${d.midByte};low=${d.low16}`;
        }),
        highByteDistribution: frequency(rows, row => (row.derived.descriptorWords.at60Word1.highByte).toString()),
        layoutTypeDistribution: frequency(rows, row => row.relationships.layoutType),
      };
      return {
        schema: 'aurora-forge-tbuf-v1-body-candidate-record/v1',
        status: 'Research',
        source: { directory: dir, files: rows.length + skipped.length },
        summary: {
          inspectedFiles: rows.length,
          skippedFiles: skipped.length,
          validators,
          validatorPassCounts,
          prefixShapeCounts: frequency(rows, row => `u48=${row.prefix.u48};u60=${row.prefix.u60}`),
          at48Word4DeltaFromU16: frequency(rows, row => row.derived.at48Word4DeltaFromU16),
          at60Word2DeltaFromU16: frequency(rows, row => row.derived.at60Word2DeltaFromU16),
          lowU56: frequency(rows, row => row.derived.lowU56),
          descriptorShapes: {
            prefix: frequency(rows, row => descriptorShape(row.derived.descriptorWords.prefix)),
            at48Word1: frequency(rows, row => descriptorShape(row.derived.descriptorWords.at48Word1)),
            at60Word1: frequency(rows, row => descriptorShape(row.derived.descriptorWords.at60Word1)),
            at60Word4: frequency(rows, row => descriptorShape(row.derived.descriptorWords.at60Word4)),
          },
          descriptorSelectorSummary: descriptorSelectorDetail,
          rangeLayouts: classifyRangeLayouts(rows),
          complexCases: classifyComplexCases(rows, sampleLimit),
          offsetHypotheses: summarizeOffsetHypotheses(rows),
        },
    inferredFields: [
      { offset: 'prefix+48', name: 'candidateRecordAOffset', evidence: 'Points to a 20-byte record whose words 2 and 3 are stable markers across the corpus.' },
      { offset: 'prefix+56', name: 'candidateBodyDescriptor', evidence: 'The low 16 bits match the post-record count across the single-body corpus; upper bytes are stable in the prefix and may distinguish descriptor class.' },
      { offset: 'prefix+60', name: 'candidateRecordBOffset', evidence: 'Always equals candidateRecordAOffset + 20. In simple cases, record B word 2 equals record A word 4 + 20; complex cases change descriptor selector bytes, low-count fields, and offset deltas.' },
      { offset: 'candidateRecordBOffset+20', name: 'candidatePostRecord', evidence: 'Begins with stable marker 3611788473 and contains a small count matching the low 16 bits of prefix u56.' },
    ],
    samples: rows.slice(0, sampleLimit),
    skipped: skipped.slice(0, sampleLimit),
    limits: [
      'This names and validates candidate table records by structural relationships only. It does not decode transform values or emit packed payload bytes.',
      'tableRanges retains the original absolute-offset hypothesis. offsetHypotheses compares absolute, record-relative and field-relative addresses; 20-byte scan windows are not established semantic records.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 3) throw new Error('Usage: node tools/tbuf-v1-body-candidate-record.js <2k22-victory-dir> [sample-limit]');
    const sampleLimit = process.argv[3] === undefined ? 25 : Number(process.argv[3]);
    if (!Number.isInteger(sampleLimit) || sampleLimit < 1) throw new Error('sample-limit must be a positive integer');
    process.stdout.write(`${JSON.stringify(report(process.argv[2], sampleLimit), null, 2)}\n`);
  } catch (error) {
    console.error(`TBUF v1 body candidate record failed: ${error.message}`);
    process.exitCode = 1;
  }
}

function readBody(filePath) {
  const buffer = fs.readFileSync(filePath);
  const { blocks, body } = findSingleBodyBlock(buffer);
  const payload = buffer.subarray(body.animDataOffset, body.animDataOffset + body.animDataBytes);
  const u48 = payload.readUInt32LE(48);
  const u60 = payload.readUInt32LE(60);
  const u56 = payload.readUInt32LE(56);
  const at48 = readU32Record(payload, u48);
  const at60 = readU32Record(payload, u60);
  const prefixDescriptor = descriptorWord(u56);
  const at60Descriptor = descriptorWord(at60[1]);
  const gap = at60[2] - at48[4];
  const gapIsSimple = gap === RECORD_BYTES;
  const at60MatchesPrefix = at60[1] === u56;
  const layoutType = (!at60MatchesPrefix) ? 'descriptorExpanded' : (!gapIsSimple) ? 'offsetExpanded' : 'simple';
  const expandedBytes = gap - RECORD_BYTES;
  return {
    file: path.basename(filePath),
    bodyBytes: body.animDataBytes,
    relocationCount: body.relocationCount,
    channelCount: body.channelCount,
    prefix: u56,
    at60Value: at60[1],
    descriptor: at60Descriptor,
    gap,
    gapIsSimple,
    at60MatchesPrefix,
    layoutType,
    expandedBytes,
    tableRanges: inspectTableRanges(payload, at48, at60, payload.readUInt32LE(16)),
  };
}

function validateLayout(filePath) {
  const row = inspectFile(filePath);
  const body = readBody(filePath);
  const validators = {
    layoutType: row.relationships.layoutType,
    at60MatchesPrefix: row.relationships.at60Word1MatchesPrefix,
    gapIsSimple: row.relationships.gapIsSimple,
    descriptorExpanded: row.relationships.descriptorExpanded,
    offsetExpanded: row.relationships.offsetExpanded,
    simple: row.relationships.simple,
  };
  const consistent = (body.layoutType === row.relationships.layoutType)
    && (body.at60MatchesPrefix === row.relationships.at60Word1MatchesPrefix)
    && (body.gapIsSimple === row.relationships.gapIsSimple);
  return { ...validators, consistent };
}

module.exports = { classifyComplexCases, classifyRangeLayouts, descriptorWord, inspectFile, inspectTableRanges, readBody, readU32Record, report, scanTwentyByteRecords, validateLayout };
