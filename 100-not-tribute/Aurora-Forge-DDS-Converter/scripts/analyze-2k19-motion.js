#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const MAX_INPUT_BYTES = 512 * 1024 * 1024;
const MAX_RECORDS = 4096;
const EXPLICIT_YANM_NAMES = new Map([
  [0x0C5879E5, 'vector'],
  [0xF91A7A26, 'J_Hips'],
  [0x0DAECC2E, 'Ch_rotation'],
  [0x3D185308, 'J_Spine1'],
  [0xF9D973BE, 'J_Head'],
  [0xF91972B1, 'J_Neck'],
  [0xD153E363, 'J_Clavicle_L'],
  [0xA46A2F43, 'J_Shoulder_L'],
  [0x6742F8AA, 'J_Elbow_L'],
  [0xD4C2705A, 'J_Wrist_L'],
  [0xB10CEB4C, 'J_MiddleF0_L'],
  [0xB10CAB4C, 'J_MiddleF1_L'],
  [0xB10C6B4C, 'J_MiddleF2_L'],
  [0xB10C2B4C, 'J_MiddleF3_L'],
]);

function u16be(buffer, offset) {
  if (offset < 0 || offset + 2 > buffer.length) throw new Error(`u16 outside file at 0x${offset.toString(16)}`);
  return buffer.readUInt16BE(offset);
}

function u32be(buffer, offset) {
  if (offset < 0 || offset + 4 > buffer.length) throw new Error(`u32 outside file at 0x${offset.toString(16)}`);
  return buffer.readUInt32BE(offset);
}

function hex(value, width = 8) {
  return `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;
}

function readUleb128(buffer, offset, end = buffer.length) {
  let value = 0;
  let shift = 0;
  let cursor = offset;
  while (cursor < end && cursor - offset < 5) {
    const byte = buffer[cursor++];
    value += (byte & 0x7F) * (2 ** shift);
    if ((byte & 0x80) === 0) return { value, bytes: cursor - offset, nextOffset: cursor };
    shift += 7;
  }
  throw new Error(`invalid or overlong ULEB128 token at ${hex(offset)}`);
}

function scanUleb128(buffer, offset, end, limit = 5000) {
  const tokens = [];
  let cursor = offset;
  while (cursor < end) {
    if (tokens.length >= limit) throw new Error(`ULEB128 token limit ${limit} reached before channel end`);
    const token = readUleb128(buffer, cursor, end);
    tokens.push({ offset: hex(cursor), value: token.value, bytes: token.bytes });
    cursor = token.nextOffset;
  }
  return tokens;
}

function locateYanm(buffer) {
  const locations = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf('YANM', cursor, 'ascii')) !== -1) {
    locations.push(cursor);
    cursor += 4;
    if (locations.length > MAX_RECORDS) throw new Error('too many YANM signatures');
  }
  if (locations.length === 0) throw new Error('no YANM signatures found');
  return locations;
}

function parseFlags(buffer, offset, units) {
  const byteLength = units * 8;
  const dataOffset = offset + 8;
  if (byteLength < 16 || dataOffset + byteLength > buffer.length) return null;
  const flag = (relative) => {
    const value = u16be(buffer, dataOffset + relative);
    if (value === 1) return true;
    if (value === 0xFF00) return false;
    return null;
  };
  return {
    translation: { x: flag(0), y: flag(2), z: flag(4) },
    rotation: { x: flag(8), y: flag(10), z: flag(12) },
    frameCount: u16be(buffer, dataOffset + 14),
  };
}

function parseYanm(buffer, yanmOffset) {
  if (yanmOffset + 0x10 > buffer.length) throw new Error('truncated YANM header');
  const declaredCount = u16be(buffer, yanmOffset + 0x0A);
  if (declaredCount < 2 || declaredCount > MAX_RECORDS + 1) throw new Error(`invalid YANM count ${declaredCount}`);
  const records = [];
  let cursor = yanmOffset + 0x10;
  let headerPreambleBytes = 0;
  const initialLength = u16be(buffer, cursor + 2);
  if (![0x18, 0x30, 0x38].includes(initialLength) && cursor + 16 <= buffer.length) {
    const shiftedLength = u16be(buffer, cursor + 12 + 2);
    if (initialLength === 0x10 && [0x18, 0x30, 0x38].includes(shiftedLength)) {
      headerPreambleBytes = 12;
      cursor += headerPreambleBytes;
    }
  }

  for (let index = 0; index < declaredCount - 1; index += 1) {
    const length = u16be(buffer, cursor + 2);
    if (![0x18, 0x30, 0x38].includes(length)) throw new Error(`record ${index} has unsupported header length ${hex(length, 4)}`);
    if (cursor + length > buffer.length) throw new Error(`record ${index} header exceeds file`);
    const startingId = u16be(buffer, cursor);
    const partAOffset = u32be(buffer, cursor + 8);
    const partAUnits = u32be(buffer, cursor + 0x0C);
    const partBOffset = u32be(buffer, cursor + 0x10);
    const partBUnits = u32be(buffer, cursor + 0x14);
    const headerPart = startingId < 1000 ? 'A' : 'B';
    const selectedOffset = headerPart === 'A' ? partAOffset : partBOffset;
    const selectedUnits = headerPart === 'A' ? partAUnits : partBUnits;
    const boneHashValue = u32be(buffer, cursor + 4);
    records.push({
      index,
      startingId,
      headerLength: length,
      boneHash: hex(boneHashValue),
      boneNameCandidate: EXPLICIT_YANM_NAMES.get(boneHashValue) || null,
      partA: { offset: hex(partAOffset), units: partAUnits, bytes: partAUnits * 8 },
      partB: { offset: hex(partBOffset), units: partBUnits, bytes: partBUnits * 8 },
      channelHeaderPart: headerPart,
      channels: parseFlags(buffer, yanmOffset + selectedOffset, selectedUnits),
    });
    cursor += length;
  }

  return {
    yanmOffset: hex(yanmOffset),
    declaredCount,
    headerPreambleBytes,
    parsedRecordCount: records.length,
    recordHeadersEnd: hex(cursor),
    records,
  };
}

function analyze(filePath) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error('input is not a file');
  if (stat.size <= 0 || stat.size > MAX_INPUT_BYTES) throw new Error(`input size ${stat.size} is outside safe bounds`);
  const buffer = fs.readFileSync(filePath);
  const locations = locateYanm(buffer);
  const motions = locations.map((offset, index) => {
    try { return { index, ...parseYanm(buffer, offset) }; }
    catch (error) { throw new Error(`YANM ${index} at ${hex(offset)}: ${error.message}`); }
  });
  return {
    schema: 'aurora-forge-wwe2k19-motion-analysis/v1',
    status: 'Research',
    source: { name: path.basename(filePath), bytes: buffer.length },
    motionCount: motions.length,
    motions,
  };
}

function inputsFrom(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  if (!stat.isDirectory()) throw new Error('input must be a file or directory');
  return fs.readdirSync(target, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.bin'))
    .map((entry) => path.join(target, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function analyzeTarget(target) {
  const files = inputsFrom(path.resolve(target));
  if (files.length === 0) throw new Error('no .bin files found');
  const results = [];
  const rejections = [];
  for (const file of files) {
    try { results.push(analyze(file)); }
    catch (error) { rejections.push({ name: path.basename(file), reason: error.message }); }
  }
  return {
    schema: 'aurora-forge-wwe2k19-motion-batch/v1',
    status: 'Research',
    accepted: results.length,
    rejected: rejections.length,
    results,
    rejections,
  };
}

if (require.main === module) try {
  if (!process.argv[2]) throw new Error('usage: node scripts/analyze-2k19-motion.js <decoded-motion-file-or-directory>');
  const report = analyzeTarget(process.argv[2]);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.results.length === 0) process.exitCode = 2;
} catch (error) {
  process.stderr.write(`WWE 2K19 motion analysis failed: ${error.message}\n`);
  process.exitCode = 1;
}

module.exports = { analyze, analyzeTarget, readUleb128, scanUleb128 };
