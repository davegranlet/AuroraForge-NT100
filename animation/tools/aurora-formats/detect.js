'use strict';

const path = require('node:path');

const EXTENSIONS = new Map([
  ['.jsfb', 'jsfb'],
  ['.sdb', 'sdb'],
  ['.adefs', 'adefs'],
  ['.clips', 'clips'],
  ['.propsprofile', 'propsprofile'],
  ['.arenaprofile', 'arenaprofile'],
  ['.mcd', 'mcd'],
  ['.mtls', 'mtls'],
  ['.jmtl', 'jmtl'],
  ['.propmaps', 'propmaps'],
  ['.move', 'move'],
  ['.tcaw', 'tcaw'],
  ['.tdb', 'tdb'],
  ['.ycl', 'ycl'],
  ['.hkt', 'hkt'],
  ['.pck', 'pck'],
  ['.wem', 'wem'],
  ['.bnk', 'bnk'],
  ['.moveset25', 'moveset25'],
  ['.pac', 'pac'],
  ['.wwu', 'wwu'],
  ['.bk2', 'bk2'],
  ['.qm', 'qm'],
  ['.sofa', 'sofa'],
  ['.dlp', 'dlp'],
]);

function ascii(buffer, start, end) {
  return buffer.toString('latin1', start, Math.min(end, buffer.length));
}

function detect(buffer, filename = '') {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer || []);
  const ext = path.extname(filename).toLowerCase();
  const extensionFormat = EXTENSIONS.get(ext) || null;
  const head = buffer.subarray(0, Math.min(buffer.length, 4096));
  const textHead = ascii(head, 0, head.length).replace(/^\uFEFF/, '');

  if (head.length >= 2 && head[0] === 0x4d && head[1] === 0x5a) {
    return { format: 'pe', confidence: 'high', reason: 'MZ header' };
  }
  if (head.length >= 4 && head.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) {
    return { format: 'elf', confidence: 'high', reason: 'ELF header' };
  }
  if (head.length >= 4 && head.subarray(0, 4).equals(Buffer.from('PK\u0003\u0004', 'latin1'))) {
    return { format: 'zip', confidence: 'high', reason: 'ZIP local header' };
  }
  if (head.length >= 7 && ascii(head, 0, 7) === 'Rar!\u001a\u0007\u0000') {
    return { format: 'rar', confidence: 'high', reason: 'RAR4 header' };
  }
  if (head.length >= 6 && head.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]))) {
    return { format: '7z', confidence: 'high', reason: '7Z header' };
  }
  if (head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b) {
    return { format: 'gzip', confidence: 'high', reason: 'GZIP header' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'DDS ') {
    return { format: 'dds', confidence: 'high', reason: 'DDS magic' };
  }
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { format: 'png', confidence: 'high', reason: 'PNG signature' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === '_rev') {
    return { format: 'adefs', confidence: 'high', reason: 'ADEFS _rev wrapper' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'AKPK') {
    return { format: 'pck', confidence: 'high', reason: 'Wwise AKPK header' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'TACW') {
    return { format: 'tcaw', confidence: 'high', reason: 'TCAW magic' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'T_DB') {
    return { format: 'tdb', confidence: 'high', reason: 'TDB magic' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'MCD!') {
    return { format: 'mcd', confidence: 'high', reason: 'MCD magic' };
  }
  if (head.length >= 4 && ascii(head, 0, 4) === 'MTLs') {
    return { format: 'mtls', confidence: 'high', reason: 'MTLS magic' };
  }
  if (textHead.startsWith('PROP,')) {
    return { format: 'propsprofile', confidence: 'high', reason: 'PROP record' };
  }
  if (textHead.startsWith('ProfileStart,')) {
    return { format: 'arenaprofile', confidence: 'high', reason: 'ProfileStart record' };
  }
  if (head.length >= 20 && head.readUInt32LE(0) === 256) {
    return { format: 'sdb', confidence: 'medium', reason: 'SDB version 256 header' };
  }
  if (extensionFormat) {
    return { format: extensionFormat, confidence: 'medium', reason: `extension ${ext}` };
  }
  return { format: 'unknown', confidence: 'none', reason: 'no signature or known extension' };
}

function detectFile(file, fs = require('node:fs')) {
  const buffer = fs.readFileSync(file);
  return { ...detect(buffer, file), file, bytes: buffer.length };
}

module.exports = { EXTENSIONS, detect, detectFile };
