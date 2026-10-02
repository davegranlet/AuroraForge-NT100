'use strict';

const FOP_MAGIC = '0FOP';
const PREFIX_BYTES = 0x20;
const INNER_HEADER_BYTES = 0x44;
const ENTRY_BYTES = 0x20;

function span(buffer, offset, bytes) {
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error('0FOP span exceeds buffer bounds');
  }
}

function fixedAscii(buffer, offset, bytes) {
  span(buffer, offset, bytes);
  const raw = buffer.subarray(offset, offset + bytes);
  const end = raw.indexOf(0);
  const text = raw.subarray(0, end === -1 ? bytes : end).toString('ascii').trimEnd();
  if (!text || /[^\x20-\x7e]/.test(text)) throw new Error('invalid 0FOP internal name');
  return text;
}

/** Read the proven 2K19 0FOP envelope and its fixed-size event index. */
function readFop19(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  span(buffer, 0, INNER_HEADER_BYTES);
  if (buffer.toString('ascii', 0, 4) !== FOP_MAGIC) throw new Error('Not a 0FOP event payload');
  const entryCount = buffer.readUInt32BE(0x14);
  if (entryCount < 1 || entryCount > 0x10000) throw new Error('invalid 0FOP event entry count');
  const entriesOffset = PREFIX_BYTES + INNER_HEADER_BYTES;
  span(buffer, entriesOffset, entryCount * ENTRY_BYTES);
  const entries = [];
  for (let index = 0; index < entryCount; index++) {
    const offset = entriesOffset + index * ENTRY_BYTES;
    entries.push({
      index,
      offset,
      raw: Buffer.from(buffer.subarray(offset, offset + ENTRY_BYTES)),
      wordsBE: Array.from({ length: 8 }, (_, word) => buffer.readUInt32BE(offset + word * 4)),
      payloadOffsetBE: buffer.readUInt32BE(offset + 4),
      eventIdBE: buffer.readUInt32BE(offset + 8),
    });
  }
  const innerOffset = PREFIX_BYTES;
  return {
    bytes: buffer.length,
    prefixBytes: PREFIX_BYTES,
    motionId: buffer.readUInt16BE(innerOffset),
    internalName: fixedAscii(buffer, innerOffset + 2, 32),
    entryCount,
    entriesOffset,
    entries,
    trailingBytes: Buffer.from(buffer.subarray(entriesOffset + entryCount * ENTRY_BYTES)),
  };
}

module.exports = { ENTRY_BYTES, FOP_MAGIC, INNER_HEADER_BYTES, PREFIX_BYTES, readFop19 };
