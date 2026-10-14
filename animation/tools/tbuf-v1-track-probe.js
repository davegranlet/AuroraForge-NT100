'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks, readWrapper } = require('./amym-tbuf-report');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();

function declaredPayload(buffer, block) {
  const start = block.animDataOffset ?? block.offset + 24;
  const bytes = block.animDataBytes ?? Math.max(0, block.declaredBufferBytes - 8);
  const end = start + bytes;
  if (end > block.nextOffset || end > buffer.length) throw new Error(`declared payload overruns TBUF block at ${block.offset}`);
  return buffer.subarray(start, end);
}

function summarizePayload(payload, windowBytes = 64) {
  if (!Number.isInteger(windowBytes) || windowBytes < 1) throw new Error('windowBytes must be a positive integer');
  const windows = [];
  for (let offset = 0; offset < payload.length; offset += windowBytes) {
    const bytes = Math.min(windowBytes, payload.length - offset);
    windows.push({ offset, bytes, sha256: sha256(payload.subarray(offset, offset + bytes)) });
  }
  return windows;
}

function byteDiffRanges(left, right, maxRanges = 16) {
  const sharedBytes = Math.min(left.length, right.length);
  const ranges = [];
  let differentBytes = 0;
  let start = -1;
  for (let offset = 0; offset < sharedBytes; offset += 1) {
    if (left[offset] !== right[offset]) {
      differentBytes += 1;
      if (start === -1) start = offset;
      continue;
    }
    if (start !== -1) {
      if (ranges.length < maxRanges) ranges.push({ start, end: offset - 1, bytes: offset - start });
      start = -1;
    }
  }
  if (start !== -1 && ranges.length < maxRanges) ranges.push({ start, end: sharedBytes - 1, bytes: sharedBytes - start });
  return {
    equal: left.equals(right),
    sharedBytes,
    differentBytes,
    firstDifference: ranges[0]?.start ?? -1,
    lastDifference: ranges.at(-1)?.end ?? -1,
    lengthDelta: right.length - left.length,
    rangesTruncated: differentBytes > ranges.reduce((sum, range) => sum + range.bytes, 0),
    ranges,
  };
}

function payloadWindowDiffs(leftPayload, rightPayload, windowBytes = 64, maxWindows = 24) {
  const sharedBytes = Math.min(leftPayload.length, rightPayload.length);
  const changed = [];
  for (let offset = 0; offset < sharedBytes; offset += windowBytes) {
    const bytes = Math.min(windowBytes, sharedBytes - offset);
    const leftWindow = leftPayload.subarray(offset, offset + bytes);
    const rightWindow = rightPayload.subarray(offset, offset + bytes);
    if (!leftWindow.equals(rightWindow)) {
      changed.push({
        offset,
        bytes,
        leftSha256: sha256(leftWindow),
        rightSha256: sha256(rightWindow),
      });
    }
  }
  return { changedWindows: changed.length, sample: changed.slice(0, maxWindows), truncated: changed.length > maxWindows };
}

function payloadPrefixWords(payload, bytes = 64) {
  const cappedBytes = Math.min(payload.length, bytes - (bytes % 4));
  const words = [];
  for (let offset = 0; offset < cappedBytes; offset += 4) words.push({ offset, u32: payload.readUInt32LE(offset), i32: payload.readInt32LE(offset) });
  return words;
}

function blockSummary(buffer, block, index, windowBytes = 64, includeWindowHashes = false, includePrefixWords = false) {
  const payload = declaredPayload(buffer, block);
  const summary = {
    index,
    offset: block.offset,
    tbufVersion: block.tbufVersion,
    animVersion: block.animVersion,
    relocationCount: block.relocationCount,
    channelCount: block.channelCount,
    declaredBufferBytes: block.declaredBufferBytes,
    declaredNativeDataBytes: block.declaredNativeDataBytes ?? block.declaredBufferBytes,
    animDataBytes: block.animDataBytes ?? Math.max(0, block.declaredBufferBytes - 8),
    tableOffset: block.tableOffset,
    spanBytes: block.spanBytes,
    trailingBytesAfterDeclaredData: block.nextOffset - (block.tableOffset ?? block.offset + 16 + block.declaredBufferBytes),
    paddingBytes: block.nextOffset - (block.tableOffset ?? block.offset + 16 + block.declaredBufferBytes),
    payloadSha256: sha256(payload),
  };
  if (includePrefixWords) summary.payloadPrefixWords = payloadPrefixWords(payload, 64);
  if (includeWindowHashes) summary.payloadWindows = summarizePayload(payload, windowBytes);
  return summary;
}

function readAnimationFile(inputPath, options = {}) {
  const filePath = path.resolve(inputPath);
  const buffer = fs.readFileSync(filePath);
  const wrapper = readWrapper(buffer);
  const blocks = findTbufBlocks(buffer);
  return {
    filePath,
    name: path.basename(filePath),
    buffer,
    wrapper,
    blocks,
    summary: {
      file: path.basename(filePath),
      bytes: buffer.length,
      wrapperMagic: wrapper.magic,
      ...(wrapper.magic === 'AMYM' ? { groupCount: wrapper.groupCount } : { wrapperVersion: wrapper.version }),
      declaredEntries: wrapper.declaredEntries,
      tbufBlocks: blocks.length,
      relocationCounts: Object.fromEntries([...new Set(blocks.map(block => block.relocationCount))]
        .sort((a, b) => a - b)
        .map(count => [count, blocks.filter(block => block.relocationCount === count).length])),
      channelCounts: Object.fromEntries([...new Set(blocks.map(block => block.channelCount))]
        .sort((a, b) => a - b)
        .map(count => [count, blocks.filter(block => block.channelCount === count).length])),
      blocks: blocks.map((block, index) => blockSummary(buffer, block, index, options.windowBytes ?? 64, Boolean(options.includeWindowHashes), Boolean(options.includePrefixWords))),
    },
  };
}

function occurrenceKey(blocks, index) {
  const block = blocks[index];
  const count = block.relocationCount ?? block.channelCount;
  const occurrence = blocks.slice(0, index + 1).filter(candidate => (candidate.relocationCount ?? candidate.channelCount) === count).length - 1;
  return `${count}:${occurrence}`;
}

function blockMapByChannelOccurrence(file) {
  return new Map(file.blocks.map((block, index) => [occurrenceKey(file.blocks, index), { block, index }]));
}

function compareMatchedBlock(leftFile, rightFile, leftEntry, rightEntry, options = {}) {
  const left = leftEntry.block;
  const right = rightEntry.block;
  const leftPayload = declaredPayload(leftFile.buffer, left);
  const rightPayload = declaredPayload(rightFile.buffer, right);
  return {
    key: occurrenceKey(leftFile.blocks, leftEntry.index),
    leftIndex: leftEntry.index,
    rightIndex: rightEntry.index,
    sameShape: left.relocationCount === right.relocationCount && left.declaredBufferBytes === right.declaredBufferBytes,
    relocationCount: left.relocationCount,
    channelCount: left.channelCount,
    declaredBufferBytes: { left: left.declaredBufferBytes, right: right.declaredBufferBytes },
    animDataBytes: { left: left.animDataBytes, right: right.animDataBytes },
    payload: {
      leftSha256: sha256(leftPayload),
      rightSha256: sha256(rightPayload),
      ...byteDiffRanges(leftPayload, rightPayload, options.maxRanges ?? 16),
    },
    changedPayloadWindows: payloadWindowDiffs(leftPayload, rightPayload, options.windowBytes ?? 64, options.maxWindows ?? 24),
  };
}

function compareByChannelOccurrence(leftFile, rightFile, options = {}) {
  const leftMap = blockMapByChannelOccurrence(leftFile);
  const rightMap = blockMapByChannelOccurrence(rightFile);
  const keys = [...leftMap.keys()].filter(key => rightMap.has(key));
  const blocks = keys.map(key => compareMatchedBlock(leftFile, rightFile, leftMap.get(key), rightMap.get(key), options));
  return {
    pair: `${leftFile.name} -> ${rightFile.name}`,
    matchedBlocks: blocks.length,
    leftOnlyKeys: [...leftMap.keys()].filter(key => !rightMap.has(key)),
    rightOnlyKeys: [...rightMap.keys()].filter(key => !leftMap.has(key)),
    sameMatchedDeclaredSizes: blocks.every(block => block.declaredBufferBytes.left === block.declaredBufferBytes.right),
    blocks,
  };
}
function compareAlignedBlocks(leftFile, rightFile, options = {}) {
  const count = Math.min(leftFile.blocks.length, rightFile.blocks.length);
  const blocks = [];
  for (let index = 0; index < count; index += 1) {
    const left = leftFile.blocks[index];
    const right = rightFile.blocks[index];
    const leftPayload = declaredPayload(leftFile.buffer, left);
    const rightPayload = declaredPayload(rightFile.buffer, right);
    blocks.push({
      index,
      sameShape: left.relocationCount === right.relocationCount && left.declaredBufferBytes === right.declaredBufferBytes,
      relocationCount: { left: left.relocationCount, right: right.relocationCount },
      channelCount: { left: left.channelCount, right: right.channelCount },
      declaredBufferBytes: { left: left.declaredBufferBytes, right: right.declaredBufferBytes },
      animDataBytes: { left: left.animDataBytes, right: right.animDataBytes },
      payload: {
        leftSha256: sha256(leftPayload),
        rightSha256: sha256(rightPayload),
        ...byteDiffRanges(leftPayload, rightPayload, options.maxRanges ?? 16),
      },
      changedPayloadWindows: payloadWindowDiffs(leftPayload, rightPayload, options.windowBytes ?? 64, options.maxWindows ?? 24),
    });
  }
  return {
    pair: `${leftFile.name} -> ${rightFile.name}`,
    leftBlocks: leftFile.blocks.length,
    rightBlocks: rightFile.blocks.length,
    comparedBlocks: count,
    sameBlockCount: leftFile.blocks.length === rightFile.blocks.length,
    sameRelocationOrder: leftFile.blocks.length === rightFile.blocks.length
      && blocks.every(block => block.relocationCount.left === block.relocationCount.right),
    sameChannelOrder: leftFile.blocks.length === rightFile.blocks.length
      && blocks.every(block => block.channelCount.left === block.channelCount.right),
    sameDeclaredSizes: leftFile.blocks.length === rightFile.blocks.length
      && blocks.every(block => block.declaredBufferBytes.left === block.declaredBufferBytes.right),
    blocks,
  };
}

function report(inputs, options = {}) {
  if (!Array.isArray(inputs) || inputs.length < 1) throw new Error('at least one input file is required');
  const files = inputs.map(input => readAnimationFile(input, options));
  return {
    schema: 'aurora-forge-tbuf-v1-track-probe/v1',
    status: 'Research',
    source: {
      files: files.map(file => ({ path: file.filePath, bytes: file.buffer.length })),
      windowBytes: options.windowBytes ?? 64,
    },
    files: files.map(file => file.summary),
    comparisons: files.slice(1).map(file => compareAlignedBlocks(files[0], file, options)),
    channelOccurrenceComparisons: files.slice(1).map(file => compareByChannelOccurrence(files[0], file, options)),
    findingsHint: [
      'sameChannelOrder=true means block ordering is directly comparable between these reference files.',
      'Header +12 is relocationCount; channelCount remains in output only as a legacy alias.',
      'sameDeclaredSizes=true means byte-level windows can be compared without a size-mapping step.',
      'changedPayloadWindows samples hash only the changed regions; no proprietary payload bytes are printed.',
    ],
    limits: [
      'This is a semantic-probe scaffold. It identifies candidate varying payload regions but does not yet decode transforms, keyframes, quantization, bones, or time mapping.',
      'Output is intended for local research notes. Avoid committing reports that include absolute local paths.',
    ],
  };
}

function parseCli(argv) {
  const inputs = [];
  const options = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--window-bytes') {
      options.windowBytes = Number(argv[++index]);
      if (!Number.isInteger(options.windowBytes) || options.windowBytes < 1) throw new Error('--window-bytes must be a positive integer');
    } else if (arg === '--max-ranges') {
      options.maxRanges = Number(argv[++index]);
      if (!Number.isInteger(options.maxRanges) || options.maxRanges < 1) throw new Error('--max-ranges must be a positive integer');
    } else if (arg === '--max-windows') {
      options.maxWindows = Number(argv[++index]);
      if (!Number.isInteger(options.maxWindows) || options.maxWindows < 1) throw new Error('--max-windows must be a positive integer');
    } else if (arg === '--include-window-hashes') {
      options.includeWindowHashes = true;
    } else if (arg === '--include-prefix-words') {
      options.includePrefixWords = true;
    } else {
      inputs.push(arg);
    }
  }
  if (!inputs.length) throw new Error('Usage: node tools/tbuf-v1-track-probe.js [--window-bytes 64] [--max-ranges 16] [--max-windows 24] [--include-prefix-words] <base.acts> [compare.acts ...]');
  return { inputs, options };
}

if (require.main === module) {
  try {
    const { inputs, options } = parseCli(process.argv);
    process.stdout.write(`${JSON.stringify(report(inputs, options), null, 2)}\n`);
  } catch (error) {
    console.error(`TBUF v1 track probe failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  byteDiffRanges,
  payloadWindowDiffs,
  payloadPrefixWords,
  readAnimationFile,
  compareByChannelOccurrence,
  report,
};



