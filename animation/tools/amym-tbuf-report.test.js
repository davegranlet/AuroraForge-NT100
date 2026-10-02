'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findTbufBlocks, readWrapper } = require('./amym-tbuf-report');

function block(bytes, channels) {
  const buffer = Buffer.alloc(24 + Math.max(0, bytes - 8));
  buffer.write('TBUF');
  buffer.writeUInt32LE(1, 4);
  buffer.writeUInt32LE(bytes, 8);
  buffer.writeUInt32LE(channels, 12);
  buffer.write('ANIM', 16);
  buffer.writeUInt32LE(10, 20);
  return buffer;
}

test('findTbufBlocks accepts only validated TBUF ANIM headers', () => {
  const buffer = Buffer.concat([Buffer.alloc(8), block(464, 3), Buffer.alloc(12), block(1024, 6), Buffer.from('TBUF')]);
  assert.deepEqual(findTbufBlocks(buffer).map(block => ({
    offset: block.offset,
    tbufVersion: block.tbufVersion,
    declaredBufferBytes: block.declaredBufferBytes,
    declaredNativeDataBytes: block.declaredNativeDataBytes,
    relocationCount: block.relocationCount,
    channelCount: block.channelCount,
    animVersion: block.animVersion,
    nextOffset: block.nextOffset,
    spanBytes: block.spanBytes,
    tableOffset: block.tableOffset,
    animDataBytes: block.animDataBytes,
  })), [
    { offset: 8, tbufVersion: 1, declaredBufferBytes: 464, declaredNativeDataBytes: 464, relocationCount: 3, channelCount: 3, animVersion: 10, nextOffset: 500, spanBytes: 492, tableOffset: 488, animDataBytes: 456 },
    { offset: 500, tbufVersion: 1, declaredBufferBytes: 1024, declaredNativeDataBytes: 1024, relocationCount: 6, channelCount: 6, animVersion: 10, nextOffset: 1544, spanBytes: 1044, tableOffset: 1540, animDataBytes: 1016 },
  ]);
});

test('readWrapper supports AMYM and MINA container signatures', () => {
  for (const magic of ['AMYM', 'MINA']) {
    const buffer = Buffer.alloc(12);
    buffer.write(magic);
    buffer.writeUInt32LE(1, 4);
    buffer.writeUInt32LE(16, 8);
    assert.deepEqual(readWrapper(buffer), { magic, [magic === 'AMYM' ? 'groupCount' : 'version']: 1, declaredEntries: 16 });
  }
});

test('findTbufBlocks accepts the WWE 2K24 TBUF v2 / ANIM v11 generation', () => {
  const block = Buffer.alloc(24);
  block.write('TBUF'); block.writeUInt32LE(2, 4); block.writeUInt32LE(464, 8);
  block.writeUInt32LE(6, 12); block.write('ANIM', 16); block.writeUInt32LE(11, 20);
  assert.equal(findTbufBlocks(Buffer.concat([Buffer.from('MINA'), block])).length, 1);
});
