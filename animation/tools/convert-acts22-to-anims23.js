'use strict';

// This is a safety gate, not a motion converter. A v1 TBUF/ANIM payload may
// only be copied when it is already byte-identical to its target counterpart.
const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks } = require('./amym-tbuf-report');

function blocks(buffer) {
  return findTbufBlocks(buffer).map(block => ({
    ...block,
    // The span includes version-specific alignment/padding before the next
    // marker.  Only the header plus declared payload is motion codec data.
    encodedBytes: buffer.subarray(block.offset, block.offset + 24 + block.declaredBufferBytes),
  }));
}

function assertByteIdenticalBlocks(sourceBlocks, targetBlocks) {
  if (!sourceBlocks.length || !targetBlocks.length) throw new Error('no validated TBUF blocks found');
  if (sourceBlocks.length !== targetBlocks.length) {
    throw new Error(`TBUF block count mismatch: ${sourceBlocks.length} vs ${targetBlocks.length}`);
  }
  for (let index = 0; index < sourceBlocks.length; index += 1) {
    const source = sourceBlocks[index];
    const target = targetBlocks[index];
    if (source.channelCount !== target.channelCount
      || source.declaredBufferBytes !== target.declaredBufferBytes) {
      throw new Error(`unresolved TBUF payload layout at block ${index}; refusing payload copy`);
    }
    if (!source.encodedBytes.equals(target.encodedBytes)) {
      throw new Error(`semantic TBUF encoding is unresolved at block ${index}; refusing payload copy`);
    }
  }
}

function convert(input, template, output) {
  const source = fs.readFileSync(input);
  const target = fs.readFileSync(template);
  const sourceBlocks = blocks(source);
  const targetBlocks = blocks(target);
  assertByteIdenticalBlocks(sourceBlocks, targetBlocks);
  // Identity is deliberately the only permitted write. It is not a conversion.
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, target);
  return { output, sourceBlocks: sourceBlocks.length, templateBlocks: targetBlocks.length, status: 'identity-only', bytes: target.length };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error('Usage: node tools/convert-acts22-to-anims23.js <input.acts> <template.anims> <output.anims>');
    console.log(JSON.stringify(convert(process.argv[2], process.argv[3], process.argv[4]), null, 2));
  } catch (error) {
    console.error(`2K22-to-2K23 write refused: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { blocks, assertByteIdenticalBlocks, convert };
