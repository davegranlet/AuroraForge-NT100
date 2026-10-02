'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks } = require('./amym-tbuf-report');

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();

function chooseBlock(buffer, channelCount, ordinal) {
  const blocks = findTbufBlocks(buffer).filter(block => block.channelCount === channelCount);
  const block = blocks[ordinal];
  if (!block) throw new Error(`no channel-count ${channelCount} TBUF block at ordinal ${ordinal}`);
  return { ...block, occurrence: ordinal, bytes: buffer.subarray(block.offset, block.nextOffset) };
}

function compareBuffers(left, right) {
  const sharedBytes = Math.min(left.length, right.length);
  let differentBytes = 0;
  let firstDifference = -1;
  let lastDifference = -1;
  for (let index = 0; index < sharedBytes; index += 1) {
    if (left[index] === right[index]) continue;
    differentBytes += 1;
    if (firstDifference === -1) firstDifference = index;
    lastDifference = index;
  }
  return {
    leftBytes: left.length,
    rightBytes: right.length,
    sharedBytes,
    equal: left.equals(right),
    exactSharedPrefix: differentBytes === 0,
    differentBytesOverSharedLength: differentBytes,
    firstDifference,
    lastDifference,
    lengthDelta: right.length - left.length,
    leftSha256: sha256(left),
    rightSha256: sha256(right),
  };
}

function run(leftPath, rightPath, channelCount = 6, ordinal = 0) {
  const leftFile = fs.readFileSync(path.resolve(leftPath));
  const rightFile = fs.readFileSync(path.resolve(rightPath));
  const left = chooseBlock(leftFile, channelCount, ordinal);
  const right = chooseBlock(rightFile, channelCount, ordinal);
  return {
    schema: 'aurora-forge-tbuf-block-compare/v1',
    status: 'Research',
    selection: { channelCount, occurrence: ordinal },
    left: { file: path.basename(leftPath), offset: left.offset, spanBytes: left.spanBytes, declaredBufferBytes: left.declaredBufferBytes },
    right: { file: path.basename(rightPath), offset: right.offset, spanBytes: right.spanBytes, declaredBufferBytes: right.declaredBufferBytes },
    comparison: compareBuffers(left.bytes, right.bytes),
    limits: ['This compares whole validated TBUF block bytes and reports hashes/difference metadata only; it does not expose or decode animation payload values.'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/tbuf-block-compare.js <left.anims> <right.anims> [channel-count] [occurrence]');
    const channelCount = process.argv[4] === undefined ? 6 : Number(process.argv[4]);
    const occurrence = process.argv[5] === undefined ? 0 : Number(process.argv[5]);
    if (!Number.isInteger(channelCount) || channelCount < 1) throw new Error('channel-count must be a positive integer');
    if (!Number.isInteger(occurrence) || occurrence < 0) throw new Error('occurrence must be a non-negative integer');
    process.stdout.write(`${JSON.stringify(run(process.argv[2], process.argv[3], channelCount, occurrence), null, 2)}\n`);
  } catch (error) {
    console.error(`TBUF block comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { chooseBlock, compareBuffers, run };
