'use strict';

// Generic lossless ULEB128 token encoder retained for format experiments.
// It is not a decoder or encoder for the real fixed-width Group90 section in
// .clips files: the 2K25 parser exposes that section as opaque 8-byte entries
// and no token schema has been independently established.

function encodeUleb128(value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('ULEB value must be a non-negative safe integer or BigInt');
    value = BigInt(value);
  }
  if (typeof value !== 'bigint' || value < 0n) throw new Error('ULEB value must be a non-negative safe integer or BigInt');
  const bytes = [];
  do {
    let byte = Number(value & 0x7fn);
    value >>= 7n;
    if (value !== 0n) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0n);
  return Buffer.from(bytes);
}

function encodeTokens(tokens) {
  if (!Array.isArray(tokens)) throw new Error('tokens must be an array');
  return Buffer.concat(tokens.map(encodeUleb128));
}

function decodeTokens(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('buffer must be a Buffer');
  const tokens = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    let value = 0n; let shift = 0n; const start = cursor;
    for (let i = 0; cursor < buffer.length && i < 5000; i += 1) {
      const byte = buffer[cursor++];
      value |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) { tokens.push({ value, offset: start, bytes: cursor - start }); break; }
      shift += 7n;
      if (cursor === buffer.length) throw new Error('truncated ULEB128 token');
    }
  }
  return tokens;
}

module.exports = { encodeUleb128, encodeTokens, decodeTokens };
