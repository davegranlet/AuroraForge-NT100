'use strict';

function span(buffer, offset, bytes) {
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) throw new Error('YANM20 span exceeds buffer bounds');
}

function readStream(buffer, base, relOffset, count) {
  if (!Number.isInteger(count) || count < 1 || count > 0x1000000) throw new Error('invalid YANM20 stream count');
  const start = base + relOffset;
  span(buffer, start, count * 8);
  let frame = 0;
  return Array.from({ length: count }, (_, index) => {
    const offset = start + index * 8;
    const delta = buffer.readUInt16BE(offset + 6);
    frame += delta;
    return { frame, packed: [buffer.readInt16BE(offset), buffer.readInt16BE(offset + 2), buffer.readInt16BE(offset + 4)], delta };
  });
}

function decodeSection(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  span(buffer, 0, 16);
  if (buffer.toString('ascii', 0, 4) !== 'YANM') throw new Error('Not a YANM20 section');
  const declaredSize = buffer.readUInt32BE(4);
  span(buffer, 0, declaredSize + 8);
  const count = buffer.readUInt16BE(10);
  if (count < 1) throw new Error('Invalid YANM20 record count');
  const base = 8;
  const records = [];
  let cursor = 16;
  for (let index = 0; index < count; index++) {
    const offset = cursor;
    span(buffer, offset, 4);
    const type = buffer.readUInt16BE(offset);
    const headerSize = buffer.readUInt16BE(offset + 2);
    if (headerSize < 8 || headerSize > 256) throw new Error('invalid YANM20 record header size');
    span(buffer, offset, headerSize);
    const record = { index, offset, type, headerSize, hash32: buffer.readUInt32BE(offset + 4), rawHeader: Buffer.from(buffer.subarray(offset, offset + headerSize)) };
    if (type === 0x2100) {
      record.streamAOffset = buffer.readUInt32BE(offset + 8); record.streamACount = buffer.readUInt32BE(offset + 12);
      record.streamBOffset = buffer.readUInt32BE(offset + 16); record.streamBCount = buffer.readUInt32BE(offset + 20);
      record.floats = Array.from({ length: 4 }, (_, i) => buffer.readFloatBE(offset + 24 + i * 4));
      record.streamA = readStream(buffer, base, record.streamAOffset, record.streamACount);
      record.streamB = readStream(buffer, base, record.streamBOffset, record.streamBCount);
    }
    records.push(record);
    cursor += headerSize;
  }
  return { bytes: declaredSize + 8, headerU16: buffer.readUInt16BE(8), headerU32: buffer.readUInt32BE(12), records };
}

module.exports = { decodeSection, readStream };
