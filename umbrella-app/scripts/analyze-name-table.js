'use strict';

const fs = require('fs');
const reader = require('../electron/cak-reader');

const archivePath = process.argv[2];
const extractsPath = process.argv[3];
if (!archivePath || !extractsPath) throw new Error('Usage: node analyze-name-table.js archive.cak extracts-folder');

const first = reader.openArchive(archivePath);
const targetHashes = new Set(first.files.map((item) => item.hash));
const names = reader.buildNameCandidates(extractsPath, targetHashes);
const session = reader.openArchive(archivePath, names);
const fd = fs.openSync(archivePath, 'r');
const raw = Buffer.alloc(session.header[15]);
fs.readSync(fd, raw, 0, raw.length, session.header[17]);
fs.closeSync(fd);
const table = reader.decodePairs(raw, session.key);

const rows = session.files.filter((file) => file.nameResolved).slice(0, 20).map((file) => {
  const basename = file.name.split('/').pop();
  const offset = file.stringOffset;
  const cipher = table.subarray(offset + 1, offset + 1 + basename.length);
  const plain = Buffer.from(basename, 'utf8');
  const mask = cipher.length >= 4 ? (cipher.readUInt32LE(0) ^ plain.readUInt32LE(0)) >>> 0 : 0;
  const recoveredStringKey = cipher.length >= 4 ? reader.keyFromFirstMask(mask) : 0;
  const fileHash = BigInt(`0x${file.hash}`);
  return {
    id: file.id,
    offset,
    name: file.name,
    basename,
    fileHash: file.hash,
    recoveredStringKey: recoveredStringKey.toString(16).padStart(8, '0'),
    keyXorHashLow: (recoveredStringKey ^ Number(fileHash & 0xffffffffn)).toString(16).padStart(8, '0'),
    keyXorHashHigh: (recoveredStringKey ^ Number((fileHash >> 32n) & 0xffffffffn)).toString(16).padStart(8, '0'),
    keyXorOffset: (recoveredStringKey ^ offset).toString(16).padStart(8, '0'),
    prefix: [...table.subarray(offset, Math.min(table.length, offset + 2 + basename.length))],
    hex: table.subarray(offset, Math.min(table.length, offset + 2 + basename.length)).toString('hex')
  };
});
console.log(JSON.stringify({ tableSize: table.length, resolved: session.files.filter((f) => f.nameResolved).length, rows }, null, 2));
