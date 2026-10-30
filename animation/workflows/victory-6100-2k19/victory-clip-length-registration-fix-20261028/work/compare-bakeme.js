'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function listFiles(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    return [path.relative(root, full).replace(/\\/g, '/')];
  }).sort();
}

const [baseRoot, candidateRoot, outPath] = process.argv.slice(2);
if (!baseRoot || !candidateRoot || !outPath) {
  throw new Error('Usage: node compare-bakeme.js <baseRoot> <candidateRoot> <out.json>');
}
const base = path.resolve(baseRoot);
const candidate = path.resolve(candidateRoot);
const baseFiles = listFiles(base);
const candidateFiles = listFiles(candidate);
const baseSet = new Set(baseFiles);
const candidateSet = new Set(candidateFiles);
const added = candidateFiles.filter((file) => !baseSet.has(file));
const removed = baseFiles.filter((file) => !candidateSet.has(file));
const common = baseFiles.filter((file) => candidateSet.has(file));

const changed = [];
const unchanged = [];
for (const relative of common) {
  const baseBytes = fs.readFileSync(path.join(base, ...relative.split('/')));
  const candidateBytes = fs.readFileSync(path.join(candidate, ...relative.split('/')));
  if (baseBytes.equals(candidateBytes)) {
    unchanged.push({ path: relative, bytes: baseBytes.length, sha256: sha256(baseBytes) });
    continue;
  }
  const length = Math.max(baseBytes.length, candidateBytes.length);
  const byteDiff = [];
  for (let offset = 0; offset < length; offset += 1) {
    if (baseBytes[offset] !== candidateBytes[offset]) {
      byteDiff.push({
        offset,
        before: offset < baseBytes.length ? baseBytes[offset].toString(16).padStart(2, '0').toUpperCase() : null,
        after: offset < candidateBytes.length ? candidateBytes[offset].toString(16).padStart(2, '0').toUpperCase() : null,
      });
    }
  }
  changed.push({
    path: relative,
    bytesBefore: baseBytes.length,
    bytesAfter: candidateBytes.length,
    sha256Before: sha256(baseBytes),
    sha256After: sha256(candidateBytes),
    differingByteCount: byteDiff.length,
    differingByteOffsets: byteDiff.map((entry) => entry.offset),
    byteDiff,
    u32At1468Before: baseBytes.readUInt32LE(1468),
    u32At1468After: candidateBytes.readUInt32LE(1468),
    u32At1468BeforeHex: baseBytes.subarray(1468, 1472).toString('hex').toUpperCase(),
    u32At1468AfterHex: candidateBytes.subarray(1468, 1472).toString('hex').toUpperCase(),
  });
}

const expectedFile = 'Cutscene/CaeAdvanced/1014003.jsfb';
const expectedFieldOffset = 1468;
const expectedFieldWidth = 4;
const expectedFieldBefore = 'DA060000';
const expectedFieldAfter = '74090000';
const changedPaths = changed.map((entry) => entry.path);
const onlyExpectedFile = changed.length === 1 && changed[0].path === expectedFile;
const onlyFieldBytesChanged = onlyExpectedFile
  && changed[0].differingByteOffsets.every((offset) => offset >= expectedFieldOffset && offset < expectedFieldOffset + expectedFieldWidth)
  && changed[0].u32At1468Before === 1754
  && changed[0].u32At1468After === 2420
  && changed[0].u32At1468BeforeHex === expectedFieldBefore
  && changed[0].u32At1468AfterHex === expectedFieldAfter;
const onlyExpectedBytes = onlyFieldBytesChanged;

const report = {
  schema: 'aurora-forge/victory-clip-length-registration-bakeme-diff/v1',
  generatedUtc: new Date().toISOString(),
  base,
  candidate,
  fileCount: candidateFiles.length,
  baseFileCount: baseFiles.length,
  added,
  removed,
  changed,
  unchangedCount: unchanged.length,
  unchanged,
  allOtherFilesByteIdentical: added.length === 0 && removed.length === 0 && unchanged.length === baseFiles.length - changed.length,
  patchProof: {
    expectedFile,
    expectedFieldOffset,
    expectedFieldWidth,
    expectedFieldBeforeHex: expectedFieldBefore,
    expectedFieldAfterHex: expectedFieldAfter,
    changedFileCount: changed.length,
    changedPaths,
    onlyExpectedFile,
    onlyFieldBytesChanged,
    observedDifferingByteCount: changed.length === 1 ? changed[0].differingByteCount : null,
    observedDifferingByteOffsets: changed.length === 1 ? changed[0].differingByteOffsets : null,
    note: 'The 4-byte u32 field at offset 1468 changes DA 06 00 00 (1754) to 74 09 00 00 (2420). Only individual byte positions 1468 and 1469 differ because bytes 1470 and 1471 are 00 in both values.',
    pass: onlyExpectedFile && onlyExpectedBytes && unchanged.length === 42 && added.length === 0 && removed.length === 0,
  },
  pass: onlyExpectedFile && onlyExpectedBytes && unchanged.length === 42 && added.length === 0 && removed.length === 0,
};
fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  out: path.resolve(outPath),
  fileCount: report.fileCount,
  changed: changed.map((entry) => ({ path: entry.path, differingByteCount: entry.differingByteCount, differingByteOffsets: entry.differingByteOffsets })),
  unchangedCount: unchanged.length,
  added: added.length,
  removed: removed.length,
  pass: report.pass,
}, null, 2));
