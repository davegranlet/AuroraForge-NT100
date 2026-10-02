'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildCak, verifyCak, scanBakeFolder, encodePairs, encodeStringTable, crc32cBuffer, derivePayloadKey, protectPayload, recoverPayload } = require('../electron/archive-repackager');
const { decodePairs, decodeStringTable } = require('../electron/cak-reader');
const { deriveArchiveKeyV99 } = require('../electron/cak-v99-key');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-cak-bake-'));
try {
  const keyVectors = {
    'zzz_MyGM_StartingCash_50M.cak': 0xfc8a9491,
    'cracked-test1-characters.cak': 0xf1061c60,
    'cracked-test1.cak': 0xf9cb08ac,
    'SMashZ_Blood.cak': 0xf4b92b99,
    'titavius_aew_2026.cak': 0xfca19806
  };
  for (const [name, expectedKey] of Object.entries(keyVectors)) {
    if (deriveArchiveKeyV99(name) !== expectedKey) throw new Error(`WWE 2K26 filename-key derivation failed for ${name}.`);
  }
  // Regression: this name produces an inverted FNV lane with a leading zero.
  // The seed must still be padded to the fixed 32 bytes required by v9.9.
  if (deriveArchiveKeyV99('mod23.cak') !== 0xf755512d) throw new Error('WWE 2K26 filename-key derivation lost a leading seed zero.');
  const source = path.join(root, 'BakeMe');
  fs.mkdirSync(path.join(source, 'Characters', '100_Test', 'Textures'), { recursive: true });
  fs.writeFileSync(path.join(source, 'Characters', '100_Test', 'profile.jsfb'), Buffer.from('JSFB test profile'));
  fs.writeFileSync(path.join(source, 'Characters', '100_Test', 'Textures', 'body_color.dds'), Buffer.from('DDS test texture'));
  const sample = Buffer.from('catalog encryption round trip'), key = 0x1234abcd;
  if (!decodePairs(encodePairs(sample, key), key).equals(sample)) throw new Error('Catalog encoder round trip failed.');
  const payloadKey = derivePayloadKey(key, sample.length, 0x12345n);
  if (!recoverPayload(protectPayload(sample, payloadKey), payloadKey).equals(sample)) throw new Error('Payload protection round trip failed.');
  const plainNames = Buffer.from('0000000006474d4d6f6465000d5f74657874757265732e746462000b506172616d732e6a73666200', 'hex');
  const encodedNames = Buffer.from('0000000006c6cee8894883000d287c14e6fd316bc3a8575cd414000b9764ca70744e8c21844fc300', 'hex');
  if (!encodeStringTable(plainNames).equals(encodedNames)) throw new Error('WWE 2K26 string-table encoding does not match the verified archive vector.');
  if (!decodeStringTable(encodedNames).equals(plainNames)) throw new Error('WWE 2K26 string-table decoding did not restore the verified names.');
  const output = path.join(root, 'aurora-test.cak');
  const result = buildCak(source, output);
  verifyCak(output, scanBakeFolder(source));
  if (!result.verified || !result.payloadVerified || result.fileCount !== 3 || result.folderCount !== 4) throw new Error('CAK baker returned the wrong catalog totals.');
  if (fs.readFileSync(output).subarray(0, 4).toString('ascii') !== 'FDIR') throw new Error('Output is not a CAK FDIR archive.');
  const rebuilt = require('../electron/cak-reader').openArchive(output, { [require('../electron/cak-reader').fnv1a64('characters/100_test/profile.jsfb')]: 'Characters/100_Test/profile.jsfb' });
  const jsfb = rebuilt.files.find((file) => file.name.toLowerCase().endsWith('profile.jsfb'));
  const raw = fs.readFileSync(output); const encodedHeader = raw.subarray(8, 92); const words = Array.from({ length: 21 }, (_, index) => decodePairs(encodedHeader, rebuilt.key).readUInt32LE(index * 4));
  const decodedFileTable = decodePairs(raw.subarray(words[11], words[11] + words[9]), rebuilt.key);
  if (!jsfb || !decodedFileTable.includes(Buffer.from('JSFB'))) throw new Error('JSFB resource marker was not written in the game-native uppercase form.');
  const decodedFolderHashes = decodePairs(raw.subarray(words[5], words[5] + words[3]), rebuilt.key);
  for (let offset = 12; offset < decodedFolderHashes.length; offset += 12) {
    if (decodedFolderHashes.readBigUInt64LE(offset - 12) > decodedFolderHashes.readBigUInt64LE(offset)) throw new Error('CAK folder hashes are not in the game-required sorted order.');
  }
  for (const [sizeIndex, crcIndex, offsetIndex] of [[3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17]]) {
    const section = decodePairs(raw.subarray(words[offsetIndex], words[offsetIndex] + words[sizeIndex]), rebuilt.key);
    if (crc32cBuffer(section) !== words[crcIndex]) throw new Error('A CAK catalog section has an invalid CRC32C checksum.');
  }
  console.log(`Aurora Forge CAK baker verification passed (${result.fileCount} files; ${result.folderCount} folders; protected payloads recovered byte-for-byte).`);
} finally { fs.rmSync(root, { recursive: true, force: true }); }
