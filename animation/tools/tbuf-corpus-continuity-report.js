'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks, readWrapper } = require('./amym-tbuf-report');

const digest = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();

function blockShape(block) {
  return { channelCount: block.channelCount, declaredBufferBytes: block.declaredBufferBytes, spanBytes: block.spanBytes };
}

function declaredPayload(buffer, block) {
  const start = block.offset + 24;
  const end = start + block.declaredBufferBytes;
  if (end > block.nextOffset) throw new Error(`declared payload overruns TBUF block at ${block.offset}`);
  return buffer.subarray(start, end);
}

function prefixMetadata(left, right) {
  const shared = Math.min(left.length, right.length);
  let firstDifference = -1;
  for (let offset = 0; offset < shared; offset += 1) {
    if (left[offset] !== right[offset]) { firstDifference = offset; break; }
  }
  return {
    equal: left.equals(right),
    exactSharedPrefix: firstDifference === -1,
    firstDifference,
    lengthDelta: right.length - left.length,
    leftSha256: digest(left),
    rightSha256: digest(right),
  };
}

function comparePair(leftPath, rightPath) {
  const left = fs.readFileSync(leftPath);
  const right = fs.readFileSync(rightPath);
  const leftBlocks = findTbufBlocks(left);
  const rightBlocks = findTbufBlocks(right);
  const count = Math.min(leftBlocks.length, rightBlocks.length);
  const blocks = [];
  for (let index = 0; index < count; index += 1) {
    const a = leftBlocks[index];
    const b = rightBlocks[index];
    const aPayload = declaredPayload(left, a);
    const bPayload = declaredPayload(right, b);
    blocks.push({
      index,
      left: blockShape(a),
      right: blockShape(b),
      staticHeaderEqual: left.subarray(a.offset, a.offset + 8).equals(right.subarray(b.offset, b.offset + 8))
        && left.subarray(a.offset + 12, a.offset + 24).equals(right.subarray(b.offset + 12, b.offset + 24)),
      payload: prefixMetadata(aPayload, bPayload),
      paddingBytes: { left: a.spanBytes - 24 - a.declaredBufferBytes, right: b.spanBytes - 24 - b.declaredBufferBytes },
    });
  }
  const blockStructureEqual = leftBlocks.length === rightBlocks.length
    && blocks.every(block => block.left.channelCount === block.right.channelCount);
  return {
    leftWrapper: readWrapper(left).magic,
    rightWrapper: readWrapper(right).magic,
    leftBlocks: leftBlocks.length,
    rightBlocks: rightBlocks.length,
    blockStructureEqual,
    allBlocksEqual: blockStructureEqual && blocks.every(block => block.staticHeaderEqual && block.payload.equal),
    allBlocksHaveSharedPrefix: blockStructureEqual && blocks.every(block => block.staticHeaderEqual && block.payload.exactSharedPrefix),
    blocks,
  };
}

function filesWithExtension(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(extension))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function sourceFiles(directory) {
  const acts = filesWithExtension(directory, '.acts');
  const anims = filesWithExtension(directory, '.anims');
  if (acts.length && anims.length) throw new Error('left directory contains both .acts and .anims; select a single game-family directory');
  if (!acts.length && !anims.length) throw new Error('left directory contains neither .acts nor .anims');
  return { extension: acts.length ? '.acts' : '.anims', names: acts.length ? acts : anims };
}

function report(leftDirectory, rightDirectory, sampleLimit = 20) {
  const leftDir = path.resolve(leftDirectory);
  const rightDir = path.resolve(rightDirectory);
  const leftSource = sourceFiles(leftDir);
  const leftNames = leftSource.names;
  const rightByStem = new Map(filesWithExtension(rightDir, '.anims').map(name => [path.parse(name).name.toLowerCase(), name]));
  const matched = leftNames.map(name => ({ left: name, right: rightByStem.get(path.parse(name).name.toLowerCase()) })).filter(pair => pair.right);
  const results = matched.map(pair => ({ name: path.parse(pair.left).name, ...comparePair(path.join(leftDir, pair.left), path.join(rightDir, pair.right)) }));
  const count = predicate => results.filter(predicate).length;
  const comparableBlocks = results.filter(result => result.blockStructureEqual).flatMap(result => result.blocks);
  const channelPayloadStats = Object.fromEntries([...new Set(comparableBlocks.map(block => block.left.channelCount))]
    .sort((a, b) => a - b)
    .map(channelCount => {
      const blocks = comparableBlocks.filter(block => block.left.channelCount === channelCount);
      return [channelCount, {
        blocks: blocks.length,
        exactPayloads: blocks.filter(block => block.payload.equal).length,
        sharedPrefixPayloads: blocks.filter(block => !block.payload.equal && block.payload.exactSharedPrefix).length,
        changedPayloads: blocks.filter(block => !block.payload.exactSharedPrefix).length,
      }];
    }));
  const firstDifferenceOffsets = Object.entries(comparableBlocks
    .filter(block => !block.payload.equal && block.payload.firstDifference >= 0)
    .reduce((counts, block) => {
      counts[block.payload.firstDifference] = (counts[block.payload.firstDifference] || 0) + 1;
      return counts;
    }, {}))
    .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))
    .slice(0, 12)
    .map(([offset, blocks]) => ({ offset: Number(offset), blocks }));
  const exceptions = results.filter(result => !result.allBlocksEqual).slice(0, sampleLimit).map(result => ({
    name: result.name,
    leftWrapper: result.leftWrapper,
    rightWrapper: result.rightWrapper,
    leftBlocks: result.leftBlocks,
    rightBlocks: result.rightBlocks,
    blockStructureEqual: result.blockStructureEqual,
    allBlocksHaveSharedPrefix: result.allBlocksHaveSharedPrefix,
    differingBlocks: result.blocks.filter(block => !block.staticHeaderEqual || !block.payload.equal),
  }));
  return {
    schema: 'aurora-forge-tbuf-corpus-continuity-report/v1',
    status: 'Research',
    source: { leftExtension: leftSource.extension, rightExtension: '.anims', leftFiles: leftNames.length, rightFiles: rightByStem.size, matchedPairs: results.length },
    summary: {
      exactFileBodyContinuity: count(result => result.allBlocksEqual),
      sharedPrefixBodyContinuity: count(result => !result.allBlocksEqual && result.allBlocksHaveSharedPrefix),
      changedWithinSharedBody: count(result => !result.allBlocksHaveSharedPrefix),
      matchingTbufStructure: count(result => result.blockStructureEqual),
      declaredPayloads: {
        comparableBlocks: comparableBlocks.length,
        exact: comparableBlocks.filter(block => block.payload.equal).length,
        sharedPrefixOnly: comparableBlocks.filter(block => !block.payload.equal && block.payload.exactSharedPrefix).length,
        changedWithinSharedRange: comparableBlocks.filter(block => !block.payload.exactSharedPrefix).length,
        byChannelCount: channelPayloadStats,
        commonFirstDifferenceOffsets: firstDifferenceOffsets,
      },
    },
    exceptions,
    limits: [
      'Compares validated TBUF/ANIM headers and their declared payload ranges, reporting metadata and cryptographic digests only; it never exports packed animation payload values.',
      'Alignment padding between a declared payload and the next TBUF marker is intentionally reported but excluded from continuity classification.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/tbuf-corpus-continuity-report.js <2k22-victory-dir> <2k23-victory-dir> [sample-limit]');
    const sampleLimit = process.argv[4] === undefined ? 20 : Number(process.argv[4]);
    if (!Number.isInteger(sampleLimit) || sampleLimit < 1) throw new Error('sample-limit must be a positive integer');
    process.stdout.write(`${JSON.stringify(report(process.argv[2], process.argv[3], sampleLimit), null, 2)}\n`);
  } catch (error) {
    console.error(`TBUF corpus continuity report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { comparePair, report };
