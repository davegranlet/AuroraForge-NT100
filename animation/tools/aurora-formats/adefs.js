'use strict';

const fs = require('node:fs');
const container = require('../adefs-container');
const modern = require('../adefs-file');
const payload = require('../adefs-payload');

function decode(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  return modern.decode(buffer, options);
}

function encode(payloadBytes, codec = 'zlib', options = {}) {
  return modern.encode(payloadBytes, codec, options);
}

function inspect(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const header = modern.header(buffer);
  if (buffer[24] !== 0x78) {
    return {
      schema: 'aurora-forge-adefs/v1',
      bytes: buffer.length,
      version: 6,
      codec: 'oodle',
      compressedBytes: header.compressedBytes,
      expandedBytes: header.expandedBytes,
      status: 'needs-codec',
    };
  }
  const decoded = modern.decode(buffer, options);
  return {
    schema: 'aurora-forge-adefs/v1',
    bytes: buffer.length,
    version: decoded.version,
    codec: decoded.codec,
    compressedBytes: decoded.compressedBytes,
    expandedBytes: decoded.expandedBytes,
    payloadBytes: decoded.payload.length,
    status: 'ok',
  };
}

function inspectFile(file, options = {}) {
  return inspect(fs.readFileSync(file), options);
}

function parsePayload(payloadBytes) {
  return payload.parsePayload(payloadBytes);
}

function serializePayload(model) {
  return payload.serializePayload(model);
}

module.exports = {
  decode,
  encode,
  inspect,
  inspectFile,
  parsePayload,
  serializePayload,
  header: modern.header,
  zlib: container,
};
