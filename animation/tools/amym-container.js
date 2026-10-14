'use strict';

// 2K22 AMYM directory, checked against native FUN_141f00dd0 and Victory
// 6100/6101/6102. Offset 4 is a group count, not a format version.
// Entry contents remain opaque; rebuilding this envelope is not conversion.
function span(buffer, offset, size) {
  if (!Buffer.isBuffer(buffer) || !Number.isSafeInteger(offset) || !Number.isSafeInteger(size)
      || offset < 0 || size < 0 || offset + size > buffer.length) throw new Error('AMYM span exceeds buffer bounds');
}

function parse(buffer) {
  span(buffer, 0, 16);
  if (buffer.toString('ascii', 0, 4) !== 'AMYM') throw new Error('Not an AMYM container');
  const groupCount = buffer.readUInt32LE(4);
  const entryCount = buffer.readUInt32LE(8);
  if (groupCount < 1 || groupCount > 4096 || entryCount < 1 || entryCount > 65536) throw new Error('AMYM count exceeds supported bounds');
  const sizesOffset = 16 + groupCount * 16;
  const idsOffset = sizesOffset + entryCount * 4;
  const payloadOffset = idsOffset + (entryCount + (entryCount & 1)) * 2;
  span(buffer, 0, payloadOffset);
  const groups = Array.from({ length: groupCount }, (_, index) => {
    const offset = 16 + index * 16;
    const firstEntry = buffer.readUInt32LE(offset + 8);
    const count = buffer.readUInt32LE(offset + 12);
    if (firstEntry + count > entryCount) throw new Error('AMYM group exceeds entry directory');
    return { index, firstEntry, count, raw: Buffer.from(buffer.subarray(offset, offset + 16)) };
  });
  let cursor = payloadOffset;
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const bytes = buffer.readUInt32LE(sizesOffset + index * 4);
    if (bytes === 0) throw new Error('AMYM empty entry is unsupported');
    span(buffer, cursor, bytes);
    const entry = { index, id: buffer.readUInt16LE(idsOffset + index * 2), offset: cursor, bytes,
      payload: Buffer.from(buffer.subarray(cursor, cursor + bytes)) };
    cursor += bytes;
    return entry;
  });
  if (cursor !== buffer.length) throw new Error('AMYM trailing bytes outside entry directory');
  return { groupCount, entryCount, payloadOffset, groups, entries,
    rawHeader: Buffer.from(buffer.subarray(0, payloadOffset)) };
}

function build(container, payloads = container.entries.map(entry => entry.payload)) {
  if (!Array.isArray(payloads) || payloads.length !== container.entryCount) throw new Error('AMYM replacement entry count mismatch');
  const header = Buffer.from(container.rawHeader);
  const sizesOffset = 16 + container.groupCount * 16;
  for (let i = 0; i < payloads.length; i++) {
    if (!Buffer.isBuffer(payloads[i]) || !payloads[i].length || payloads[i].length > 0xffffffff) throw new Error('Invalid AMYM replacement entry');
    header.writeUInt32LE(payloads[i].length, sizesOffset + i * 4);
  }
  const output = Buffer.concat([header, ...payloads]);
  parse(output);
  return output;
}

module.exports = { parse, build };
