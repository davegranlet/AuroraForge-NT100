'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const { detect } = require('./detect');
const profileText = require('./profile-text');
const sdb = require('../sdb-read');
const clips = require('../clips-layout');
const adefs = require('../adefs-container');
const adefsFile = require('../adefs-file');
const tcaw = require('./tcaw');
const tdb = require('./tdb');
const dds = require('./dds-meta');
const mtls = require('./mtls');
const audio = require('./audio');
const ycl = require('./ycl');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function inspectJsfb(buffer) {
  if (buffer.length < 8) throw new Error('JSFB is shorter than 8 bytes');
  const rootOffset = buffer.readUInt32LE(0);
  const identifier = buffer.toString('latin1', 4, 8);
  if (rootOffset < 8 || rootOffset + 4 > buffer.length) throw new Error('JSFB root offset is outside the file');
  const distance = buffer.readInt32LE(rootOffset);
  const vtableOffset = rootOffset - distance;
  if (vtableOffset < 0 || vtableOffset + 4 > buffer.length) throw new Error('JSFB root vtable is outside the file');
  const vtableBytes = buffer.readUInt16LE(vtableOffset);
  const objectBytes = buffer.readUInt16LE(vtableOffset + 2);
  if (vtableBytes < 4 || vtableBytes % 2 !== 0) throw new Error('JSFB vtable size is invalid');
  if (objectBytes < 4) throw new Error('JSFB object size is invalid');
  if (vtableOffset + vtableBytes > buffer.length) throw new Error('JSFB vtable exceeds the file');
  return {
    format: 'jsfb',
    bytes: buffer.length,
    sha256: sha256(buffer),
    identifier,
    rootOffset,
    vtableOffset,
    vtableBytes,
    objectBytes,
    fields: (vtableBytes - 4) / 2,
  };
}

function inspectMcd(buffer) {
  if (buffer.length < 12) throw new Error('MCD header is truncated');
  return {
    format: 'mcd',
    bytes: buffer.length,
    magic: buffer.toString('latin1', 0, 4),
    version: buffer.readUInt32LE(4),
    headerWord: buffer.readUInt32LE(8),
    sha256: sha256(buffer),
  };
}

function inspectMtls(buffer) {
  if (buffer.length < 12) throw new Error('MTLS header is truncated');
  return {
    format: 'mtls',
    bytes: buffer.length,
    magic: buffer.toString('latin1', 0, 4),
    version: buffer.readUInt32LE(4),
    materialCount: buffer.readUInt32LE(8),
    sha256: sha256(buffer),
  };
}

function inspectBuffer(buffer, filename = '') {
  const detected = detect(buffer, filename);
  const base = { filename, bytes: buffer.length, sha256: sha256(buffer), detected };
  try {
    return inspectDetected(buffer, filename, detected, base);
  } catch (error) {
    return { ...base, error: error.message, summary: { status: 'decode-error', error: error.message } };
  }
}

function inspectDetected(buffer, filename, detected, base) {
  switch (detected.format) {
    case 'propsprofile':
    case 'arenaprofile': {
      const doc = profileText.parse(buffer, { format: detected.format });
      return { ...base, summary: profileText.summary(doc) };
    }
    case 'sdb':
      return { ...base, summary: sdb.summarizeSdb(buffer) };
    case 'clips':
      return { ...base, summary: clips.parse(buffer, { includeRaw: false }) };
    case 'adefs': {
      const sizes = adefsFile.header(buffer);
      if (buffer[24] !== 0x78) {
        return {
          ...base,
          summary: {
            status: 'needs-oodle',
            version: 6,
            compressedBytes: sizes.compressedBytes,
            expandedBytes: sizes.expandedBytes,
            note: 'Oodle-compressed ADEFS requires explicit work and Oodle DLL paths',
          },
        };
      }
      const decoded = adefs.decode(buffer);
      return {
        ...base,
        summary: {
          status: 'ok',
          version: decoded.version,
          compressedBytes: decoded.compressedBytes,
          expandedBytes: decoded.expandedBytes,
          payloadSha256: sha256(decoded.payload),
        },
      };
    }
    case 'jsfb':
      return { ...base, summary: inspectJsfb(buffer) };
    case 'tcaw':
      return { ...base, summary: tcaw.inspect(buffer) };
    case 'tdb':
      return { ...base, summary: tdb.inspect(buffer) };
    case 'dds':
      return { ...base, summary: dds.inspect(buffer) };
    case 'pck':
      return { ...base, summary: audio.inspectPck(buffer) };
    case 'wem':
      return { ...base, summary: audio.inspectWem(buffer) };
    case 'mcd':
      return { ...base, summary: inspectMcd(buffer) };
    case 'mtls':
      return { ...base, summary: mtls.inspect(buffer) };
    case 'ycl':
      return { ...base, summary: ycl.inspect(buffer, filename) };
    default:
      return base;
  }
}

function inspectFile(file) {
  return inspectBuffer(fs.readFileSync(file), file);
}

function validateBuffer(buffer, filename = '') {
  const detected = detect(buffer, filename);
  try {
    if (detected.format === 'propsprofile' || detected.format === 'arenaprofile') {
      const doc = profileText.parse(buffer, { format: detected.format, validate: false });
      return { ok: true, format: detected.format, validation: profileText.validate(doc, { format: detected.format }) };
    }
    if (detected.format === 'sdb') {
      const summary = sdb.summarizeSdb(buffer);
      return { ok: true, format: 'sdb', summary };
    }
    if (detected.format === 'clips') {
      const summary = clips.parse(buffer, { includeRaw: false });
      return { ok: true, format: 'clips', records: summary.count };
    }
    if (detected.format === 'adefs') {
      const summary = adefs.decode(buffer);
      return { ok: true, format: 'adefs', expandedBytes: summary.expandedBytes };
    }
    if (detected.format === 'jsfb') {
      const summary = inspectJsfb(buffer);
      return { ok: true, format: 'jsfb', identifier: summary.identifier, fields: summary.fields };
    }
    if (detected.format === 'tdb') {
      const summary = tdb.inspect(buffer);
      return { ok: true, format: 'tdb', entries: summary.count };
    }
    if (detected.format === 'dds') {
      return { ok: true, format: 'dds', summary: dds.inspect(buffer) };
    }
    if (detected.format === 'pck') {
      const summary = audio.inspectPck(buffer);
      return { ok: summary.valid, format: 'pck', summary };
    }
    if (detected.format === 'wem') {
      return { ok: true, format: 'wem', summary: audio.inspectWem(buffer) };
    }
    if (detected.format === 'tcaw') {
      const summary = tcaw.inspect(buffer);
      return { ok: true, format: 'tcaw', members: Object.keys(summary.members).length };
    }
    if (detected.format === 'mcd') {
      return { ok: true, format: 'mcd', summary: inspectMcd(buffer) };
    }
    if (detected.format === 'mtls') {
      return { ok: true, format: 'mtls', summary: mtls.inspect(buffer) };
    }
    if (detected.format === 'ycl') {
      return { ok: false, format: 'ycl', status: 'unsupported-no-oracle', error: 'YCL section layout is not validated without a lawful fixture/oracle round-trip' };
    }
    return { ok: false, format: detected.format, error: 'no structural validator for this format' };
  } catch (error) {
    return { ok: false, format: detected.format, error: error.message };
  }
}

module.exports = {
  inspectJsfb,
  inspectMcd,
  inspectMtls,
  inspectBuffer,
  inspectFile,
  validateBuffer,
  sha256,
};
