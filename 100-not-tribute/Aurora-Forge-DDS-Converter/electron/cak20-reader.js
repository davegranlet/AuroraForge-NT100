'use strict';

const fs = require('fs');
const path = require('path');

const NON_OBFUSCATED_FLAG = 0x4000;

function u32(value) {
  return value >>> 0;
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const char of String(value)) {
    hash ^= BigInt(char.charCodeAt(0) & 0xff);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash;
}

function cakeNameKey(archiveName) {
  const hash = fnv1a64(String(archiveName || '').toLowerCase());
  return Number(((hash >> 32n) ^ hash) & 0xffffffffn) >>> 0;
}

function deobfuscateBlock(input, key) {
  const output = Buffer.alloc(input.length);
  let active = u32(key);
  let cursor = 0;
  while (cursor + 4 <= input.length) {
    const cipher = input.readUInt32LE(cursor);
    const plain = u32(cipher ^ active);
    output.writeUInt32LE(plain, cursor);
    active = cipher;
    cursor += 4;
  }
  while (cursor < input.length) {
    const cipher = input[cursor];
    const plain = cipher ^ (active & 0xff);
    output[cursor] = plain;
    active = cipher;
    cursor += 1;
  }
  return output;
}

function readAt(fd, offset, size) {
  const buffer = Buffer.alloc(size);
  const count = fs.readSync(fd, buffer, 0, size, Number(offset));
  if (count !== size) throw new Error('The CAK ended before the requested data could be read.');
  return buffer;
}

function readCString(buffer, offset) {
  if (offset >= buffer.length) return '';
  let end = offset;
  while (end < buffer.length && buffer[end] !== 0) end += 1;
  return buffer.subarray(offset, end).toString('utf8').replace(/\0/g, '');
}

function parseHashes(buffer, expected) {
  if (buffer.length !== expected * 12) throw new Error('A 2K20 CAK hash table has an unexpected size.');
  return Array.from({ length: expected }, (_, index) => ({
    hash: buffer.readBigUInt64LE(index * 12).toString(16).padStart(16, '0'),
    index: buffer.readInt32LE(index * 12 + 8)
  }));
}

function parseFolders(buffer, expected, strings) {
  const folders = [];
  let cursor = 0;
  for (let id = 0; id < expected; id += 1) {
    if (cursor + 20 > buffer.length) throw new Error('The 2K20 CAK folder table ended early.');
    const unknown = buffer.readBigUInt64LE(cursor).toString();
    const stringOffset = buffer.readUInt32LE(cursor + 8);
    const childCount = buffer.readUInt32LE(cursor + 12);
    const fileCount = buffer.readUInt32LE(cursor + 16);
    const recordSize = 20 + (childCount + fileCount) * 4;
    if (cursor + recordSize > buffer.length || childCount > expected) throw new Error('A 2K20 CAK folder record is incomplete.');
    const children = Array.from({ length: childCount }, (_, index) => buffer.readInt32LE(cursor + 20 + index * 4));
    const files = Array.from({ length: fileCount }, (_, index) => buffer.readInt32LE(cursor + 20 + childCount * 4 + index * 4));
    folders.push({ id, unknown, stringOffset, name: readCString(strings, stringOffset), children, files, hash: '' });
    cursor += recordSize;
  }
  return { folders, bytesRead: cursor, trailingBytes: buffer.length - cursor };
}

function parseFiles(buffer, expected, strings, folderCount, archiveSize, obfuscated) {
  const files = [];
  const recordSize = 28;
  if (buffer.length < expected * recordSize) throw new Error('The 2K20 CAK file table ended early.');
  for (let id = 0; id < expected; id += 1) {
    const cursor = id * recordSize;
    const stringOffset = buffer.readUInt32LE(cursor);
    const folderIndex = buffer.readUInt32LE(cursor + 4);
    const crc = buffer.readUInt32LE(cursor + 8);
    const storedSize = buffer.readUInt32LE(cursor + 12);
    const offset = buffer.readBigUInt64LE(cursor + 16);
    const type = buffer.subarray(cursor + 24, cursor + 28).toString('ascii').replace(/\0/g, '').trim();
    const extractable = offset > 0n && offset + BigInt(storedSize) <= BigInt(archiveSize);
    if (folderIndex >= Math.max(1, folderCount) || (!extractable && offset !== 0n)) {
      throw new Error('A 2K20 CAK file record contains an unsafe offset or size.');
    }
    files.push({
      id, stringOffset, folderIndex, crc, storedSize, expandedSize: storedSize,
      offset: offset.toString(), type, compressed: false, obfuscated,
      name: readCString(strings, stringOffset), hash: '', extractable
    });
  }
  return { files, bytesRead: expected * recordSize, trailingBytes: buffer.length - expected * recordSize };
}

function headerLooksValid(header, archiveSize) {
  if (header.magic !== 'FDIR' || header.filesCount > 2000000 || header.foldersCount > 1000000) return false;
  if (header.folderHashesSize !== header.foldersCount * 12) return false;
  if (header.fileHashesSize !== header.filesCount * 12) return false;
  if (header.filesSize !== header.filesCount * 28) return false;
  const sections = [
    ['folderHashesOffset', 'folderHashesSize'],
    ['fileHashesOffset', 'fileHashesSize'],
    ['filesOffset', 'filesSize'],
    ['foldersOffset', 'foldersSize'],
    ['stringsOffset', 'stringsSize']
  ];
  for (const [offsetKey, sizeKey] of sections) {
    const offset = header[offsetKey];
    const size = header[sizeKey];
    if (offset < 88 || offset > archiveSize || size > archiveSize || offset + size > archiveSize) return false;
  }
  for (let index = 0; index < sections.length - 1; index += 1) {
    const [offsetKey, sizeKey] = sections[index];
    const [nextOffsetKey] = sections[index + 1];
    if (header[offsetKey] + header[sizeKey] !== header[nextOffsetKey]) return false;
  }
  return header.payloadStart <= archiveSize || header.payloadStart === 0;
}

function parseHeader(prefix, archiveName, archiveSize) {
  if (prefix.length < 88) throw new Error('This CAK is too small to contain a 2K20 header.');
  const magic = prefix.subarray(0, 4).toString('ascii');
  const version = prefix.readUInt16LE(4);
  const flags = prefix.readUInt16LE(6);
  const key = cakeNameKey(archiveName);
  const raw = prefix.subarray(8, 88);
  const decoded = flags === NON_OBFUSCATED_FLAG ? raw : deobfuscateBlock(raw, key);
  const code = Array.from({ length: 20 }, (_, index) => decoded.readUInt32LE(index * 4));
  const header = {
    magic, version, flags, key, obfuscated: flags !== NON_OBFUSCATED_FLAG,
    bakeKey: code[0], foldersCount: code[1], filesCount: Math.floor(code[5] / 12),
    folderHashesSize: code[2], folderHashesCrc: code[3], folderHashesOffset: code[4],
    fileHashesSize: code[5], fileHashesCrc: code[6], fileHashesOffset: code[7],
    filesSize: code[8], filesCrc: code[9], filesOffset: code[10],
    foldersSize: code[11], foldersCrc: code[12], foldersOffset: code[13],
    stringsSize: code[14], stringsCrc: code[15], stringsOffset: code[16],
    reserved17: code[17], reserved18: code[18], payloadStart: code[19],
    code
  };
  if (!headerLooksValid(header, archiveSize)) throw new Error('Aurora Forge could not validate this WWE 2K20 CAK catalog.');
  return header;
}

function decodeSection(fd, header, offset, size) {
  const raw = readAt(fd, offset, size);
  return header.obfuscated ? deobfuscateBlock(raw, header.key) : raw;
}

function openArchive(archivePath) {
  const resolved = path.resolve(archivePath);
  if (path.extname(resolved).toLowerCase() !== '.cak' || !fs.statSync(resolved).isFile()) throw new Error('Choose one readable .cak archive.');
  const archiveSize = fs.statSync(resolved).size;
  const archiveName = path.basename(resolved);
  const fd = fs.openSync(resolved, 'r');
  try {
    const header = parseHeader(readAt(fd, 0, 88), archiveName, archiveSize);
    const folderHashes = parseHashes(decodeSection(fd, header, header.folderHashesOffset, header.folderHashesSize), header.foldersCount);
    const fileHashes = parseHashes(decodeSection(fd, header, header.fileHashesOffset, header.fileHashesSize), header.filesCount);
    const strings = decodeSection(fd, header, header.stringsOffset, header.stringsSize);
    const fileTable = parseFiles(decodeSection(fd, header, header.filesOffset, header.filesSize), header.filesCount, strings, header.foldersCount, archiveSize, header.obfuscated);
    const folderTable = parseFolders(decodeSection(fd, header, header.foldersOffset, header.foldersSize), header.foldersCount, strings);
    for (const item of fileHashes) if (item.index >= 0 && item.index < fileTable.files.length) fileTable.files[item.index].hash = item.hash;
    for (const item of folderHashes) if (item.index >= 0 && item.index < folderTable.folders.length) folderTable.folders[item.index].hash = item.hash;
    for (const file of fileTable.files) file.folderName = folderTable.folders[file.folderIndex] ? folderTable.folders[file.folderIndex].name : '';
    return {
      archivePath: resolved, archiveName, archiveSize, header,
      files: fileTable.files, folders: folderTable.folders, fileHashes, folderHashes,
      warnings: [
        fileTable.trailingBytes ? `${fileTable.trailingBytes} unused file-table bytes were preserved.` : '',
        folderTable.trailingBytes ? `${folderTable.trailingBytes} unused folder-table bytes were preserved.` : ''
      ].filter(Boolean)
    };
  } finally {
    fs.closeSync(fd);
  }
}

function expectedFirstWord(file) {
  const type = String(file.type || '');
  if (/^[\x20-\x7e]{4}$/.test(type)) {
    const buffer = Buffer.alloc(4);
    buffer.write(type, 0, 4, 'ascii');
    return { value: buffer.readUInt32LE(0), source: 'type' };
  }
  const normalized = String(file.name || '').replace(/\\/g, '/').toLowerCase();
  const ext = path.posix.extname(normalized);
  if (ext === '.pac') return { value: Buffer.from('HSPC').readUInt32LE(0), source: 'pac-magic' };
  if (ext === '.bdy') return { value: Buffer.from('HMD ').readUInt32LE(0), source: 'bdy-magic' };
  if (ext === '.idx' || ext === '.bin') return { value: 0, source: 'zero-prefix' };
  return null;
}

function extractFile(session, file) {
  const fd = fs.openSync(session.archivePath, 'r');
  try {
    const raw = readAt(fd, BigInt(file.offset), file.storedSize);
    if (!session.header.obfuscated) return raw;
    const expected = expectedFirstWord(file);
    if (!expected) throw new Error(`Aurora Forge cannot safely decode the first word for ${file.name || 'this 2K20 entry'} yet.`);
    const seed = u32(raw.readUInt32LE(0) ^ expected.value);
    const decoded = deobfuscateBlock(raw, seed);
    file.decodeSeedSource = expected.source;
    return decoded;
  } finally {
    fs.closeSync(fd);
  }
}

function publicSummary(session) {
  return {
    archiveName: session.archiveName,
    archivePath: session.archivePath,
    archiveSize: session.archiveSize,
    fileCount: session.files.length,
    folderCount: session.folders.length,
    obfuscated: session.header.obfuscated,
    key: session.header.key.toString(16).padStart(8, '0'),
    warnings: session.warnings
  };
}

module.exports = { openArchive, publicSummary, extractFile, deobfuscateBlock, cakeNameKey, expectedFirstWord };
