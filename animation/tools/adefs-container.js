'use strict';

// The 2K25 per-animation and ratanim .adefs files use this small wrapper
// around a zlib payload.  This module intentionally owns only the envelope;
// the decoded ADefs object graph remains Research until its schema is mapped.
const zlib = require('node:zlib');
const HEADER_BYTES = 24;

function decode(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (buffer.length < HEADER_BYTES) throw new Error('ADefs container is truncated');
  if (buffer.toString('ascii', 0, 4) !== '_rev') throw new Error('ADefs container magic is invalid');
  const version = buffer.readUInt32LE(4);
  if (version !== 6) throw new Error(`Unsupported ADefs container version ${version}`);
  if (buffer.toString('ascii', 8, 12) !== 'czis' || buffer.toString('ascii', 16, 20) !== 'uzis') throw new Error('ADefs container size tags are invalid');
  const compressedBytes = buffer.readUInt32LE(12);
  const expandedBytes = buffer.readUInt32LE(20);
  if (compressedBytes !== buffer.length - HEADER_BYTES) throw new Error('ADefs compressed size does not match container length');
  const payload = zlib.inflateSync(buffer.subarray(HEADER_BYTES));
  if (payload.length !== expandedBytes) throw new Error('ADefs expanded size does not match payload');
  return { version, compressedBytes, expandedBytes, payload };
}

function encode(payload) {
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload);
  const compressed = zlib.deflateSync(payload);
  const out = Buffer.alloc(HEADER_BYTES + compressed.length);
  out.write('_rev', 0, 'ascii'); out.writeUInt32LE(6, 4);
  out.write('czis', 8, 'ascii'); out.writeUInt32LE(compressed.length, 12);
  out.write('uzis', 16, 'ascii'); out.writeUInt32LE(payload.length, 20);
  compressed.copy(out, HEADER_BYTES);
  return out;
}

module.exports = { HEADER_BYTES, decode, encode };
