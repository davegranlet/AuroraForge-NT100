'use strict';

const fs = require('node:fs');
const MAGIC = 0x734c544d;
const MATERIAL_MAGIC = 0x214c544d;

function align4(value) { return (value + 3) & ~3; }

function cstring(table, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset >= table.length) throw new Error(`string offset ${offset} is outside the global table`);
  const end = table.indexOf(0, offset);
  if (end < 0) throw new Error(`string at ${offset} is not NUL-terminated`);
  return table.subarray(offset, end).toString('utf8');
}

const PROPERTY_TYPES = ['Bool', 'Int', 'Float', 'Vec2', 'Vec3', 'Vec4', 'String', 'Hash'];
function readMaterialBlock(buffer, start, materialName) {
  let offset = start;
  if (offset + 12 > buffer.length || buffer.readUInt32LE(offset) !== MATERIAL_MAGIC) throw new Error(`MTL! block for ${materialName} is invalid`);
  const blockVersion = buffer.readUInt32LE(offset + 4); const localLength = buffer.readUInt32LE(offset + 8); offset += 12;
  if (localLength > buffer.length - offset) throw new Error(`MTL! local string table for ${materialName} exceeds the file`);
  const local = buffer.subarray(offset, offset + localLength); offset = align4(offset + localLength);
  const localString = (at) => cstring(local, at);
  if (blockVersion !== 3 && blockVersion !== 4) return { name: materialName, blockVersion, shader: localString(0), properties: [], status: 'block-version-not-parsed' };
  if (offset + 20 > buffer.length) throw new Error(`MTL! header for ${materialName} is truncated`);
  offset += 2; const shaderOffset = buffer.readUInt16LE(offset); offset += 2;
  const alphaFlags = buffer.readInt16LE(offset); offset += 2;
  const standardLighting = buffer.readUInt8(offset++); const vertexShaderOpt = buffer.readUInt8(offset++); const reserved3 = buffer.readUInt8(offset++);
  const reserved4 = buffer.readInt16LE(offset) & 255; offset += 2; offset = align4(offset);
  let propCount = buffer.readUInt32LE(offset); let propsSize = buffer.readUInt32LE(offset + 4);
  // Some V6/V3 blocks carry an additional eight-byte zeroed prelude before
  // the property header. Accept it only when the shifted pair is plausible;
  // never blindly skip bytes on malformed input.
  if (propCount === 0 && offset + 16 <= buffer.length) {
    const shiftedCount = buffer.readUInt32LE(offset + 8); const shiftedSize = buffer.readUInt32LE(offset + 12);
    if (shiftedCount > 0 && shiftedCount <= 65536 && shiftedSize <= buffer.length - (offset + 16)) { offset += 8; propCount = shiftedCount; propsSize = shiftedSize; }
  }
  offset += 8;
  if (propCount > 65536) throw new Error(`MTL! property count for ${materialName} is implausible`);
  const descriptorBytes = propCount * 9; if (offset + descriptorBytes > buffer.length) throw new Error(`MTL! descriptors for ${materialName} are truncated`);
  const descriptorStart = offset; const names = []; const hashes = []; const types = [];
  for (let i = 0; i < propCount; i += 1) names.push(buffer.readUInt32LE(offset + i * 4)); offset += propCount * 4;
  for (let i = 0; i < propCount; i += 1) hashes.push(buffer.readUInt32LE(offset + i * 4)); offset += propCount * 4;
  for (let i = 0; i < propCount; i += 1) types.push(buffer.readUInt8(offset + i)); offset += propCount;
  const descriptorArea = Math.ceil((propCount * 9) / 16) * 16;
  let payloadBytes = 0; for (const type of types) payloadBytes += ({ 3: 8, 4: 12, 5: 16, 7: 8 }[type] || 0);
  const valuesStart = descriptorStart + descriptorArea + payloadBytes;
  let valueOffset = valuesStart; const properties = [];
  for (let i = 0; i < propCount; i += 1) {
    const type = types[i]; const property = { name: localString(names[i]), type: PROPERTY_TYPES[type] || `Unknown(${type})`, nameHash: hashes[i] };
    if (type === 0 || type === 1) property.value = buffer.readInt32LE(valueOffset), valueOffset += 4;
    else if (type === 2) property.value = buffer.readFloatLE(valueOffset), valueOffset += 4;
    else if (type === 6) { const stringOffset = buffer.readInt32LE(valueOffset); valueOffset += 4; property.value = localString(stringOffset); }
    else if (type === 3 || type === 4 || type === 5 || type === 7) {
      const relative = buffer.readInt32LE(valueOffset); valueOffset += 4;
      if (relative < 0 || relative >= propsSize) throw new Error(`MTL! property ${property.name} points outside the property section`);
      const payload = descriptorStart + relative;
      if (type === 7) property.value = `0x${buffer.readBigUInt64LE(payload).toString(16).padStart(16, '0')}`;
      else { const count = type - 1; property.value = Array.from({ length: count }, (_, index) => buffer.readFloatLE(payload + index * 4)); }
    }
    properties.push(property);
  }
  return { name: materialName, blockVersion, shader: localString(shaderOffset), template: localString(local.indexOf(0, localString(0).length + 1) + 1), flags: { alphaBlend: alphaFlags & 255, alphaTest: alphaFlags >> 8, standardLighting, vertexShaderOpt, reserved3, reserved4 }, properties, propsSize, endOffset: align4(descriptorStart + propsSize), status: 'parsed' };
}

function inspect(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length < 12) throw new Error('MTLS header is truncated');
  if (buffer.readUInt32LE(0) !== MAGIC) throw new Error('MTLS magic is invalid');
  const version = buffer.readUInt32LE(4);
  const tableLength = buffer.readInt32LE(8);
  if (tableLength < 0 || 12 + tableLength > buffer.length) throw new Error('MTLS global string table exceeds the file');
  const globalTable = buffer.subarray(12, 12 + tableLength);
  let offset = align4(12 + tableLength);
  if (version !== 6) {
    return { schema: 'aurora-forge-mtls/v1', version, globalTableBytes: tableLength, materialCount: null, names: [], status: 'version-not-parsed' };
  }
  if (offset + 4 > buffer.length) throw new Error('MTLS material count is truncated');
  const materialCount = buffer.readInt32LE(offset);
  offset += 4;
  if (materialCount < 0 || materialCount > 100000) throw new Error('MTLS material count is invalid');
  const tocHashes = [];
  for (let i = 0; i < materialCount; i += 1) {
    if (offset + 8 > buffer.length) throw new Error('MTLS TOC exceeds the file');
    tocHashes.push(`0x${buffer.readBigUInt64LE(offset).toString(16).toUpperCase().padStart(16, '0')}`);
    offset += 8;
  }
  const nameOffsets = [];
  for (let i = 0; i < materialCount; i += 1) {
    if (offset + 2 > buffer.length) throw new Error('MTLS name offsets exceed the file');
    nameOffsets.push(buffer.readUInt16LE(offset));
    offset += 2;
  }
  offset = align4(offset);
  const names = nameOffsets.map((value) => cstring(globalTable, value));
  const blockOffset = offset;
  const blockMagic = offset + 4 <= buffer.length ? `0x${buffer.readUInt32LE(offset).toString(16).toUpperCase().padStart(8, '0')}` : null;
  const materials = [];
  if (version === 6 && blockMagic === `0x${MATERIAL_MAGIC.toString(16).toUpperCase().padStart(8, '0')}`) {
    let cursor = blockOffset;
    for (let i = 0; i < materialCount; i += 1) {
      try { const material = readMaterialBlock(buffer, cursor, names[i]); materials.push(material); cursor = material.endOffset; }
      catch (error) { materials.push({ name: names[i], status: 'block-error', error: error.message }); break; }
    }
  }
  return {
    schema: 'aurora-forge-mtls/v1',
    version,
    globalTableBytes: tableLength,
    materialCount,
    tocHashes,
    names,
    blockOffset,
    blockMagic,
    blockMagicValid: blockMagic === `0x${MATERIAL_MAGIC.toString(16).toUpperCase().padStart(8, '0')}`,
    materials,
    status: materials.length === materialCount && materials.every((material) => material.status === 'parsed') ? 'parsed' : 'header-only',
  };
}

function readFile(file) { return inspect(fs.readFileSync(file)); }

module.exports = { MAGIC, MATERIAL_MAGIC, inspect, readFile, cstring, align4 };
