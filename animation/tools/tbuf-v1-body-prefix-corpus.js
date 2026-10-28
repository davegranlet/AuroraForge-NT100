'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks, readWrapper } = require('./amym-tbuf-report');

const PREFIX_BYTES = 64;

function u32Words(buffer, bytes = PREFIX_BYTES) {
  const capped = Math.min(buffer.length, bytes - (bytes % 4));
  const words = [];
  for (let offset = 0; offset < capped; offset += 4) words.push(buffer.readUInt32LE(offset));
  return words;
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map(row => row[key]))].sort((a, b) => a - b);
}

function frequency(rows, key) {
  return Object.fromEntries([...rows.reduce((counts, row) => {
    counts.set(row[key], (counts.get(row[key]) || 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => Number(a[0]) - Number(b[0])));
}

function inspectFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const wrapper = readWrapper(buffer);
  const blocks = findTbufBlocks(buffer);
  const sixBlocks = blocks.map((block, index) => ({ ...block, index })).filter(block => block.relocationCount === 6);
  if (sixBlocks.length !== 1) return { file: path.basename(filePath), skipped: true, reason: `expected one 6-relocation block, found ${sixBlocks.length}` };
  const body = sixBlocks[0];
  const payloadStart = body.animDataOffset;
  const payload = buffer.subarray(payloadStart, payloadStart + body.animDataBytes);
  const words = u32Words(payload);
  const row = {
    file: path.basename(filePath),
    bytes: buffer.length,
    wrapperMagic: wrapper.magic,
    declaredEntries: wrapper.declaredEntries,
    tbufBlocks: blocks.length,
    threeRelocationBlocks: blocks.filter(block => block.relocationCount === 3).length,
    threeChannelBlocks: blocks.filter(block => block.channelCount === 3).length,
    bodyBlockIndex: body.index,
    bodyOffset: body.offset,
    bodyBytes: body.animDataBytes,
    declaredNativeDataBytes: body.declaredBufferBytes,
    relocationCount: body.relocationCount,
    channelCount: body.channelCount,
  };
  words.forEach((word, index) => { row[`u${index * 4}`] = word; });
  row.prefix48Plus20Equals60 = row.u48 + 20 === row.u60;
  row.bodyHasPrefixRoom = row.u0 <= body.animDataBytes && row.u48 <= body.animDataBytes && row.u60 <= body.animDataBytes;
  return row;
}

function filesWithExtension(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map(entry => path.join(directory, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

function report(directory, sampleLimit = 25) {
  const dir = path.resolve(directory);
  const inspected = filesWithExtension(dir, '.acts').map(inspectFile);
  const rows = inspected.filter(row => !row.skipped);
  const skipped = inspected.filter(row => row.skipped);
  const wordKeys = Array.from({ length: PREFIX_BYTES / 4 }, (_, index) => `u${index * 4}`);
  const stablePrefixWords = wordKeys
    .map(key => ({ offset: Number(key.slice(1)), values: uniqueValues(rows, key) }))
    .filter(item => item.values.length === 1)
    .map(item => ({ offset: item.offset, value: item.values[0] }));
  const varyingPrefixWords = wordKeys
    .map(key => ({ offset: Number(key.slice(1)), distinctValues: uniqueValues(rows, key).length }))
    .filter(item => item.distinctValues > 1);
  const prefixShapeCounts = rows.reduce((counts, row) => {
    const key = `u48=${row.u48};u60=${row.u60}`;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const validator = {
    filesWithOneSixChannelBlock: rows.length,
    skippedFiles: skipped.length,
    allBodyBlocksAreLastBlock: rows.every(row => row.bodyBlockIndex === row.tbufBlocks - 1),
    allHaveStableHeaderPrefix: rows.every(row => row.u0 === 24 && row.u4 === 0 && row.u8 === 0 && row.u12 === 0),
    allHaveStableMidSignature: rows.every(row => row.u32 === 8 && row.u36 === 0 && row.u40 === 3614061049 && row.u44 === 2097409),
    allHavePrefix48Plus20Equals60: rows.every(row => row.prefix48Plus20Equals60),
    allBodyBlocksContainCandidateOffsets: rows.every(row => row.bodyHasPrefixRoom),
  };
  return {
    schema: 'aurora-forge-tbuf-v1-body-prefix-corpus/v1',
    status: 'Research',
    source: { directory: dir, files: inspected.length },
    summary: {
      ...validator,
      bodyBlockBytes: { min: Math.min(...rows.map(row => row.bodyBytes)), max: Math.max(...rows.map(row => row.bodyBytes)) },
      tbufBlocks: { min: Math.min(...rows.map(row => row.tbufBlocks)), max: Math.max(...rows.map(row => row.tbufBlocks)) },
      stablePrefixWords,
      varyingPrefixWords,
      prefixShapeCounts,
      u48Frequency: frequency(rows, 'u48'),
      u60Frequency: frequency(rows, 'u60'),
    },
    validator,
    samples: rows.slice(0, sampleLimit),
    skipped: skipped.slice(0, sampleLimit),
    inferredFields: [
      { offset: 0, name: 'candidateHeaderBytes', evidence: 'Stable value 24 across every single-body 2K22 Victory sample.' },
      { offset: 48, name: 'candidateTableOrDescriptorOffset', evidence: 'Value is always inside the body payload and offset 60 is consistently this value plus 20.' },
      { offset: 60, name: 'candidateTableOrDescriptorOffsetPlusRecordBytes', evidence: 'Equals offset 48 + 20 across every single-body 2K22 Victory sample.' },
    ],
    limits: [
      'This validates stable prefix relationships only. It does not decode packed transform samples, bones, quantization, or time mapping.',
      'The report intentionally prints prefix words, counts, and metadata only; it does not dump body payload bytes.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 3) throw new Error('Usage: node tools/tbuf-v1-body-prefix-corpus.js <2k22-victory-dir> [sample-limit]');
    const sampleLimit = process.argv[3] === undefined ? 25 : Number(process.argv[3]);
    if (!Number.isInteger(sampleLimit) || sampleLimit < 1) throw new Error('sample-limit must be a positive integer');
    process.stdout.write(`${JSON.stringify(report(process.argv[2], sampleLimit), null, 2)}\n`);
  } catch (error) {
    console.error(`TBUF v1 body prefix corpus failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspectFile, report, u32Words };
