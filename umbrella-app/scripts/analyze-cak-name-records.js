'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, decodePairs } = require('../electron/cak-reader');

const archivePath = path.resolve(process.argv[2] || '');
const catalogPath = path.resolve(process.argv[3] || '');
if (!fs.existsSync(archivePath)) throw new Error('Archive not found: ' + archivePath);
if (!fs.existsSync(catalogPath)) throw new Error('Catalog not found: ' + catalogPath);

const dictionary = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const session = openArchive(archivePath, dictionary);
const tableOffset = session.header[17];
const tableSize = session.header[15];
const fd = fs.openSync(archivePath, 'r');
let encoded;
try {
  encoded = Buffer.alloc(tableSize);
  if (fs.readSync(fd, encoded, 0, tableSize, tableOffset) !== tableSize) throw new Error('Name table ended early.');
} finally {
  fs.closeSync(fd);
}
const decoded = decodePairs(encoded, session.key);
const offsets = [...new Set([...session.files, ...session.folders].map((item) => item.stringOffset))].sort((a, b) => a - b);
const nextOffset = new Map(offsets.map((value, index) => [value, offsets[index + 1] ?? decoded.length]));

function basenameFor(item) {
  if (!item.nameResolved) return '';
  return path.posix.basename(item.name);
}

function recordFor(item) {
  const end = nextOffset.get(item.stringOffset);
  return decoded.subarray(item.stringOffset, end);
}

function xorHex(a, b) {
  const length = Math.min(a.length, b.length);
  const out = Buffer.alloc(length);
  for (let index = 0; index < length; index += 1) out[index] = a[index] ^ b[index];
  return out.toString('hex');
}

const known = [...session.files, ...session.folders]
  .filter((item) => item.nameResolved)
  .slice(0, 500)
  .map((item) => {
    const basename = basenameFor(item);
    const plain = Buffer.from(basename, 'utf8');
    const record = recordFor(item);
    const payload = record.length >= plain.length + 2 ? record.subarray(1, 1 + plain.length) : Buffer.alloc(0);
    return {
      kind: Object.hasOwn(item, 'storedSize') ? 'file' : 'folder',
      id: item.id,
      hash: item.hash,
      path: item.name,
      basename,
      stringOffset: item.stringOffset,
      recordBytes: record.length,
      first: record[0],
      expectedUtf8Bytes: plain.length,
      endsZero: record.at(-1) === 0,
      recordHex: record.toString('hex'),
      payloadXorPlainHex: xorHex(payload, plain)
    };
  });

const lengthMatches = known.filter((item) => item.recordBytes === item.expectedUtf8Bytes + 2).length;
const firstMatches = known.filter((item) => item.first === item.expectedUtf8Bytes).length;
const zeroMatches = known.filter((item) => item.endsZero).length;
const duplicateBasenames = {};
for (const item of known) {
  if (!duplicateBasenames[item.basename]) duplicateBasenames[item.basename] = [];
  duplicateBasenames[item.basename].push(item);
}
const duplicates = Object.fromEntries(Object.entries(duplicateBasenames).filter(([, items]) => items.length > 1).slice(0, 50));

console.log(JSON.stringify({
  archive: path.basename(archivePath),
  tableSize,
  uniqueOffsets: offsets.length,
  knownAnalyzed: known.length,
  recordLengthMatches: lengthMatches,
  firstByteLengthMatches: firstMatches,
  zeroTerminatorMatches: zeroMatches,
  samples: known.slice(0, 80),
  duplicateBasenames: duplicates
}, null, 2));
