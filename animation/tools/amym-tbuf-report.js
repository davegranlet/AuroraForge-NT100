'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findTbufBlocks(buffer) {
  const marker = Buffer.from('TBUF');
  const blocks = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf(marker, cursor)) !== -1) {
    if (cursor + 24 <= buffer.length
      && [1, 2].includes(buffer.readUInt32LE(cursor + 4))
      && buffer.toString('ascii', cursor + 16, cursor + 20) === 'ANIM'
      && [10, 11].includes(buffer.readUInt32LE(cursor + 20))) {
      blocks.push({
        offset: cursor,
        tbufVersion: buffer.readUInt32LE(cursor + 4),
        declaredBufferBytes: buffer.readUInt32LE(cursor + 8),
        declaredNativeDataBytes: buffer.readUInt32LE(cursor + 8),
        relocationCount: buffer.readUInt32LE(cursor + 12),
        channelCount: buffer.readUInt32LE(cursor + 12),
        animVersion: buffer.readUInt32LE(cursor + 20),
      });
    }
    cursor += marker.length;
  }
  return blocks.map((block, index, all) => ({
    ...block,
    nextOffset: all[index + 1]?.offset ?? buffer.length,
    spanBytes: (all[index + 1]?.offset ?? buffer.length) - block.offset,
    nativeDataOffset: block.offset + 16,
    nativeDataEnd: block.offset + 16 + block.declaredBufferBytes,
    tableOffset: block.offset + 16 + block.declaredBufferBytes,
    animDataOffset: block.offset + 24,
    animDataBytes: Math.max(0, block.declaredBufferBytes - 8),
    payloadOffset: block.offset + 24,
  }));
}

function readWrapper(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) throw new Error('Truncated animation wrapper');
  const magic = buffer.toString('ascii', 0, 4);
  if (!['AMYM', 'MINA'].includes(magic)) throw new Error('Not an AMYM or MINA wrapper');
  return { magic, [magic === 'AMYM' ? 'groupCount' : 'version']: buffer.readUInt32LE(4), declaredEntries: buffer.readUInt32LE(8) };
}

function report(input) {
  const buffer = fs.readFileSync(path.resolve(input));
  const wrapper = readWrapper(buffer);
  const blocks = findTbufBlocks(buffer);
  return {
    schema: 'aurora-forge-amym-tbuf-report/v1',
    status: 'Research',
    source: { file: path.basename(input), bytes: buffer.length, wrapperMagic: wrapper.magic,
      ...(wrapper.magic === 'AMYM' ? { groupCount: wrapper.groupCount } : { wrapperVersion: wrapper.version }),
      declaredEntries: wrapper.declaredEntries },
    summary: {
      tbufBlocks: blocks.length,
      totalDeclaredBufferBytes: blocks.reduce((sum, block) => sum + block.declaredBufferBytes, 0),
      relocationCounts: Object.fromEntries([...new Set(blocks.map(block => block.relocationCount))].sort((a, b) => a - b).map(count => [count, blocks.filter(block => block.relocationCount === count).length])),
      channelCounts: Object.fromEntries([...new Set(blocks.map(block => block.channelCount))].sort((a, b) => a - b).map(count => [count, blocks.filter(block => block.channelCount === count).length])),
    },
    blocks,
    limits: [
      'This identifies validated TBUF/ANIM wrapper blocks only; it does not interpret their packed payloads as transforms.',
      'Header +12 is reported as relocationCount. channelCount remains as a legacy alias for older research scripts.',
      'declaredBufferBytes starts at TBUF+16 and includes the ANIM header. animDataBytes starts at TBUF+24.',
    ],
  };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/amym-tbuf-report.js <input.acts>');
    process.stdout.write(`${JSON.stringify(report(process.argv[2]), null, 2)}\n`);
  } catch (error) {
    console.error(`AMYM TBUF report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { findTbufBlocks, readWrapper, report };
