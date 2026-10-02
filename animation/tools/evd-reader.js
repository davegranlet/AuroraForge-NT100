'use strict';

const HEADER_BYTES = 34;
const NAME_BYTES = 32;

function requireSpan(buffer, offset, bytes) {
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error('EVD span exceeds buffer bounds');
  }
}

function decodeName(nameBytes) {
  const terminator = nameBytes.indexOf(0);
  const raw = nameBytes.subarray(0, terminator === -1 ? nameBytes.length : terminator);
  for (const value of raw) {
    if (value < 0x20 || value > 0x7e) throw new Error('EVD internal name contains non-printable bytes');
  }
  const name = raw.toString('ascii').trimEnd();
  if (!name) throw new Error('EVD internal name is empty');
  return name;
}

/**
 * Reads the evidence-backed EVD envelope shared by the 2K20 Victory corpus.
 * The remainder is deliberately returned opaque until its event-record layout
 * has been independently decoded; this reader must never imply event semantics.
 */
function readEvd(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  requireSpan(buffer, 0, HEADER_BYTES);
  const motionId = buffer.readUInt16LE(0);
  const rawName = Buffer.from(buffer.subarray(2, 2 + NAME_BYTES));
  const internalName = decodeName(rawName);
  return {
    bytes: buffer.length,
    motionId,
    internalName,
    headerBytes: HEADER_BYTES,
    rawName,
    payloadOffset: HEADER_BYTES,
    payload: Buffer.from(buffer.subarray(HEADER_BYTES)),
  };
}

module.exports = { HEADER_BYTES, NAME_BYTES, readEvd };
