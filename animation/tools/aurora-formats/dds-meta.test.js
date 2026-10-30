'use strict';

const test = require('node:test');
const assert = require('node:assert');
const dds = require('./dds-meta');

function fixture(dxgi = 98) {
  const buffer = Buffer.alloc(148);
  buffer.writeUInt32LE(0x20534444, 0);
  buffer.writeUInt32LE(124, 4);
  buffer.writeUInt32LE(0x1007, 8);
  buffer.writeUInt32LE(1024, 12);
  buffer.writeUInt32LE(2048, 16);
  buffer.writeUInt32LE(0, 20);
  buffer.writeUInt32LE(1, 24);
  buffer.writeUInt32LE(11, 28);
  buffer.writeUInt32LE(32, 76);
  buffer.writeUInt32LE(0x4, 80);
  buffer.write('DX10', 84, 'latin1');
  buffer.writeUInt32LE(dxgi, 128);
  buffer.writeUInt32LE(3, 132);
  buffer.writeUInt32LE(1, 136);
  return buffer;
}

test('reads DDS dimensions and DX10 format', () => {
  const result = dds.inspect(fixture(98));
  assert.strictEqual(result.width, 2048);
  assert.strictEqual(result.height, 1024);
  assert.strictEqual(result.mipCount, 11);
  assert.strictEqual(result.dxgiName, 'BC7_UNORM');
  assert.strictEqual(result.dataOffset, 148);
});

test('rejects a bad DDS magic', () => {
  const buffer = fixture();
  buffer.writeUInt32LE(0, 0);
  assert.throws(() => dds.inspect(buffer), /magic/);
});

test('texture GUID is case-insensitive FNV-1a 64', () => {
  assert.strictEqual(dds.textureGuid('Textures/Hair.DDS'), dds.textureGuid('textures/hair.dds'));
  assert.match(dds.textureGuid('textures/hair.dds'), /^0x[0-9A-F]{16}$/);
});
