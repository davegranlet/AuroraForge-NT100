'use strict';

const TBUF_HEADER_BYTES = 16;
const ANIM_HEADER_BYTES = 8;
const HEADER_BYTES = TBUF_HEADER_BYTES + ANIM_HEADER_BYTES;

function span(buffer, offset, bytes) {
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) throw new Error('TBUF v1 span exceeds buffer bounds');
}

const SUPPORTED_TBUF_VERSIONS = new Set([1, 2]);
const SUPPORTED_ANIM_VERSIONS = new Set([10, 11, 16]);
const ANIM_VERSION_10 = 10;
const ANIM_VERSION_11 = 11;
const ANIM_VERSION_16 = 16;

function animVersionLabel(version) {
  if (version === ANIM_VERSION_10) return 'ANIM v10 (2K22/2K23)';
  if (version === ANIM_VERSION_11) return 'ANIM v11 (2K24)';
  if (version === ANIM_VERSION_16) return 'ANIM v16 (2K25/2K26)';
  return `ANIM v${version}`;
}

function decodeAt(buffer, offset = 0) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  span(buffer, offset, HEADER_BYTES);
  if (buffer.toString('ascii', offset, offset + 4) !== 'TBUF') throw new Error('Not a TBUF block');
  const tbufVersion = buffer.readUInt32LE(offset + 4);
  const declaredBufferBytes = buffer.readUInt32LE(offset + 8);
  const relocationCount = buffer.readUInt32LE(offset + 12);
  const animMagic = buffer.toString('ascii', offset + 16, offset + 20);
  const animVersion = buffer.readUInt32LE(offset + 20);
  if (!SUPPORTED_TBUF_VERSIONS.has(tbufVersion) || animMagic !== 'ANIM' || !SUPPORTED_ANIM_VERSIONS.has(animVersion)) {
    throw new Error(`Unsupported TBUF/ANIM generation: TBUF v${tbufVersion}, ${animMagic} v${animVersion}`);
  }
  if (declaredBufferBytes < ANIM_HEADER_BYTES) throw new Error('TBUF declared native data is smaller than the ANIM header');
  const nativeDataOffset = offset + TBUF_HEADER_BYTES;
  const nativeDataEnd = nativeDataOffset + declaredBufferBytes;
  span(buffer, nativeDataOffset, declaredBufferBytes);
  const animDataOffset = offset + HEADER_BYTES;
  const animDataBytes = declaredBufferBytes - ANIM_HEADER_BYTES;
  return {
    offset,
    tbufVersion,
    declaredBufferBytes,
    declaredNativeDataBytes: declaredBufferBytes,
    relocationCount,
    channelCount: relocationCount,
    animMagic,
    animVersion,
    nativeDataOffset,
    nativeDataEnd,
    tableOffset: nativeDataEnd,
    animDataOffset,
    animDataBytes,
    payloadOffset: animDataOffset,
    payload: Buffer.from(buffer.subarray(animDataOffset, nativeDataEnd)),
    nativeData: Buffer.from(buffer.subarray(nativeDataOffset, nativeDataEnd)),
  };
}

function encode(payload, relocationCount, animVersion = ANIM_VERSION_10, tbufVersion = 1) {
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload);
  if (!Number.isInteger(relocationCount) || relocationCount < 1 || relocationCount > 0xFFFFFFFF) throw new Error('relocationCount must be a positive unsigned 32-bit integer');
  if (!SUPPORTED_ANIM_VERSIONS.has(animVersion)) throw new Error(`Unsupported ANIM version ${animVersion}; supported: ${[...SUPPORTED_ANIM_VERSIONS].join(', ')}`);
  if (!SUPPORTED_TBUF_VERSIONS.has(tbufVersion)) throw new Error(`Unsupported TBUF version ${tbufVersion}; supported: ${[...SUPPORTED_TBUF_VERSIONS].join(', ')}`);
  const declaredBufferBytes = ANIM_HEADER_BYTES + payload.length;
  const out = Buffer.alloc(HEADER_BYTES + payload.length);
  out.write('TBUF', 0, 'ascii'); out.writeUInt32LE(tbufVersion, 4); out.writeUInt32LE(declaredBufferBytes, 8);
  out.writeUInt32LE(relocationCount, 12); out.write('ANIM', 16, 'ascii'); out.writeUInt32LE(animVersion, 20);
  payload.copy(out, HEADER_BYTES);
  return out;
}

// Reference-preserving writer: permits only a same-sized replacement so the
// surrounding AMYM/MINA wrapper offsets stay valid until its directory format
// is fully decoded.
function replacePayload(reference, offset, payload) {
  const decoded = decodeAt(reference, offset);
  if (!Buffer.isBuffer(payload)) payload = Buffer.from(payload);
  if (payload.length !== decoded.animDataBytes) throw new Error(`replacement payload is ${payload.length} bytes; expected ${decoded.animDataBytes}`);
  const out = Buffer.from(reference);
  payload.copy(out, decoded.animDataOffset);
  return out;
}

module.exports = { TBUF_HEADER_BYTES, ANIM_HEADER_BYTES, HEADER_BYTES, SUPPORTED_TBUF_VERSIONS, SUPPORTED_ANIM_VERSIONS, ANIM_VERSION_10, ANIM_VERSION_11, ANIM_VERSION_16, animVersionLabel, decodeAt, encode, replacePayload };
