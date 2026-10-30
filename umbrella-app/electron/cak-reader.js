'use strict';

const fs = require('fs');
const path = require('path');

const KNOWN_KEYS = Object.freeze({
  'bakedfile00.cak': 0xff7bf7bf, 'bakedfile01.cak': 0xf6e2c825,
  'bakedfile02.cak': 0xf9728728, 'bakedfile03.cak': 0xff049eb2,
  'bakedfile50.cak': 0xf2089e83, 'bakedfile51.cak': 0xf2926925,
  'bakedfile52.cak': 0xf638207c, 'bakedfile56.cak': 0xf790c507,
  'bakedfile57.cak': 0xfbbe93ee, 'bakedfile58.cak': 0xf5b5db57,
  'bakedfile60.cak': 0xf03b63b9, 'bakedfile100.cak': 0xfeae10db
});

const u32 = (value) => value >>> 0;
const rol32 = (value, shift) => u32((value << (shift & 31)) | (value >>> (32 - (shift & 31))));
const ror32 = (value, shift) => u32((value >>> (shift & 31)) | (value << (32 - (shift & 31))));
const imul = (a, b) => u32(Math.imul(a, b));

function inverseOdd32(value) {
  let inverse = value >>> 0;
  for (let index = 0; index < 5; index += 1) inverse = imul(inverse, u32(2 - imul(value, inverse)));
  return inverse >>> 0;
}

const INV_85EBCA6B = inverseOdd32(0x85ebca6b);
const INV_C2B2AE35 = inverseOdd32(0xc2b2ae35);

function undoXorRight(value, shift) {
  let result = value >>> 0;
  for (let width = shift; width < 32; width += shift) result = u32(result ^ (value >>> width));
  return result;
}

function firstMask(key) {
  let mixed = u32(key ^ 0xa3c59ac3);
  mixed = imul(mixed, 0x85ebca6b);
  mixed = rol32(mixed, 7);
  mixed = u32(mixed ^ (mixed >>> 16));
  let mask = imul(mixed, 0xc2b2ae35);
  return u32(mask ^ (mask >>> 13));
}

function keyFromFirstMask(mask) {
  let mixed = undoXorRight(mask, 13);
  mixed = imul(mixed, INV_C2B2AE35);
  mixed = undoXorRight(mixed, 16);
  mixed = ror32(mixed, 7);
  mixed = imul(mixed, INV_85EBCA6B);
  return u32(mixed ^ 0xa3c59ac3);
}

function decodePairs(input, initialKey) {
  const output = Buffer.alloc(input.length);
  let cursor = 0;
  let key = u32(initialKey);
  let counterA = 0;
  let firstState = 0;
  let stateB = 0;
  let previousFirst = 0;
  const pairs = Math.floor(input.length / 8);
  for (let block = 0; block < pairs; block += 1) {
    key = u32(key ^ stateB);
    if (firstState !== 0) {
      stateB = u32(stateB + 0xc2b2ae35);
      key = u32(key ^ firstState);
      key = u32(rol32(key, 11) + 0x165667b1);
    }
    let mixed = u32(key ^ counterA ^ 0xa3c59ac3);
    mixed = imul(mixed, 0x85ebca6b);
    mixed = rol32(mixed, 7);
    mixed = u32(mixed ^ (mixed >>> 16));
    let mask = imul(mixed, 0xc2b2ae35);
    mask = u32(mask ^ (mask >>> 13));
    const cipherFirst = input.readUInt32LE(cursor);
    output.writeUInt32LE(u32(cipherFirst ^ mask), cursor);
    cursor += 4;
    firstState = u32(cipherFirst ^ previousFirst);
    if (key !== 0) {
      firstState = u32(firstState ^ key);
      firstState = u32(rol32(firstState, 7) - 0x7a143595);
      previousFirst = u32(previousFirst + 0x9e3779b9);
    }
    mixed = u32((counterA - 0x61c88647) ^ firstState ^ 0x1b873593);
    counterA = u32(counterA + 0x3c6ef372);
    mixed = imul(mixed, 0x85ebca6b);
    mixed = rol32(mixed, 7);
    mixed = u32(mixed ^ (mixed >>> 16));
    mask = imul(mixed, 0xc2b2ae35);
    mask = u32(mask ^ (mask >>> 13));
    const cipherSecond = input.readUInt32LE(cursor);
    key = cipherSecond;
    output.writeUInt32LE(u32(cipherSecond ^ mask), cursor);
    cursor += 4;
  }
  const tailBase = input.length & ~7;
  for (let tailIndex = 0; tailIndex < (input.length & 7); tailIndex += 1) {
    const absoluteIndex = u32(tailBase + tailIndex);
    const indexMix = u32(imul(absoluteIndex, 0x27d4eb2d) + 0x7f4a7c15);
    stateB = u32(stateB ^ key);
    let rotation = u32(firstState ^ key) & 0xf;
    if (tailIndex === 0) rotation = 11;
    firstState = u32(firstState ^ stateB);
    firstState = rol32(firstState, rotation);
    firstState = u32(firstState - (tailIndex === 0 ? 0xe9a9984f : 0x7a143595));
    let mixed = u32(firstState ^ indexMix);
    mixed = u32(mixed ^ (mixed >>> 15));
    const mask = imul(mixed, 0x85ebca6b);
    const cipherByte = input[tailBase + tailIndex];
    key = cipherByte;
    output[tailBase + tailIndex] = cipherByte ^ (mask & 0xff) ^ ((mask >>> 13) & 0xff);
    stateB = imul(absoluteIndex, 0x9e3779b9);
  }
  return output;
}

function decodeStringTable(input) {
  const output = Buffer.from(input);
  const u64 = (value) => BigInt.asUintN(64, value);
  const rol64 = (value, shiftValue) => {
    const shift = BigInt(shiftValue & 63);
    return shift === 0n ? u64(value) : u64((u64(value) << shift) | (u64(value) >> (64n - shift)));
  };
  let cursor = 0;
  while (cursor < output.length) {
    const recordOffset = cursor;
    const length = output[cursor];
    cursor += 1;
    if (cursor + length >= output.length) throw new Error('The CAK string table contains an invalid name length.');
    const recordPosition = BigInt(recordOffset);
    for (let index = 0; index < length; index += 1) {
      let state = u64(BigInt(index) * -0x61c8864680b583ebn);
      state = u64(state ^ u64((recordPosition << 32n) ^ recordPosition));
      let mask = u64((state ^ (state >> 33n)) * 0xc2b2ae3d27d4eb4fn);
      mask = rol64(mask, index);
      mask = u64((mask ^ (mask >> 29n)) * 0x165667b19e3779f9n);
      mask = u64(mask ^ (mask >> 32n));
      const shifted = (output[cursor] - Number((mask >> 24n) & 0xffn)) & 0xff;
      output[cursor] = shifted ^ Number(mask & 0xffn);
      cursor += 1;
    }
    if (output[cursor] !== 0) throw new Error('The CAK string table contains an unterminated name record.');
    cursor += 1;
  }
  return output;
}

function readStringRecord(table, offset) {
  if (!Number.isInteger(offset) || offset < 0 || offset >= table.length) return '';
  const length = table[offset];
  const end = offset + 1 + length;
  if (end >= table.length || table[end] !== 0) return '';
  const value = table.subarray(offset + 1, end).toString('utf8');
  return value.includes('\0') ? '' : value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function readAt(fd, offset, size) {
  const buffer = Buffer.alloc(size);
  const count = fs.readSync(fd, buffer, 0, size, Number(offset));
  if (count !== size) throw new Error('The archive ended before the requested catalog data was read.');
  return buffer;
}

function headerLooksValid(words, archiveSize) {
  if (words.length !== 21 || words[0] > 2000000 || words[1] > 1000000) return false;
  const sizes = [words[3], words[6], words[9], words[12], words[15]];
  const offsets = [words[5], words[8], words[11], words[14], words[17]];
  if (words[3] !== words[1] * 12 || words[6] !== words[0] * 12) return false;
  for (let index = 0; index < 4; index += 1) if (offsets[index] + sizes[index] !== offsets[index + 1]) return false;
  return offsets[0] >= 92 && offsets[4] + sizes[4] <= archiveSize && words[20] <= archiveSize;
}

function decodeHeader(raw, key) {
  const decoded = decodePairs(raw, key);
  return Array.from({ length: 21 }, (_, index) => decoded.readUInt32LE(index * 4));
}

function recoverKey(rawHeader, archiveSize) {
  const cipher = rawHeader.readUInt32LE(0);
  for (let count = 0; count <= 2000000; count += 1) {
    const key = keyFromFirstMask(u32(cipher ^ count));
    const words = decodeHeader(rawHeader, key);
    if (words[0] === count && headerLooksValid(words, archiveSize)) return { key, words, recovered: true };
  }
  throw new Error('Aurora Forge could not recognize this CAK catalog version.');
}

function parseHashes(buffer, expected) {
  if (buffer.length !== expected * 12) throw new Error('A CAK hash table has an unexpected size.');
  return Array.from({ length: expected }, (_, index) => ({
    hash: buffer.readBigUInt64LE(index * 12).toString(16).padStart(16, '0'),
    index: buffer.readInt32LE(index * 12 + 8)
  }));
}

function parseFiles(buffer, expected, stringSize, folderCount, archiveSize, payloadStart) {
  const files = [];
  let cursor = 0;
  while (files.length < expected) {
    if (cursor + 34 > buffer.length) throw new Error('The CAK file table ended early.');
    const chunkCount = buffer.readUInt16LE(cursor + 28);
    const recordSize = 34 + chunkCount * 5;
    if (cursor + recordSize > buffer.length) throw new Error('A CAK file record is incomplete.');
    const offset = buffer.readBigUInt64LE(cursor + 16);
    const storedSize = buffer.readUInt32LE(cursor + 8);
    const expandedSize = buffer.readUInt32LE(cursor + 24);
    const folderIndex = buffer.readUInt32LE(cursor + 4);
    const stringOffset = buffer.readUInt32LE(cursor);
    const payloadEnd = offset + BigInt(storedSize);
    const payloadInsideArchive = offset >= BigInt(payloadStart) && payloadEnd <= BigInt(archiveSize);
    // Current WWE 2K26 update archives can keep a valid catalog record for a
    // payload supplied outside this physical CAK. Preserve it as unavailable
    // instead of rejecting the complete archive. Extraction remains disabled
    // until a matching physical payload source is known.
    const zeroOffsetReference = offset === 0n;
    const externalPayload = offset >= BigInt(payloadStart) && payloadEnd > BigInt(archiveSize);
    const externalCatalogEntry = zeroOffsetReference || externalPayload;
    if (stringOffset >= stringSize || folderIndex >= Math.max(1, folderCount) || (!payloadInsideArchive && !externalCatalogEntry)) {
      throw new Error(`A CAK file record contains an unsafe offset or size (record ${files.length}, offset ${offset}, stored ${storedSize}, expanded ${expandedSize}, archive ${archiveSize}).`);
    }
    const chunks = [];
    for (let index = 0; index < chunkCount; index += 1) chunks.push({ end: buffer.readUInt32LE(cursor + 34 + index * 4), flag: buffer[cursor + 34 + chunkCount * 4 + index] });
    const typeBytes = buffer.subarray(cursor + 12, cursor + 16);
    const type = [...typeBytes].every((value) => value === 0 || (value >= 32 && value <= 126)) ? typeBytes.toString('ascii').replace(/\0/g, '').trim().toLowerCase() : '';
    files.push({ id: files.length, stringOffset, folderIndex, storedSize, expandedSize, offset: offset.toString(), type, chunkCount, chunks, compressed: buffer[cursor + 30] === 1, protected: buffer[cursor + 31] === 1, flags: [...buffer.subarray(cursor + 30, cursor + 34)], extractable: payloadInsideArchive, externalPayload });
    cursor += recordSize;
  }
  return { files, bytesRead: cursor, trailingBytes: buffer.length - cursor };
}

function parseFolders(buffer, expected) {
  const folders = [];
  let cursor = 0;
  for (let id = 0; id < expected; id += 1) {
    if (cursor + 20 > buffer.length) throw new Error('The CAK folder table ended early.');
    const unknown = buffer.readBigUInt64LE(cursor).toString();
    const stringOffset = buffer.readUInt32LE(cursor + 8);
    const childCount = buffer.readUInt32LE(cursor + 12);
    const fileCount = buffer.readUInt32LE(cursor + 16);
    const size = 20 + (childCount + fileCount) * 4;
    if (cursor + size > buffer.length || childCount > expected) throw new Error('A CAK folder record is incomplete.');
    const children = Array.from({ length: childCount }, (_, index) => buffer.readInt32LE(cursor + 20 + index * 4));
    const files = Array.from({ length: fileCount }, (_, index) => buffer.readInt32LE(cursor + 20 + childCount * 4 + index * 4));
    folders.push({ id, unknown, stringOffset, children, files });
    cursor += size;
  }
  return { folders, bytesRead: cursor, trailingBytes: buffer.length - cursor };
}

function extensionFor(file) {
  if (/^[a-z0-9_]{2,8}$/i.test(file.type)) return '.' + file.type.toLowerCase();
  return '.bin';
}

function safeGeneratedName(file) {
  return `file_${String(file.id).padStart(6, '0')}_${file.hash || 'nohash'}${extensionFor(file)}`;
}

function safeGeneratedFolder(file, folders) {
  const folder = folders[file.folderIndex];
  return `folder_${String(file.folderIndex).padStart(6, '0')}_${folder && folder.hash || 'nohash'}`;
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const char of String(value)) {
    hash ^= BigInt(char.charCodeAt(0) & 0xff);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

function hashVerifiedPath(value, expectedHash) {
  return Boolean(value && expectedHash && expectedHash !== '0000000000000000' && fnv1a64(value.toLowerCase()) === expectedHash);
}

function extractionPath(value) {
  let result = String(value || '').replace(/\\/g, '/');
  if (/\.tex$/i.test(result)) result = result.slice(0, -4) + '.dds';
  if (/^Root\//i.test(result)) result = result.slice(result.indexOf('/') + 1);
  return result;
}

function buildNameCandidates(root, targetHashes) {
  const matches = {};
  const stack = [root];
  const variantsFor = (relative, includeBasename = false) => {
    const normalized = String(relative || '').replace(/\\/g, '/').replace(/^\.\//, '');
    const variants = new Set([normalized, normalized.toLowerCase()]);
    // Some full-game extraction tools place every real game path beneath a
    // single "Root" directory. Hash both forms so users can select either the
    // extraction's parent folder or Root itself without changing their files.
    if (/^root\//i.test(normalized)) {
      const withoutRoot = normalized.slice(normalized.indexOf('/') + 1);
      if (withoutRoot) {
        variants.add(withoutRoot);
        variants.add(withoutRoot.toLowerCase());
      }
    }
    if (includeBasename) {
      const basename = path.posix.basename(normalized);
      variants.add(basename);
      variants.add(basename.toLowerCase());
    }
    return variants;
  };
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        const relative = path.relative(root, full);
        const variants = variantsFor(relative);
        for (const candidate of variants) {
          const hash = fnv1a64(candidate);
          if (targetHashes.has(hash) && !matches[hash]) matches[hash] = candidate.replace(/\\/g, '/');
        }
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const relative = path.relative(root, full);
      const variants = variantsFor(relative, true);
      for (const candidate of variants) {
        const hash = fnv1a64(candidate);
        if (targetHashes.has(hash) && !matches[hash]) matches[hash] = candidate.replace(/\\/g, '/');
      }
    }
  }
  return matches;
}

function openArchive(archivePath, dictionary = {}) {
  const resolved = path.resolve(archivePath);
  if (path.extname(resolved).toLowerCase() !== '.cak' || !fs.statSync(resolved).isFile()) throw new Error('Choose one readable .cak archive.');
  const archiveSize = fs.statSync(resolved).size;
  if (archiveSize < 92) throw new Error('This CAK file is too small to contain a valid catalog.');
  const fd = fs.openSync(resolved, 'r');
  try {
    const prefix = readAt(fd, 0, 92);
    const magic = prefix.subarray(0, 4).toString('ascii').replace(/\0/g, '');
    const rawHeader = prefix.subarray(8, 92);
    const known = KNOWN_KEYS[path.basename(resolved).toLowerCase()];
    let keyResult;
    if (known !== undefined) {
      const words = decodeHeader(rawHeader, known);
      keyResult = headerLooksValid(words, archiveSize) ? { key: known, words, recovered: false } : recoverKey(rawHeader, archiveSize);
    } else keyResult = recoverKey(rawHeader, archiveSize);
    const w = keyResult.words;
    const readDecoded = (offset, size) => decodePairs(readAt(fd, offset, size), keyResult.key);
    const folderHashes = parseHashes(readDecoded(w[5], w[3]), w[1]);
    const fileHashes = parseHashes(readDecoded(w[8], w[6]), w[0]);
    const fileTable = parseFiles(readDecoded(w[11], w[9]), w[0], w[15], w[1], archiveSize, w[20]);
    const folderTable = parseFolders(readDecoded(w[14], w[12]), w[1]);
    const stringTable = decodeStringTable(readDecoded(w[17], w[15]));
    for (const item of fileHashes) if (item.index >= 0 && item.index < fileTable.files.length) fileTable.files[item.index].hash = item.hash;
    for (const item of folderHashes) if (item.index >= 0 && item.index < folderTable.folders.length) folderTable.folders[item.index].hash = item.hash;
    for (const folder of folderTable.folders) {
      folder.nativeName = readStringRecord(stringTable, folder.stringOffset);
      folder.nativeNameVerified = hashVerifiedPath(folder.nativeName, folder.hash);
      const knownName = dictionary[folder.hash];
      const selectedName = folder.nativeNameVerified ? folder.nativeName : knownName;
      folder.name = selectedName && !path.isAbsolute(selectedName) && !selectedName.split(/[\\/]/).includes('..') ? selectedName.replace(/\\/g, '/') : '';
      folder.nameResolved = Boolean(folder.name);
    }
    for (const file of fileTable.files) {
      file.nativeLeaf = readStringRecord(stringTable, file.stringOffset);
      const nativeFolder = folderTable.folders[file.folderIndex] && folderTable.folders[file.folderIndex].name || '';
      file.nativeName = [nativeFolder, file.nativeLeaf].filter(Boolean).join('/');
      file.nativeNameVerified = hashVerifiedPath(file.nativeName, file.hash);
      const knownName = dictionary[file.hash];
      const selectedName = file.nativeNameVerified ? extractionPath(file.nativeName) : knownName;
      file.name = selectedName && !path.isAbsolute(selectedName) && !selectedName.split(/[\\/]/).includes('..') ? selectedName.replace(/\\/g, '/') : `Unresolved/${path.basename(resolved, path.extname(resolved))}/${safeGeneratedFolder(file, folderTable.folders)}/${safeGeneratedName(file)}`;
      file.nameResolved = Boolean(selectedName);
      file.folderName = folderTable.folders[file.folderIndex] && folderTable.folders[file.folderIndex].name || (selectedName ? path.posix.dirname(extractionPath(selectedName)) : '');
      file.availability = file.extractable ? (file.nameResolved ? 'ready' : 'raw-hash') : (file.externalPayload ? 'external-payload' : 'external-reference');
    }
    return {
      archivePath: resolved, archiveName: path.basename(resolved), archiveSize, magic, key: keyResult.key,
      keyRecovered: keyResult.recovered, payloadStart: w[20], header: w, files: fileTable.files,
      folders: folderTable.folders, fileHashes, folderHashes,
      warnings: [fileTable.trailingBytes ? `${fileTable.trailingBytes} unused file-table bytes were preserved.` : '', folderTable.trailingBytes ? `${folderTable.trailingBytes} unused folder-table bytes were preserved.` : '', fileTable.files.some((file) => file.externalPayload) ? 'This archive lists payloads outside its local byte range. They need matching exact-size files from a separately extracted companion folder.' : ''].filter(Boolean)
    };
  } finally { fs.closeSync(fd); }
}

function buildNativeDictionary(archivePaths) {
  const dictionary = {};
  for (const archivePath of archivePaths) {
    const session = openArchive(archivePath, {});
    for (const folder of session.folders) if (folder.nativeNameVerified) dictionary[folder.hash] = folder.nativeName;
    for (const file of session.files) if (file.nativeNameVerified) dictionary[file.hash] = extractionPath(file.nativeName);
  }
  return dictionary;
}

function publicSummary(session) {
  const payloadFiles = session.files.filter((file) => file.extractable || file.externalPayload);
  const totalExpanded = payloadFiles.reduce((sum, file) => sum + file.expandedSize, 0);
  const resolvedNames = payloadFiles.filter((file) => file.nameResolved).length;
  const resolvedFolders = session.folders.filter((folder) => folder.nameResolved).length;
  const readyFiles = session.files.filter((file) => file.nameResolved && file.extractable).length;
  const rawHashPayloads = session.files.filter((file) => !file.nameResolved && file.extractable).length;
  const externalReferences = session.files.filter((file) => !file.extractable && !file.externalPayload).length;
  const externalPayloads = session.files.filter((file) => file.externalPayload).length;
  return { archiveName: session.archiveName, archivePath: session.archivePath, archiveSize: session.archiveSize, fileCount: payloadFiles.length, catalogEntryCount: session.files.length, folderCount: session.folders.length, totalExpanded, resolvedNames, unresolvedNames: payloadFiles.length - resolvedNames, resolvedFolders, readyFiles, rawHashPayloads, externalReferences, externalPayloads, keyRecovered: session.keyRecovered, warnings: session.warnings };
}

function searchFiles(session, options = {}) {
  const query = String(options.query || '').trim().toLowerCase();
  const type = String(options.type || '').trim().toLowerCase();
  const scope = ['resolved', 'unresolved', 'all'].includes(options.scope) ? options.scope : 'resolved';
  const pageSize = Math.min(250, Math.max(10, Number(options.pageSize) || 100));
  const page = Math.max(0, Number(options.page) || 0);
  const filtered = session.files.filter((file) => (file.extractable || file.externalPayload) && (scope === 'all' || (scope === 'resolved' ? file.nameResolved : !file.nameResolved)) && (!query || file.name.toLowerCase().includes(query) || String(file.hash || '').includes(query) || file.type.includes(query)) && (!type || file.type === type));
  const items = filtered.slice(page * pageSize, (page + 1) * pageSize).map(({ chunks, flags, ...file }) => file);
  const selectable = filtered.filter((file) => (file.extractable || file.externalPayload) && file.nameResolved);
  const result = { items, total: filtered.length, selectableTotal: selectable.length, page, pageSize, pages: Math.max(1, Math.ceil(filtered.length / pageSize)), types: [...new Set(session.files.map((file) => file.type).filter(Boolean))].sort() };
  if (options.includeSelectableIds === true) result.selectableIds = selectable.map((file) => file.id);
  return result;
}

module.exports = { openArchive, publicSummary, searchFiles, buildNameCandidates, buildNativeDictionary, fnv1a64, decodePairs, decodeStringTable, readStringRecord, keyFromFirstMask };
