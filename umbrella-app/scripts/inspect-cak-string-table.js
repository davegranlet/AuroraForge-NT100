'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, decodePairs } = require('../electron/cak-reader');

const archivePath = path.resolve(process.argv[2] || '');
if (!fs.existsSync(archivePath)) throw new Error('Archive not found.');
let dictionary = {};
if (process.argv[3] && fs.existsSync(path.resolve(process.argv[3]))) dictionary = JSON.parse(fs.readFileSync(path.resolve(process.argv[3]), 'utf8'));
const session = openArchive(archivePath, dictionary);
const offset = session.header[17];
const size = session.header[15];
const fd = fs.openSync(archivePath, 'r');
let encoded;
try {
  encoded = Buffer.alloc(size);
  const read = fs.readSync(fd, encoded, 0, size, offset);
  if (read !== size) throw new Error('String table ended early.');
} finally {
  fs.closeSync(fd);
}
const decoded = decodePairs(encoded, session.key);
const strings = [];
let start = 0;
for (let index = 0; index <= decoded.length; index += 1) {
  if (index !== decoded.length && decoded[index] !== 0) continue;
  if (index > start) {
    const value = decoded.subarray(start, index).toString('utf8');
    strings.push({ offset: start, value });
  }
  start = index + 1;
}
const printable = strings.filter((item) => /^[\x20-\x7e]+$/.test(item.value));
const offsets = new Set([...session.files.map((file) => file.stringOffset), ...session.folders.map((folder) => folder.stringOffset)]);
const referenced = printable.filter((item) => offsets.has(item.offset));
const offsetSamples = session.files.slice(0, 30).map((file) => ({ id: file.id, path: file.nameResolved ? file.name : '', hash: file.hash, stringOffset: file.stringOffset, bytes: decoded.subarray(file.stringOffset, Math.min(decoded.length, file.stringOffset + 32)).toString('hex') }));
console.log(JSON.stringify({ archive: path.basename(archivePath), tableOffset: offset, tableSize: size, encodedHex: encoded.subarray(0, 96).toString('hex'), decodedHex: decoded.subarray(0, 96).toString('hex'), strings: strings.length, printable: printable.length, referenced: referenced.length, samplePrintable: printable.slice(0, 100), sampleReferenced: referenced.slice(0, 100), offsetSamples }, null, 2));
