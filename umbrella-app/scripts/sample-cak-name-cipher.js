'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, decodePairs } = require('../electron/cak-reader');

const archivePath = path.resolve(process.argv[2] || '');
const catalogPath = path.resolve(process.argv[3] || '');
const limit = Math.max(1, Number(process.argv[4]) || 100);
const dictionary = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const session = openArchive(archivePath, dictionary);
const fd = fs.openSync(archivePath, 'r');
let encoded;
try {
  encoded = Buffer.alloc(session.header[15]);
  fs.readSync(fd, encoded, 0, encoded.length, session.header[17]);
} finally {
  fs.closeSync(fd);
}
const names = decodePairs(encoded, session.key);
const samples = [];
for (const file of session.files) {
  if (!file.nameResolved) continue;
  const basename = path.posix.basename(file.name);
  const size = names[file.stringOffset] + 2;
  const record = names.subarray(file.stringOffset, file.stringOffset + size);
  if (record.length !== size || record[0] !== Buffer.byteLength(basename, 'utf8') || record[record.length - 1] !== 0) continue;
  const cipher = record.subarray(1, -1);
  const plain = Buffer.from(basename, 'utf8');
  const xor = Buffer.alloc(cipher.length);
  for (let index = 0; index < cipher.length; index += 1) xor[index] = cipher[index] ^ plain[index];
  samples.push({ id: file.id, hash: file.hash, folderIndex: file.folderIndex, stringOffset: file.stringOffset, path: file.name, basename, record: record.toString('hex'), cipher: cipher.toString('hex'), xor: xor.toString('hex') });
  if (samples.length >= limit) break;
}
console.log(JSON.stringify(samples, null, 2));
