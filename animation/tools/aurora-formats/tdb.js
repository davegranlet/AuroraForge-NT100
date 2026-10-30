'use strict';

const fs = require('node:fs');

const MAGIC = 0x42445f54;
const VERSION_V5 = 5;
const VERSION_V6 = 6;
const ENTRY_V5 = 48;
const ENTRY_V6 = 56;

const BC_FORMATS = new Map([
  [2144980375, 'BC1'],
  [2665659744, 'BC3'],
  [1244191115, 'BC4'],
  [3091421832, 'BC5'],
  [1501047423, 'BC7'],
]);

function fnv1a64Lower(text) {
  let value = 14695981039346656037n;
  for (const char of String(text)) {
    const code = char.toLowerCase().charCodeAt(0);
    value ^= BigInt(code & 0xff);
    value = BigInt.asUintN(64, value * 1099511628211n);
  }
  return value;
}

function hex64(value) {
  return `0x${BigInt(value).toString(16).toUpperCase().padStart(16, '0')}`;
}

function read(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length < 16) throw new Error('TDB header is truncated');
  if (buffer.readUInt32LE(0) !== MAGIC) throw new Error('TDB magic is invalid');
  const version = buffer.readUInt32LE(4);
  const count = buffer.readUInt32LE(8);
  const entrySize = buffer.readUInt32LE(12);
  if (version !== VERSION_V5 && version !== VERSION_V6) throw new Error(`TDB version ${version} is unsupported`);
  if (entrySize !== (version === VERSION_V6 ? ENTRY_V6 : ENTRY_V5)) {
    throw new Error(`TDB entry size ${entrySize} does not match version ${version}`);
  }
  if (16 + count * entrySize > buffer.length) throw new Error('TDB entries exceed the file');
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const at = 16 + index * entrySize;
    const entry = {
      index,
      assetGuid: hex64(buffer.readBigUInt64LE(at)),
      texMagic: buffer.readUInt16LE(at + 8),
      height: buffer.readUInt16LE(at + 10),
      width: buffer.readUInt32LE(at + 12),
      texGuid: hex64(buffer.readBigUInt64LE(at + 16)),
      reservedGuid: hex64(buffer.readBigUInt64LE(at + 24)),
      decompressedSize: buffer.readUInt32LE(at + 32),
      bcFormatHash: `0x${buffer.readUInt32LE(at + 36).toString(16).toUpperCase().padStart(8, '0')}`,
      bcFormat: BC_FORMATS.get(buffer.readUInt32LE(at + 36)) || 'unknown',
      colorSpace: buffer.readUInt8(at + 40),
      colorSpaceName: buffer.readUInt8(at + 40) === 5 ? 'sRGB' : 'Linear',
      mipCount: buffer.readUInt8(at + 41),
      compressionLevel: buffer.readUInt32LE(at + 44),
      tailHash: version >= VERSION_V6 ? hex64(buffer.readBigUInt64LE(at + 48)) : null,
    };
    entries.push(entry);
  }
  return { schema: 'aurora-forge-tdb/v1', version, entrySize, count, entries };
}

function inspect(buffer) {
  const tdb = read(buffer);
  return {
    schema: tdb.schema,
    version: tdb.version,
    entrySize: tdb.entrySize,
    count: tdb.count,
    entries: tdb.entries.slice(0, 10),
  };
}

function write(tdb) {
  if (!tdb || !Array.isArray(tdb.entries)) throw new Error('TDB entries are required');
  const version = tdb.version === VERSION_V5 ? VERSION_V5 : VERSION_V6;
  const entrySize = version === VERSION_V6 ? ENTRY_V6 : ENTRY_V5;
  const entries = [...tdb.entries].sort((a, b) => {
    const left = BigInt(a.assetGuid);
    const right = BigInt(b.assetGuid);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const out = Buffer.alloc(16 + entries.length * entrySize);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt32LE(version, 4);
  out.writeUInt32LE(entries.length, 8);
  out.writeUInt32LE(entrySize, 12);
  entries.forEach((entry, index) => {
    const at = 16 + index * entrySize;
    out.writeBigUInt64LE(BigInt(entry.assetGuid), at);
    out.writeUInt16LE(entry.texMagic ?? 0, at + 8);
    out.writeUInt16LE(entry.height ?? 0, at + 10);
    out.writeUInt32LE(entry.width ?? 0, at + 12);
    out.writeBigUInt64LE(BigInt(entry.texGuid || 0), at + 16);
    out.writeBigUInt64LE(BigInt(entry.reservedGuid || 0), at + 24);
    out.writeUInt32LE(entry.decompressedSize ?? 0, at + 32);
    out.writeUInt32LE(typeof entry.bcFormatHash === 'string' ? Number.parseInt(entry.bcFormatHash, 16) : (entry.bcFormatHash ?? 0), at + 36);
    out.writeUInt8(entry.colorSpace ?? 4, at + 40);
    out.writeUInt8(entry.mipCount ?? 1, at + 41);
    out.writeUInt16LE(0, at + 42);
    out.writeUInt32LE(entry.compressionLevel ?? 0, at + 44);
    if (version === VERSION_V6) out.writeBigUInt64LE(BigInt(entry.tailHash || 0), at + 48);
  });
  return out;
}

function readFile(file) {
  return read(fs.readFileSync(file));
}

function writeFile(tdb, file) {
  fs.writeFileSync(file, write(tdb), { flag: 'wx' });
  return { file, bytes: 16 + tdb.entries.length * (tdb.version === VERSION_V5 ? ENTRY_V5 : ENTRY_V6) };
}

function merge(base, additions) {
  const map = new Map(base.entries.map((entry) => [String(entry.assetGuid).toLowerCase(), entry]));
  for (const entry of additions) map.set(String(entry.assetGuid).toLowerCase(), entry);
  return { ...base, entries: [...map.values()] };
}

module.exports = {
  MAGIC,
  VERSION_V5,
  VERSION_V6,
  ENTRY_V5,
  ENTRY_V6,
  BC_FORMATS,
  fnv1a64Lower,
  read,
  inspect,
  write,
  readFile,
  writeFile,
  merge,
};
