'use strict';

const fs = require('node:fs');
const { fnv1a64Lower } = require('./tdb');

const DDS_MAGIC = 0x20534444;
const DDSD_MIPMAPCOUNT = 0x20000;
const DDPF_FOURCC = 0x4;
const DXGI_NAMES = new Map([
  [71, 'BC1_UNORM'], [72, 'BC1_UNORM_SRGB'], [73, 'BC1_TYPELESS'],
  [77, 'BC3_UNORM'], [78, 'BC3_UNORM_SRGB'], [79, 'BC3_TYPELESS'],
  [80, 'BC4_UNORM'], [81, 'BC4_SNORM'], [82, 'BC4_TYPELESS'],
  [83, 'BC5_UNORM'], [84, 'BC5_SNORM'], [85, 'BC5_TYPELESS'],
  [98, 'BC7_UNORM'], [99, 'BC7_UNORM_SRGB'], [100, 'BC7_TYPELESS'],
]);

function fourCC(buffer, offset) {
  const value = buffer.subarray(offset, offset + 4);
  if (value[0] === 0 && value[1] === 0 && value[2] === 0 && value[3] === 0) return '';
  return value.toString('latin1');
}

function inspect(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length < 128) throw new Error('DDS header is truncated');
  if (buffer.readUInt32LE(0) !== DDS_MAGIC) throw new Error('DDS magic is invalid');
  if (buffer.readUInt32LE(4) !== 124) throw new Error('DDS header size is invalid');
  const height = buffer.readUInt32LE(12);
  const width = buffer.readUInt32LE(16);
  const depth = buffer.readUInt32LE(24);
  const mipCount = buffer.readUInt32LE(28) || 1;
  const pixelFlags = buffer.readUInt32LE(80);
  const cc = fourCC(buffer, 84);
  const rgbBits = buffer.readUInt32LE(88);
  let dxgiFormat = null;
  let dxgiName = null;
  if (cc === 'DX10' && buffer.length >= 148) {
    dxgiFormat = buffer.readUInt32LE(128);
    dxgiName = DXGI_NAMES.get(dxgiFormat) || null;
  }
  return {
    schema: 'aurora-forge-dds/v1',
    bytes: buffer.length,
    width,
    height,
    depth: depth || 1,
    mipCount,
    fourCC: cc,
    dxgiFormat,
    dxgiName,
    rgbBits,
    hasFourCC: Boolean(pixelFlags & DDPF_FOURCC),
    mipmapsDeclared: Boolean(buffer.readUInt32LE(8) & DDSD_MIPMAPCOUNT),
    dataOffset: cc === 'DX10' ? 148 : 128,
  };
}

function readFile(file) {
  return inspect(fs.readFileSync(file));
}

function textureGuid(text) {
  return `0x${fnv1a64Lower(text).toString(16).toUpperCase().padStart(16, '0')}`;
}

module.exports = { DDS_MAGIC, DXGI_NAMES, inspect, readFile, textureGuid, fnv1a64Lower };
