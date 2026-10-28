'use strict';

function decodeAt(buffer, offset) {
  if (!Buffer.isBuffer(buffer)) throw new Error('buffer must be a Buffer');
  if (!Number.isInteger(offset) || offset < 0 || offset >= buffer.length) throw new Error('offset is outside buffer');
  let value = 0n;
  let shift = 0n;
  // This corpus contains valid Group90 tokens longer than ten bytes.  Bound
  // reads by the enclosing payload and a deliberately generous safety limit,
  // rather than applying the JavaScript-integer convention to BigInt ULEB.
  const limit = Math.min(buffer.length - offset, 5000);
  for (let index = 0; index < limit; index++) {
    const byte = buffer[offset + index];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, bytes: index + 1 };
    shift += 7n;
  }
  if (limit < buffer.length - offset) throw new Error('ULEB128 token exceeds 5000 bytes');
  throw new Error('truncated ULEB128 token');
}

function tokensFrom(buffer, offset, count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('count must be positive');
  const tokens = []; let cursor = offset;
  for (let index = 0; index < count; index++) {
    const token = decodeAt(buffer, cursor);
    tokens.push({ offset: cursor, value: token.value, bytes: token.bytes });
    cursor += token.bytes;
  }
  return tokens;
}

module.exports = { decodeAt, tokensFrom };
