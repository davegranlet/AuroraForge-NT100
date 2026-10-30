'use strict';

const fs = require('node:fs');
const legacy = require('../sdb-read');
const modern = require('../sdb-2k26');

function read(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  return legacy.readSdbRecords(buffer);
}

function summary(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  return legacy.summarizeSdb(buffer);
}

function lookup(buffer, id) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  return legacy.findSdbRecord(buffer, id);
}

function indexModern(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const index = modern.indexRecords(buffer);
  const records = [];
  for (let i = 0; i < index.count; i += 1) {
    const at = 8 + i * 12;
    records.push({
      id: buffer.readUInt32LE(at + 8),
      offset: buffer.readUInt32LE(at),
      length: buffer.readUInt32LE(at + 4),
    });
  }
  return { version: index.version, count: index.count, records };
}

function inspect(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const base = { schema: 'aurora-forge-sdb/v1', bytes: buffer.length };
  try {
    if (options.modern) {
      return { ...base, kind: '2k26-raw', ...indexModern(buffer) };
    }
    return { ...base, kind: 'legacy', ...summary(buffer) };
  } catch (error) {
    return { ...base, error: error.message };
  }
}

function inspectFile(file, options = {}) {
  return inspect(fs.readFileSync(file), options);
}

module.exports = {
  read,
  summary,
  lookup,
  indexModern,
  inspect,
  inspectFile,
  transform: modern.transform,
  decode: legacy.decode,
  encodeTransform: modern.transform,
};
