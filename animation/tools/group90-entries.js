'use strict';

const fs = require('node:fs');

function readEntries(buffer, offset, count) {
  if (!Buffer.isBuffer(buffer) || !Number.isInteger(offset) || !Number.isInteger(count) || count < 0 || offset < 0 || offset + count * 8 > buffer.length) throw new Error('invalid Group90 entry range');
  return Array.from({ length: count }, (_, index) => buffer.readBigUInt64LE(offset + index * 8));
}

function encodeEntries(entries) {
  if (!Array.isArray(entries)) throw new Error('entries must be an array');
  const out = Buffer.alloc(entries.length * 8);
  entries.forEach((value, index) => {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`entry ${index} is not a non-negative safe integer`);
      value = BigInt(value);
    }
    if (typeof value !== 'bigint' || value < 0n || value > 0xffffffffffffffffn) throw new Error(`entry ${index} is outside uint64`);
    out.writeBigUInt64LE(value, index * 8);
  });
  return out;
}

function replaceEntries(buffer, offset, count, entries) {
  if (entries.length !== count) throw new Error(`replacement count ${entries.length} does not match Group90 count ${count}`);
  return Buffer.concat([buffer.subarray(0, offset), encodeEntries(entries), buffer.subarray(offset + count * 8)]);
}

function replaceRecordGroup90(clipsPath, outputPath, recordIndex, entries) {
  const { parseFile } = require('./clips-layout');
  const report = parseFile(clipsPath, { includeRaw: false });
  const record = report.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const group = record.sections.find(item => item.name === 'group90');
  const source = fs.readFileSync(clipsPath);
  const offset = record.offset + Number.parseInt(group.relativeOffset.slice(2), 16);
  const result = replaceEntries(source, offset, group.count, entries);
  fs.writeFileSync(outputPath, result);
  return parseFile(outputPath, { includeRaw: false });
}

module.exports = { readEntries, encodeEntries, replaceEntries, replaceRecordGroup90 };
