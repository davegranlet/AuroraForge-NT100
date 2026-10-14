'use strict';

// Read-only inspection helpers mirrored from the native Clips Editor decoder.
// This module deliberately exposes descriptor layout and packed-bit reads only;
// it does not interpret them as complete poses or write .clips data.
const { parse, parseFile } = require('./clips-layout');
const fs = require('node:fs');
const { build } = require('./clips-layout');

function requireInteger(value, label, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${label} must be an integer in ${minimum}..${maximum}`);
  return value;
}

// Native FUN_140004600: least-significant-bit first reads across uint64 words.
function readBitsLE(words, bitOffset, width) {
  if (!Array.isArray(words) || words.some(word => typeof word !== 'bigint' || word < 0n || word > 0xffffffffffffffffn)) throw new Error('words must be uint64 BigInts');
  requireInteger(bitOffset, 'bit offset', 0, Number.MAX_SAFE_INTEGER);
  requireInteger(width, 'bit width', 0, 64);
  if (width === 0) return 0n;
  if (bitOffset + width > words.length * 64) throw new Error('bit read exceeds Group90 table');
  const index = Math.floor(bitOffset / 64);
  const shift = BigInt(bitOffset % 64);
  let value = words[index] >> shift;
  if (shift + BigInt(width) > 64n) value |= words[index + 1] << (64n - shift);
  return width === 64 ? BigInt.asUintN(64, value) : value & ((1n << BigInt(width)) - 1n);
}

// Native FUN_140002e50's schedule prelude. It records up to 15 timing runs,
// then reads the eight-bit channel mode. The caller owns subsequent
// mode-dependent value positioning, so this function does not invent it.
function decodeTimingPrelude(words, frameCount, bitOffset = 0) {
  requireInteger(frameCount, 'frame count', 0, 0xffff);
  requireInteger(bitOffset, 'bit offset', 0, Number.MAX_SAFE_INTEGER);
  if (frameCount === 0) return { runs: [], mode: null, nextBitOffset: bitOffset };
  let cursor = bitOffset;
  let covered = 0;
  const runs = [];
  while (covered < frameCount) {
    if (runs.length >= 15) throw new Error('native timing run limit exceeded');
    const stepped = readBitsLE(words, cursor, 1) !== 0n; cursor += 1;
    const explicitLength = readBitsLE(words, cursor, 1) !== 0n; cursor += 1;
    const length = explicitLength ? Number(readBitsLE(words, cursor, 16)) : frameCount - covered;
    if (explicitLength) cursor += 16;
    if (length <= 0 || covered + length > frameCount) throw new Error('invalid native timing run length');
    runs.push({ stepped, length });
    covered += length;
  }
  const mode = Number(readBitsLE(words, cursor, 8));
  return { runs, mode, nextBitOffset: cursor + 8 };
}

function decodeRecordTiming(words, frameCount, bitOffset = 0) {
  if (!Array.isArray(words) || words.length === 0) return null;
  return decodeTimingPrelude(words, frameCount, bitOffset);
}

function signedByte(value) {
  const byte = Number(value & 0xffn);
  return byte < 0x80 ? byte : byte - 0x100;
}

function descriptor(word) {
  if (typeof word !== 'bigint' || word < 0n || word > 0xffffffffffffffffn) throw new Error('descriptor word must be uint64');
  return {
    raw: `0x${word.toString(16).toUpperCase().padStart(16, '0')}`,
    lowSignedByte: signedByte(word),
    bitWidth: Number((word >> 8n) & 0xffn),
    highUint32: Number((word >> 32n) & 0xffffffffn),
  };
}

// Native FUN_140003530's scalar expansion for a packed translation/channel
// value. This is intentionally a scalar primitive only: timing cursor
// selection and quaternion assembly remain separate decoder stages.
function decodeQuantizedValue(word, packedValue) {
  const info = descriptor(word);
  if (!Number.isInteger(packedValue) || packedValue < 0) throw new Error('packed value must be a non-negative integer');
  const scale = (info.lowSignedByte + 0x7f) * 0x800000;
  // The upper word is stored as IEEE-754 float bits in real descriptors.
  const high = info.highUint32;
  const base = Buffer.from([high & 0xff, (high >>> 8) & 0xff, (high >>> 16) & 0xff, high >>> 24]).readFloatLE(0);
  return { base, scale, value: base + packedValue * scale };
}

function entryWord(entry) {
  return Buffer.from(entry.hex, 'hex').readBigUInt64LE(0);
}

function inspectRecord(record, boneIndex, bitOffset = 0, widths = []) {
  requireInteger(boneIndex, 'bone index', 0, record.trackIdentifiers.length - 1);
  const group78 = record.raw.group78.map(entryWord);
  const group90 = record.raw.group90.map(entryWord);
  const start = boneIndex * 6;
  const descriptors = group78.slice(start, start + 6).map(descriptor);
  if (descriptors.length !== 6) throw new Error('Group78 does not contain six descriptors for the requested bone');
  let cursor = bitOffset;
  const reads = widths.map((width, index) => {
    requireInteger(width, `width ${index}`, 0, 64);
    const value = readBitsLE(group90, cursor, width);
    const result = { offset: cursor, width, value: `0x${value.toString(16).toUpperCase().padStart(16, '0')}` };
    cursor += width;
    return result;
  });
  return { recordIndex: record.index, clipId: record.id, boneIndex, boneId: record.trackIdentifiers[boneIndex], descriptors, group90Bits: group90.length * 64, timingPrelude: decodeRecordTiming(group90, record.frameValue), reads };
}

function inspectFile(input, recordIndex, boneIndex, bitOffset = 0, widths = []) {
  const report = parseFile(input, { includeRaw: true });
  requireInteger(recordIndex, 'record index', 0, report.records.length - 1);
  return inspectRecord(report.records[recordIndex], boneIndex, bitOffset, widths);
}

function inspectPayloadFile(input, boneIndex, bitOffset = 0, widths = []) {
  const payload = fs.readFileSync(input);
  const report = parse(build([payload]), { includeRaw: true });
  return inspectRecord(report.records[0], boneIndex, bitOffset, widths);
}

function run(argv) {
  if (argv[0] === '--payload') {
    const [, input, boneText, bitText = '0', ...widthTexts] = argv;
    if (!input || boneText === undefined) throw new Error('Usage: node tools/clips-native-inspect.js --payload <record.clip> <bone-index> [bit-offset] [bit-width ...]');
    const parseInteger = (text, label) => { if (!/^\d+$/.test(text)) throw new Error(`${label} must be a non-negative integer`); return Number(text); };
    return inspectPayloadFile(input, parseInteger(boneText, 'bone index'), parseInteger(bitText, 'bit offset'), widthTexts.map((text, index) => parseInteger(text, `bit width ${index}`)));
  }
  const [input, recordText, boneText, bitText = '0', ...widthTexts] = argv;
  if (!input || recordText === undefined || boneText === undefined) throw new Error('Usage: node tools/clips-native-inspect.js <input.clips> <record-index> <bone-index> [bit-offset] [bit-width ...]');
  const parseInteger = (text, label) => { if (!/^\d+$/.test(text)) throw new Error(`${label} must be a non-negative integer`); return Number(text); };
  return inspectFile(input, parseInteger(recordText, 'record index'), parseInteger(boneText, 'bone index'), parseInteger(bitText, 'bit offset'), widthTexts.map((text, index) => parseInteger(text, `bit width ${index}`)));
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`clips-native-inspect failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { decodeQuantizedValue, decodeRecordTiming, decodeTimingPrelude, descriptor, entryWord, inspectFile, inspectPayloadFile, inspectRecord, readBitsLE, run };
