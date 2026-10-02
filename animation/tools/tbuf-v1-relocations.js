'use strict';

// Read-only model of WWE2K22 FUN_1405c15c0. It resolves serialized
// self-relative pointers without mutating the buffer or emulating the game.
function inspectRelocations(buffer, offset = 0, end = buffer.length) {
  if (!Buffer.isBuffer(buffer)) throw new Error('TBUF relocations require a Buffer');
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(end)
    || offset < 0 || end > buffer.length || offset + 24 > end) throw new Error('TBUF header exceeds bounds');
  if (buffer.toString('ascii', offset, offset + 4) !== 'TBUF'
    || buffer.readUInt32LE(offset + 4) !== 1
    || buffer.toString('ascii', offset + 16, offset + 20) !== 'ANIM'
    || buffer.readUInt32LE(offset + 20) !== 10) throw new Error('Unsupported TBUF/ANIM generation');
  const declaredDataBytes = buffer.readUInt32LE(offset + 8);
  const relocationCount = buffer.readUInt32LE(offset + 12);
  const dataStart = offset + 16;
  const tableOffset = dataStart + declaredDataBytes;
  if (declaredDataBytes < 8 || tableOffset + 4 > end) throw new Error('Relocation table exceeds bounds');
  const entryWidth = buffer.readUInt32LE(tableOffset);
  if (![1, 2, 4].includes(entryWidth)) throw new Error('Unsupported relocation entry width');
  const tableEnd = tableOffset + 4 + entryWidth * relocationCount;
  if (tableEnd > end) throw new Error('Relocation entries exceed bounds');
  const entries = [];
  const seen = new Set();
  for (let index = 0; index < relocationCount; index += 1) {
    const relativeFieldOffset = buffer.readUIntLE(tableOffset + 4 + index * entryWidth, entryWidth);
    const fieldOffset = dataStart + relativeFieldOffset;
    if (fieldOffset + 8 > tableOffset) throw new Error('Relocation pointer field exceeds data bounds');
    if (seen.has(fieldOffset)) throw new Error('Duplicate relocation pointer field');
    seen.add(fieldOffset);
    const displacement = buffer.readBigInt64LE(fieldOffset);
    const target = BigInt(fieldOffset) + displacement;
    if (displacement !== 0n && (target < BigInt(dataStart) || target >= BigInt(tableOffset))) {
      throw new Error('Relocation target exceeds data bounds');
    }
    entries.push({
      index, relativeFieldOffset, fieldOffset,
      targetOffset: displacement === 0n ? null : Number(target),
      isNull: displacement === 0n,
    });
  }
  return {
    offset, declaredDataBytes, dataStart, tableOffset, entryWidth, relocationCount,
    tableEnd, serializedBytes: tableEnd - offset, bytesAfterTable: end - tableEnd,
    entries,
    limits: ['Targets are validated addresses only; this does not establish transform or descriptor semantics.'],
  };
}

module.exports = { inspectRelocations };
