'use strict';

const { ENTRY_BYTES, PREFIX_BYTES, readFop19 } = require('./fop19-reader');

const INNER_TABLE_OFFSET = 0x44;
const TARGET_ENTRY_MARKER = Buffer.from([0x01, 0x00, 0xff, 0x00]);

function requireSpan(buffer, offset, bytes) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) throw new Error('EVD table span exceeds buffer bounds');
}

function populated(entries) {
  return entries.filter((entry) => entry.payloadOffsetBE !== 0 || entry.eventIdBE !== 0);
}

/**
 * Validates the evidence-backed portion of the 2K19 0FOP -> 2K20 EVD event
 * index conversion. It intentionally does not interpret or write event bodies.
 */
function compareFop19Evd20Index(fopBuffer, evdBuffer) {
  const fop = readFop19(fopBuffer);
  if (!Buffer.isBuffer(evdBuffer)) evdBuffer = Buffer.from(evdBuffer);
  const sourceEntries = populated(fop.entries);
  const comparisons = sourceEntries.map((source) => {
    const relative = INNER_TABLE_OFFSET + source.index * ENTRY_BYTES;
    requireSpan(evdBuffer, relative, ENTRY_BYTES);
    const marker = evdBuffer.subarray(relative, relative + 4);
    const sourceEventRaw = source.raw.subarray(8, 12);
    const targetEventRaw = evdBuffer.subarray(relative + 8, relative + 12);
    const targetPointer = evdBuffer.readUInt32LE(relative + 4);
    const targetEventId = evdBuffer.readUInt32LE(relative + 8);
    const expectedPointer = source.payloadOffsetBE - 0x60 - source.index * ENTRY_BYTES;
    return {
      index: source.index,
      sourcePointer: source.payloadOffsetBE,
      targetPointer,
      expectedPointer,
      sourceEventId: source.eventIdBE,
      targetEventId,
      markerMatches: marker.equals(TARGET_ENTRY_MARKER),
      pointerMatches: targetPointer === expectedPointer,
      eventIdEncoding: targetEventId === source.eventIdBE
        ? 'little-endian'
        : sourceEventRaw.equals(targetEventRaw)
          ? 'raw-preserved'
          : 'unrecognized',
      tailDifferenceOffsets: Array.from({ length: 16 }, (_, index) => index)
        .filter((index) => source.raw[16 + index] !== evdBuffer[relative + 16 + index])
        .map((index) => index + 16),
    };
  });
  return {
    fopMotionId: fop.motionId,
    sourceEntrySlots: fop.entryCount,
    populatedEntries: sourceEntries.length,
    comparisons,
    valid: comparisons.every((entry) => entry.markerMatches && entry.pointerMatches && entry.eventIdEncoding !== 'unrecognized'),
    sourcePrefixBytes: PREFIX_BYTES,
  };
}

module.exports = { INNER_TABLE_OFFSET, TARGET_ENTRY_MARKER, compareFop19Evd20Index };
