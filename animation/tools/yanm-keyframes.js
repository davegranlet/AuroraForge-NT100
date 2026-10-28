'use strict';

// Structural source decoder. Packed values are preserved, not yet interpreted
// as Euler angles, quaternions, translations, or spline control points.
const fs = require('node:fs');

function range(buffer, offset, bytes, end = buffer.length) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(bytes) ||
      offset < 0 || bytes < 0 || offset + bytes > Math.min(end, buffer.length)) {
    throw new Error('YANM span exceeds section bounds');
  }
}

function readKeys(buffer, start, count, stride, deltaOffset, end) {
  if (count > 1000000) throw new Error('YANM key count exceeds limit');
  range(buffer, start, count * stride, end);
  let frame = 0;
  const keys = [];
  for (let index = 0; index < count; index++) {
    const offset = start + index * stride;
    const rawDelta = buffer.readUInt16BE(offset + deltaOffset);
    // Compact records reserve the high bit; retain it without assigning a
    // rotation/sign meaning until value reconstruction is established.
    const delta = stride === 4 ? rawDelta & 0x7fff : rawDelta;
    frame += delta;
    const packed = [];
    for (let k = 0; k < stride; k += 2) {
      if (k !== deltaOffset) packed.push(buffer.readInt16BE(offset + k));
    }
    keys.push({ frame, delta, deltaFlags: rawDelta ^ delta, packed });
  }
  return { count, stride, totalFrames: frame, keys };
}

function parseSection(buffer, root) {
  range(buffer, root, 16);
  if (buffer.toString('ascii', root, root + 4) !== 'YANM') throw new Error('Not a YANM section');
  const base = root + 8;
  const end = base + buffer.readUInt32BE(root + 4);
  range(buffer, root, end - root);
  const declaredCount = buffer.readUInt16BE(root + 10);
  if (declaredCount < 2 || declaredCount > 4097) throw new Error('Invalid YANM record count');
  let cursor = root + 16;
  range(buffer, cursor, 16, end);
  if (buffer.readUInt16BE(cursor + 2) === 0x10) cursor += 12;
  const tracks = [];
  for (let index = 0; index < declaredCount - 1; index++) {
    range(buffer, cursor, 24, end);
    const type = buffer.readUInt16BE(cursor);
    const length = buffer.readUInt16BE(cursor + 2);
    if (![24, 48, 56].includes(length)) throw new Error('Unsupported YANM record header size');
    range(buffer, cursor, length, end);
    const track = { index, type, hash: buffer.readUInt32BE(cursor + 4).toString(16).padStart(8, '0'), supported: false };
    if ([0x0204, 0x0304, 0x2200, 0x2300, 0x4300, 0x5300].includes(type)) {
      const compact = type === 0x4300 || type === 0x5300;
      const reversed = type === 0x2200 || type === 0x2300 || compact;
      const flagsField = type === 0x5300 ? 24 : reversed ? 16 : 8;
      const keysField = reversed ? 8 : 16;
      const flagsStart = base + buffer.readUInt32BE(cursor + flagsField);
      if (buffer.readUInt32BE(cursor + flagsField + 4) !== 2) throw new Error('Unexpected channel-header length');
      range(buffer, flagsStart, 16, end);
      track.channelHeader = buffer.subarray(flagsStart, flagsStart + 16).toString('hex');
      track.frameCount = buffer.readUInt16BE(flagsStart + 14);
      const start = base + buffer.readUInt32BE(cursor + keysField);
      const count = buffer.readUInt32BE(cursor + keysField + 4);
      track.primary = readKeys(buffer, start, count, compact ? 4 : type === 0x0204 ? 20 : 8, compact ? 2 : type === 0x0204 ? 0 : 6, end);
      if (type === 0x0304) {
        if (length !== 48) throw new Error('Unexpected 0304 header size');
        track.quantizationCandidates = Array.from({ length: 4 }, (_, i) => buffer.readFloatBE(cursor + 24 + i * 4));
        if (!track.quantizationCandidates.every(Number.isFinite)) throw new Error('Non-finite quantization header');
        const extraStart = base + buffer.readUInt32BE(cursor + 40);
        const extraCount = buffer.readUInt32BE(cursor + 44);
        track.secondary = readKeys(buffer, extraStart, extraCount, 20, 0, end);
      }
      if ([0x2300, 0x4300, 0x5300].includes(type)) {
        if (length !== (type === 0x5300 ? 56 : 48)) throw new Error('Unexpected extended header size');
        const extraField = type === 0x5300 ? 32 : 24;
        track.secondary = readKeys(buffer, base + buffer.readUInt32BE(cursor + extraField), buffer.readUInt32BE(cursor + extraField + 4), 8, 6, end);
        track.quantizationCandidates = Array.from({ length: 4 }, (_, i) => buffer.readFloatBE(cursor + extraField + 8 + i * 4));
        if (type === 0x5300) track.tertiary = readKeys(buffer, base + buffer.readUInt32BE(cursor + 16), buffer.readUInt32BE(cursor + 20), 4, 2, end);
      }
      track.timelineMatches = track.primary.totalFrames === track.frameCount &&
        (!track.secondary || track.secondary.totalFrames === track.frameCount) &&
        (!track.tertiary || track.tertiary.totalFrames === track.frameCount);
      track.supported = true;
    }
    tracks.push(track);
    cursor += length;
  }
  return { root, bytes: end - root, declaredCount, tracks };
}

function decode(buffer) {
  const sections = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf('YANM', cursor, 'ascii')) !== -1) {
    const section = parseSection(buffer, cursor);
    sections.push(section);
    cursor += section.bytes;
    if (sections.length > 4096) throw new Error('Too many YANM sections');
  }
  if (!sections.length) throw new Error('No YANM sections');
  return sections;
}

function summary(sections) {
  return sections.map(section => ({
    tracks: section.tracks.length,
    supported: section.tracks.filter(t => t.supported).length,
    timelineMatches: section.tracks.filter(t => t.timelineMatches).length,
    unsupportedTypes: [...new Set(section.tracks.filter(t => !t.supported).map(t => t.type.toString(16)))],
    mismatches: section.tracks.filter(t => t.supported && !t.timelineMatches).map(t => ({
      index: t.index, hash: t.hash, declared: t.frameCount,
      primary: t.primary.totalFrames, secondary: t.secondary?.totalFrames, tertiary: t.tertiary?.totalFrames,
    })),
  }));
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/yanm-keyframes.js <decoded-motion.bin>');
    const stat = fs.statSync(process.argv[2]);
    if (!stat.isFile() || stat.size > 512 * 1024 * 1024) throw new Error('Invalid input size/type');
    console.log(JSON.stringify(summary(decode(fs.readFileSync(process.argv[2]))), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseSection, decode, readKeys, summary };
