'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const { openArchive, fnv1a64 } = require('./cak-reader');
const { deriveArchiveKeyV99 } = require('./cak-v99-key');
const ROOT_HASH = 'd727c35cfb2bb5da';
const EMPTY_TEXTURE_DATABASE = Buffer.from('545f4442060000000000000038000000', 'hex');
const u32 = (v) => v >>> 0;
const rol32 = (v, s) => u32((v << (s & 31)) | (v >>> (32 - (s & 31))));
const imul = (a, b) => u32(Math.imul(a, b));

function encodePairs(input, initialKey) {
  const output = Buffer.alloc(input.length); let cursor = 0; let key = u32(initialKey);
  let counterA = 0; let firstState = 0; let stateB = 0; let previousFirst = 0;
  for (let block = 0; block < Math.floor(input.length / 8); block += 1) {
    key = u32(key ^ stateB);
    if (firstState !== 0) { stateB = u32(stateB + 0xc2b2ae35); key = u32(key ^ firstState); key = u32(rol32(key, 11) + 0x165667b1); }
    let mixed = u32(key ^ counterA ^ 0xa3c59ac3); mixed = imul(mixed, 0x85ebca6b); mixed = rol32(mixed, 7); mixed = u32(mixed ^ (mixed >>> 16));
    let mask = imul(mixed, 0xc2b2ae35); mask = u32(mask ^ (mask >>> 13));
    const cipherFirst = u32(input.readUInt32LE(cursor) ^ mask); output.writeUInt32LE(cipherFirst, cursor); cursor += 4;
    firstState = u32(cipherFirst ^ previousFirst);
    if (key !== 0) { firstState = u32(firstState ^ key); firstState = u32(rol32(firstState, 7) - 0x7a143595); previousFirst = u32(previousFirst + 0x9e3779b9); }
    mixed = u32((counterA - 0x61c88647) ^ firstState ^ 0x1b873593); counterA = u32(counterA + 0x3c6ef372);
    mixed = imul(mixed, 0x85ebca6b); mixed = rol32(mixed, 7); mixed = u32(mixed ^ (mixed >>> 16)); mask = imul(mixed, 0xc2b2ae35); mask = u32(mask ^ (mask >>> 13));
    const cipherSecond = u32(input.readUInt32LE(cursor) ^ mask); output.writeUInt32LE(cipherSecond, cursor); key = cipherSecond; cursor += 4;
  }
  const tailBase = input.length & ~7;
  for (let tailIndex = 0; tailIndex < (input.length & 7); tailIndex += 1) {
    const absoluteIndex = u32(tailBase + tailIndex); const indexMix = u32(imul(absoluteIndex, 0x27d4eb2d) + 0x7f4a7c15); stateB = u32(stateB ^ key);
    let rotation = u32(firstState ^ key) & 0xf; if (tailIndex === 0) rotation = 11;
    firstState = u32(firstState ^ stateB); firstState = rol32(firstState, rotation); firstState = u32(firstState - (tailIndex === 0 ? 0xe9a9984f : 0x7a143595));
    let mixed = u32(firstState ^ indexMix); mixed = u32(mixed ^ (mixed >>> 15)); const mask = imul(mixed, 0x85ebca6b);
    const cipherByte = input[tailBase + tailIndex] ^ (mask & 0xff) ^ ((mask >>> 13) & 0xff); output[tailBase + tailIndex] = cipherByte; key = cipherByte; stateB = imul(absoluteIndex, 0x9e3779b9);
  }
  return output;
}

function hash64(value) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt('0x' + value)); return b; }
function u64(value) { return BigInt.asUintN(64, value); }
function signed32(value) { return BigInt(BigInt.asIntN(32, BigInt(value >>> 0))); }
function byte32(value, index) { return (value >>> (index * 8)) & 0xff; }
function byte64(value, index) { return Number((u64(value) >> BigInt(index * 8)) & 0xffn); }
function fnvByte64(hash, value) {
  const signedByte = BigInt.asIntN(8, BigInt(value & 0xff));
  return u64((hash ^ u64(signedByte)) * 0x100000001b3n);
}
function crc32cWord(seed, value) {
  let crc = seed >>> 0;
  for (let byteIndex = 0; byteIndex < 4; byteIndex += 1) {
    crc = u32(crc ^ byte32(value, byteIndex));
    for (let bit = 0; bit < 8; bit += 1) crc = u32((crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0));
  }
  return crc;
}
function crc32cBuffer(input, seed = 0) {
  let crc = u32(~seed);
  for (const value of input) {
    crc = u32(crc ^ value);
    for (let bit = 0; bit < 8; bit += 1) crc = u32((crc >>> 1) ^ ((crc & 1) ? 0x82f63b78 : 0));
  }
  return u32(~crc);
}
function derivePayloadKey(archiveKey, storedSize, offsetValue) {
  const key = archiveKey >>> 0, size = storedSize >>> 0, offset = u64(BigInt(offsetValue));
  const mixedOffset = u64(~u64(u64(~BigInt(key)) ^ offset));
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < 4; index += 1) hash = fnvByte64(hash, byte32(key, index));
  const invertedSize = u32(~size);
  for (let index = 0; index < 4; index += 1) hash = fnvByte64(hash, byte32(invertedSize, index));
  for (let index = 0; index < 4; index += 1) hash = fnvByte64(hash, byte64(mixedOffset, index));
  let second = u64(u64(BigInt.asIntN(64, mixedOffset) >> 32n) ^ hash);
  for (let index = 0; index < 4; index += 1) second = fnvByte64(second, 0);
  const signedSize = u64(signed32(invertedSize));
  for (let index = 0; index < 4; index += 1) second = fnvByte64(second, byte64(signedSize, index));
  const signedKey = u64(signed32(key));
  for (let index = 0; index < 4; index += 1) second = fnvByte64(second, byte64(signedKey, index));
  const firstCrc = u64(signed32(crc32cWord(invertedSize, key)));
  for (let index = 0; index < 4; index += 1) second = fnvByte64(second, byte64(firstCrc, index));
  const secondCrc = u64(signed32(crc32cWord(Number(mixedOffset & 0xffffffffn), Number(BigInt.asIntN(64, mixedOffset) >> 32n))));
  for (let index = 0; index < 4; index += 1) second = fnvByte64(second, byte64(secondCrc, index));
  const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(second);
  let folded = u32((bytes[1] + (bytes[0] << 4)) << 4);
  folded = u32((folded + bytes[2]) << 4); folded = u32((folded + bytes[3]) << 4);
  folded = u32((folded + bytes[4]) << 4); folded = u32(folded + bytes[5]);
  let high = (folded >>> 24) & 0xf0; let next = u32(((folded ^ high) << 4) + bytes[6]);
  high = (next >>> 24) & 0xf0; const final = u32(((next ^ high) << 4) + bytes[7]);
  const finalHigh = (final >>> 24) & 0xf0;
  const low = u32((u32(~u32(finalHigh << 24)) & u32(final ^ finalHigh)) ^ Number(second & 0xffffffffn));
  return u32(Number((~(second >> 32n)) & 0xffffffffn) ^ low);
}
function rol8(value, count) { const shift = count & 7; return ((value << shift) | (value >>> ((8 - shift) & 7))) & 0xff; }
function ror8(value, count) { const shift = count & 7; return ((value >>> shift) | (value << ((8 - shift) & 7))) & 0xff; }
function protectPayload(input, key) {
  const output = Buffer.from(input), inverted = u32(~key);
  for (let index = 0; index < Math.min(256, output.length); index += 1) {
    const mask = (byte32(inverted, (index - 1) & 3) + 1 + index) & 0xff;
    output[index] = rol8(mask ^ ror8(output[index], (index - 1) & 7), ~(index + 1));
  }
  return output;
}
function recoverPayload(input, key) {
  const output = Buffer.from(input), inverted = u32(~key);
  for (let index = 0; index < Math.min(256, output.length); index += 1) {
    const rotated = ror8(output[index], ~(index + 1));
    const mask = (byte32(inverted, (index - 1) & 3) + 1 + index) & 0xff;
    output[index] = rol8(mask ^ rotated, (index - 1) & 7);
  }
  return output;
}
function scanBakeFolder(sourceRoot) {
  const root = path.resolve(sourceRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error('Choose a readable BakeMe folder first.');
  const manifestPath = path.join(root, '.aurora-cak-manifest.json');
  let preservedEntries = new Map();
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.schema !== 'aurora-forge-cak-extraction-manifest/v1' || !Array.isArray(manifest.entries)) throw new Error('The Aurora CAK extraction manifest is malformed or unsupported.');
    preservedEntries = new Map(manifest.entries.map((entry) => [String(entry.relativePath || '').replace(/\\/g, '/').toLowerCase(), entry]));
  }
  const folders = [{ relative: '', leaf: '', parent: -1, children: [], files: [], hash: ROOT_HASH }]; const files = [];
  const walk = (full, folderId) => {
    for (const entry of fs.readdirSync(full, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue; const target = path.join(full, entry.name); const relative = path.relative(root, target).replace(/\\/g, '/');
      if (!relative || relative.split('/').includes('..')) throw new Error('A BakeMe entry escapes the selected folder.');
      if (entry.isDirectory()) { const id = folders.length; folders.push({ relative, leaf: entry.name, parent: folderId, children: [], files: [], hash: fnv1a64(relative.toLowerCase()) }); folders[folderId].children.push(id); walk(target, id); }
      else if (entry.isFile()) {
        if (relative.toLowerCase() === '.aurora-cak-manifest.json' || relative.toLowerCase() === 'aurora_forge_extraction_report.txt') continue;
        const size = fs.statSync(target).size; if (size > 0xffffffff) throw new Error(`${relative} exceeds the 4 GB per-file CAK limit.`);
        const preserved = preservedEntries.get(relative.toLowerCase());
        const validHash = (value) => /^[0-9a-f]{16}$/i.test(String(value || ''));
        if (preserved && !validHash(preserved.fileHash)) throw new Error(`The extraction manifest has an invalid file hash for ${relative}.`);
        if (preserved && preserved.folderHash && !validHash(preserved.folderHash)) throw new Error(`The extraction manifest has an invalid folder hash for ${relative}.`);
        if (preserved && preserved.folderHash) {
          const normalizedFolderHash = preserved.folderHash.toLowerCase();
          if (folders[folderId].preservedHash && folders[folderId].preservedHash !== normalizedFolderHash) throw new Error(`The extraction manifest maps one output folder to multiple original folder hashes: ${folders[folderId].relative}.`);
          folders[folderId].hash = normalizedFolderHash; folders[folderId].preservedHash = normalizedFolderHash;
        }
        const id = files.length;
        files.push({ id, full: target, relative, leaf: entry.name, folderId, size, hash: preserved ? preserved.fileHash.toLowerCase() : fnv1a64(relative.toLowerCase()), preservedIdentity: Boolean(preserved) });
        folders[folderId].files.push(id);
      }
    }
  };
  walk(root, 0); if (!files.length) throw new Error('The selected BakeMe folder contains no files.');
  const suppliedTextureDatabase = files.some((file) => file.relative.toLowerCase() === '_textures.tdb');
  if (!suppliedTextureDatabase) {
    files.forEach((file) => { file.id += 1; });
    folders.forEach((folder) => { folder.files = folder.files.map((id) => id + 1); });
    files.unshift({ id: 0, full: '', relative: '_textures.tdb', leaf: '_textures.tdb', folderId: 0, size: EMPTY_TEXTURE_DATABASE.length, hash: fnv1a64('_textures.tdb'), synthetic: true, content: EMPTY_TEXTURE_DATABASE });
    folders[0].files.unshift(0);
  }
  return { root, folders, files, suppliedTextureDatabase };
}
function prepareScanPayloads(scan, options = {}) {
  for (const file of scan.files) {
    file.expandedSize = file.size;
    file.storedSize = file.size;
    file.compressed = false;
    file.storedContent = file.synthetic ? Buffer.from(file.content) : null;
  }
  if (!options.oodlePath || !options.helperPath) return scan;
  if (!fs.existsSync(options.oodlePath) || !fs.existsSync(options.helperPath)) throw new Error('WWE 2K26 Oodle compression was requested, but the game library or Aurora helper is missing.');
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-cak-compress-'));
  try {
    for (const file of scan.files) {
      if (file.synthetic || file.size < 64) continue;
      const outputPath = path.join(temporaryRoot, `${file.id}.oodle`);
      const requestPath = path.join(temporaryRoot, `${file.id}.json`);
      fs.writeFileSync(requestPath, JSON.stringify({ action: 'compress', inputPath: file.full, outputPath, oodlePath: options.oodlePath }), 'utf8');
      const run = cp.spawnSync(options.helperPath, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
      if (run.error || run.status !== 0) throw new Error(`Oodle compression failed for ${file.relative}: ${String(run.stderr || run.stdout || run.error && run.error.message || '').trim()}`);
      const report = JSON.parse(String(run.stdout || '').trim());
      if (!report.Ok || !report.RoundTripVerified) throw new Error(`Oodle round-trip verification failed for ${file.relative}.`);
      const compressed = fs.readFileSync(outputPath);
      if (compressed.length < file.size) {
        file.storedContent = compressed;
        file.storedSize = compressed.length;
        file.compressed = true;
      }
    }
  } finally { fs.rmSync(temporaryRoot, { recursive: true, force: true }); }
  return scan;
}
function stringRecord(value) { const b = Buffer.from(value, 'utf8'); if (b.length > 255) throw new Error(`CAK entry name is too long: ${value}`); return Buffer.concat([Buffer.from([b.length]), b, Buffer.from([0])]); }
function encodeStringTable(input) {
  const output = Buffer.from(input);
  const u64 = (value) => BigInt.asUintN(64, value);
  const rol64 = (value, shiftValue) => {
    const shift = BigInt(shiftValue & 63);
    return shift === 0n ? u64(value) : u64((u64(value) << shift) | (u64(value) >> (64n - shift)));
  };
  let cursor = 1;
  let processed = 0;
  // The archive format leaves the final separator byte outside this pass.
  while (cursor + 1 < output.length) {
    cursor += 1; // The separator preceding this name is stored unchanged.
    const length = output[cursor];
    cursor += 1;
    if (cursor + length > output.length) throw new Error('The CAK string table contains an invalid name length.');
    const recordPosition = BigInt(processed + 2);
    for (let index = 0; index < length; index += 1) {
      let state = u64(BigInt(index) * -0x61c8864680b583ebn);
      state = u64(state ^ u64((recordPosition << 32n) ^ recordPosition));
      let mask = u64((state ^ (state >> 33n)) * 0xc2b2ae3d27d4eb4fn);
      mask = rol64(mask, index);
      mask = u64((mask ^ (mask >> 29n)) * 0x165667b19e3779f9n);
      mask = u64(mask ^ (mask >> 32n));
      output[cursor] = (((Number(mask & 0xffn) ^ output[cursor]) + Number((mask >> 24n) & 0xffn)) & 0xff);
      cursor += 1;
    }
    processed += 2 + length;
  }
  return output;
}
function fourCc(name) { const ext = path.extname(name).slice(1).toLowerCase(); const known = { mcd: 'MCD!', ycl: 'YCL!', tex: 'TEX!', dds: 'TEX!', mtls: 'MTLS', jsfb: 'JSFB', jmtl: 'JSFB' }; return (known[ext] || (ext.length === 4 ? ext.toUpperCase() : '')).padEnd(4, '\0').slice(0, 4); }
function hashTable(items) {
  return Buffer.concat(items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const a = BigInt('0x' + left.item.hash), b = BigInt('0x' + right.item.hash);
      return a < b ? -1 : a > b ? 1 : left.index - right.index;
    })
    .map(({ item, index }) => { const b = Buffer.alloc(12); hash64(item.hash).copy(b); b.writeInt32LE(index, 8); return b; }));
}

function buildCatalog(scan, key) {
  const stringParts = [Buffer.from([0, 0])]; let stringOffset = 2;
  for (const folder of scan.folders) { folder.stringOffset = stringOffset; const part = stringRecord(folder.leaf); stringParts.push(part); stringOffset += part.length; }
  for (const file of scan.files) { file.stringOffset = stringOffset; const part = stringRecord(file.leaf); stringParts.push(part); stringOffset += part.length; }
  const strings = Buffer.concat(stringParts), encodedStrings = encodeStringTable(strings), folderHashes = hashTable(scan.folders), fileHashes = hashTable(scan.files);
  const folderTable = Buffer.concat(scan.folders.map((folder) => { const b = Buffer.alloc(20 + (folder.children.length + folder.files.length) * 4); hash64(folder.hash).copy(b); b.writeUInt32LE(folder.stringOffset, 8); b.writeUInt32LE(folder.children.length, 12); b.writeUInt32LE(folder.files.length, 16); folder.children.forEach((id, i) => b.writeInt32LE(id, 20 + i * 4)); folder.files.forEach((id, i) => b.writeInt32LE(id, 20 + folder.children.length * 4 + i * 4)); return b; }));
  const folderHashOffset = 92, fileHashOffset = folderHashOffset + folderHashes.length, fileTableOffset = fileHashOffset + fileHashes.length;
  const fileTableSize = scan.files.length * 39, folderTableOffset = fileTableOffset + fileTableSize, stringTableOffset = folderTableOffset + folderTable.length, payloadStart = stringTableOffset + strings.length;
  let payloadOffset = payloadStart;
  const fileTable = Buffer.concat(scan.files.map((file) => { const b = Buffer.alloc(39); b.writeUInt32LE(file.stringOffset, 0); b.writeUInt32LE(file.folderId, 4); b.writeUInt32LE(file.storedSize, 8); b.write(fourCc(file.leaf), 12, 4, 'ascii'); b.writeBigUInt64LE(BigInt(payloadOffset), 16); b.writeUInt32LE(file.expandedSize, 24); b.writeUInt16LE(1, 28); b[30] = file.compressed ? 1 : 0; b[31] = 1; b[33] = 4; b.writeUInt32LE(file.storedSize, 34); file.offset = payloadOffset; payloadOffset += file.storedSize; return b; }));
  const words = [scan.files.length, scan.folders.length, scan.files.length, folderHashes.length, crc32cBuffer(folderHashes), folderHashOffset, fileHashes.length, crc32cBuffer(fileHashes), fileHashOffset, fileTable.length, crc32cBuffer(fileTable), fileTableOffset, folderTable.length, crc32cBuffer(folderTable), folderTableOffset, strings.length, crc32cBuffer(encodedStrings), stringTableOffset, 0, 0, payloadStart];
  const header = Buffer.alloc(84); words.forEach((word, i) => header.writeUInt32LE(word >>> 0, i * 4));
  return { prefix: Buffer.concat([Buffer.from('FDIR'), Buffer.from([9, 9, 0, 0x81]), encodePairs(header, key)]), sections: [folderHashes, fileHashes, fileTable, folderTable, encodedStrings].map((b) => encodePairs(b, key)) };
}
function writeAll(fd, b) { let o = 0; while (o < b.length) o += fs.writeSync(fd, b, o, b.length - o); }
function buildCak(sourceRoot, outputPath, options = {}) {
  const scan = prepareScanPayloads(scanBakeFolder(sourceRoot), options), output = path.resolve(outputPath);
  if (path.extname(output).toLowerCase() !== '.cak') throw new Error('The output filename must end in .cak.');
  if (output.startsWith(scan.root + path.sep)) throw new Error('Save the new CAK outside the selected BakeMe folder.');
  const requestedKey = options.archiveKey;
  const key = requestedKey === undefined ? deriveArchiveKeyV99(path.basename(output)) : (Number(requestedKey) >>> 0);
  if (!key) throw new Error('The CAK archive key must be a non-zero unsigned 32-bit value.');
  fs.mkdirSync(path.dirname(output), { recursive: true }); const temporary = output + '.aurora-part'; const catalog = buildCatalog(scan, key); const fd = fs.openSync(temporary, 'w');
  try {
    writeAll(fd, catalog.prefix); catalog.sections.forEach((b) => writeAll(fd, b));
    for (const file of scan.files) {
      const plain = file.storedContent || (file.synthetic ? Buffer.from(file.content) : fs.readFileSync(file.full));
      writeAll(fd, protectPayload(plain, derivePayloadKey(key, file.storedSize, file.offset)));
    }
  } finally { fs.closeSync(fd); }
  if (fs.existsSync(output)) fs.rmSync(output); fs.renameSync(temporary, output); const verification = verifyCak(output, scan);
  const texturePayloads = scan.files.filter((file) => /\.(?:dds|tex)$/i.test(file.relative)).length;
  const warnings = [];
  if (texturePayloads && !scan.suppliedTextureDatabase) warnings.push('An empty _textures.tdb was added. This is correct for replacements of existing texture hashes; entirely new texture hashes need a populated _textures.tdb supplied in the BakeMe root.');
  return { outputPath: output, sourceRoot: scan.root, fileCount: scan.files.length, folderCount: scan.folders.length, bytes: fs.statSync(output).size, texturePayloads, textureDatabase: scan.suppliedTextureDatabase ? 'supplied' : 'generated-empty-v6', warnings, ...verification };
}
function verifyCak(archivePath, expected) {
  if (expected && expected.files.some((file) => file.storedSize === undefined)) prepareScanPayloads(expected);
  const dictionary = {}; if (expected) { expected.folders.forEach((x) => { if (x.relative) dictionary[x.hash] = x.relative; }); expected.files.forEach((x) => { dictionary[x.hash] = x.relative; }); }
  const session = openArchive(archivePath, dictionary);
  if (expected && (session.files.length !== expected.files.length || session.folders.length !== expected.folders.length)) throw new Error('The new CAK failed its catalog round-trip check.');
  if (expected) {
    const fd = fs.openSync(archivePath, 'r');
    try {
      for (const file of expected.files) {
        const reopened = session.files.find((x) => x.hash === file.hash);
        if (!reopened || reopened.storedSize !== file.storedSize || reopened.expandedSize !== file.expandedSize || reopened.compressed !== file.compressed || (file.offset !== undefined && Number(reopened.offset) !== file.offset) || !reopened.protected) throw new Error(`The new CAK failed catalog verification for ${file.relative}.`);
        const stored = Buffer.alloc(reopened.storedSize); fs.readSync(fd, stored, 0, stored.length, Number(reopened.offset));
        const recovered = recoverPayload(stored, derivePayloadKey(session.key, reopened.storedSize, reopened.offset));
        const source = file.storedContent || (file.synthetic ? Buffer.from(file.content) : fs.readFileSync(file.full));
        if (!crypto.timingSafeEqual(recovered, source)) throw new Error(`The new CAK failed payload verification for ${file.relative}.`);
      }
    } finally { fs.closeSync(fd); }
  }
  return { verified: true, payloadVerified: Boolean(expected), gameCompatibilityProfile: 'WWE 2K26 protected FDIR v9 + T_DB v6', archiveName: session.archiveName, archiveKey: session.key };
}
module.exports = { buildCak, verifyCak, scanBakeFolder, prepareScanPayloads, encodePairs, encodeStringTable, crc32cBuffer, derivePayloadKey, protectPayload, recoverPayload, EMPTY_TEXTURE_DATABASE };
