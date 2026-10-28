#!/usr/bin/env node
'use strict';

// Aurora Forge - custom music package builder.
// Builds the Wwise AKPK package the AuroraForge.CustomMusicLoader addon
// registers from <game>/sound/<name>.pck. The loader rebuilds the stock music
// bank with 2,500 custom slots: slot i uses WEM source id 1080000000 + i and is
// triggered by the bank event Play_MUS_ID_<3000 + i>.
//
// Package layout (proven against the captured Custom_Music.pck manifest):
//   "AKPK" | header_size | flags | languages_size | banks_size | sounds_size
//   externals_size | language section (20 bytes) | bank table (count 0)
//   sound table (count n, 20-byte entries) | external table (count 0)
//   payloads block-aligned to 4096; entry.start_block = offset / 4096
//
// CLI:
//   node build-music-pck.js --out Custom_Music.pck file1.wem file2.wem
//   node build-music-pck.js --out Custom_Music.pck --start-id 1080000000 a.wem b.wem
//   node build-music-pck.js --out Custom_Music.pck --map 1080000000=a.wem --map 1080000001=b.wem
//   node build-music-pck.js --selftest

const fs = require('node:fs');
const path = require('node:path');

const BLOCK_SIZE = 4096;
const FLAGS = 1;
const DEFAULT_LANGUAGE_SECTION = Buffer.from('010000000c000000000000007300660078000000', 'hex');

function readU32(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error(`truncated u32 at 0x${offset.toString(16)}`);
  return buffer.readUInt32LE(offset);
}

function validateAkpk(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 4).toString('latin1') !== 'AKPK') return 'invalid AKPK package';
  const headerSize = readU32(buffer, 4);
  const langSize = readU32(buffer, 12);
  const bankSize = readU32(buffer, 16);
  const soundSize = readU32(buffer, 20);
  let cursor = 24;
  let externalSize = 0;
  const known = 16 + langSize + bankSize + soundSize;
  if (known < headerSize) {
    externalSize = readU32(buffer, cursor);
    cursor += 4;
  }
  const languagesEnd = cursor + langSize;
  if (languagesEnd > buffer.length) return 'language section exceeds package';
  cursor = languagesEnd;
  const parseTable = (sectionSize, label) => {
    const end = cursor + sectionSize;
    if (end > buffer.length) return `${label} table exceeds package`;
    if (sectionSize === 0) return null;
    const count = readU32(buffer, cursor);
    if (count === 0) { cursor = end; return null; }
    const payload = sectionSize - 4;
    if (payload % count) return `${label} table size is not divisible by count`;
    const entrySize = payload / count;
    if (entrySize !== 20 && entrySize !== 24) return `unsupported ${label} entry size ${entrySize}`;
    let entry = cursor + 4;
    for (let i = 0; i < count; i += 1, entry += entrySize) {
      const block = readU32(buffer, entry + 4);
      const sizeLo = readU32(buffer, entry + 8);
      const sizeHi = entrySize === 24 ? readU32(buffer, entry + 12) : 0;
      const start = readU32(buffer, entry + (entrySize === 24 ? 16 : 12));
      const size = sizeLo | (sizeHi * 0x100000000);
      const offset = block ? start * block : start;
      if (offset > buffer.length || size > buffer.length - offset) return `${label} entry points outside package`;
    }
    cursor = end;
    return null;
  };
  return parseTable(bankSize, 'bank') || parseTable(soundSize, 'sound') || parseTable(externalSize, 'external') || null;
}

function buildMusicPck(options) {
  const entries = options.entries || [];
  if (!entries.length) throw new Error('no WEM entries provided');
  for (const entry of entries) {
    if (!entry.path || !fs.existsSync(entry.path)) throw new Error(`missing WEM: ${entry.path}`);
    if (!Number.isSafeInteger(entry.id) || entry.id < 0) throw new Error(`invalid WEM id: ${entry.id}`);
  }
  const languageSection = options.languageSection || DEFAULT_LANGUAGE_SECTION;
  const soundsSize = 4 + entries.length * 20;
  const headerSize = 24 + languageSection.length + 4 + soundsSize;

  const chunks = [];
  const header = Buffer.alloc(28);
  header.write('AKPK', 0, 'latin1');
  header.writeUInt32LE(headerSize, 4);
  header.writeUInt32LE(FLAGS, 8);
  header.writeUInt32LE(languageSection.length, 12);
  header.writeUInt32LE(4, 16);
  header.writeUInt32LE(soundsSize, 20);
  header.writeUInt32LE(4, 24);
  chunks.push(header, languageSection);

  const bankTable = Buffer.alloc(4);
  chunks.push(bankTable);

  const soundTable = Buffer.alloc(4 + entries.length * 20);
  soundTable.writeUInt32LE(entries.length, 0);
  chunks.push(soundTable);

  const externalTable = Buffer.alloc(4);
  chunks.push(externalTable);

  let cursor = 28 + languageSection.length + 4 + soundsSize + 4;
  const padToBlock = () => {
    const remainder = cursor % BLOCK_SIZE;
    if (remainder === 0) return;
    const pad = Buffer.alloc(BLOCK_SIZE - remainder);
    chunks.push(pad);
    cursor += pad.length;
  };
  padToBlock();

  const manifestEntries = [];
  entries.forEach((entry, index) => {
    const payload = fs.readFileSync(entry.path);
    const startBlock = cursor / BLOCK_SIZE;
    soundTable.writeUInt32LE(entry.id, 4 + index * 20);
    soundTable.writeUInt32LE(BLOCK_SIZE, 4 + index * 20 + 4);
    soundTable.writeUInt32LE(payload.length, 4 + index * 20 + 8);
    soundTable.writeUInt32LE(startBlock, 4 + index * 20 + 12);
    soundTable.writeUInt32LE(0, 4 + index * 20 + 16);
    chunks.push(payload);
    cursor += payload.length;
    manifestEntries.push({ kind: 'sound', file_id: entry.id, block_size: BLOCK_SIZE, size: payload.length, start_block: startBlock, language_id: 0, offset: startBlock * BLOCK_SIZE });
    padToBlock();
  });

  const packageBuffer = Buffer.concat(chunks, cursor);
  const manifest = {
    package: {
      size: packageBuffer.length,
      header_size: headerSize,
      flags: FLAGS,
      languages_size: languageSection.length,
      banks_size: 4,
      sounds_size: soundsSize,
      externals_size: 4
    },
    entries: manifestEntries
  };
  return { buffer: packageBuffer, manifest };
}

function parseArgs(argv) {
  const options = { out: null, startId: 1080000000, files: [], maps: [], selftest: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[++i];
    else if (arg === '--start-id') options.startId = Number(argv[++i]);
    else if (arg === '--map') options.maps.push(argv[++i]);
    else if (arg === '--selftest') options.selftest = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}`);
    else options.files.push(arg);
  }
  return options;
}

function selftest() {
  const sampleDir = 'D:/AuroraForge-Aug26/DataCtrlLink-MusicOnly/analysis/custom_music_pck';
  const first = path.join(sampleDir, '1080000000.wem');
  const second = path.join(sampleDir, '1080000001.wem');
  if (!fs.existsSync(first) || !fs.existsSync(second)) throw new Error('sample WEMs not found for selftest');
  const built = buildMusicPck({ entries: [{ id: 1080000000, path: first }, { id: 1080000001, path: second }] });
  const error = validateAkpk(built.buffer);
  if (error) throw new Error(`selftest validation failed: ${error}`);
  const m = built.manifest;
  if (m.package.header_size !== 24 + 20 + 4 + (4 + 2 * 20)) throw new Error('selftest header size mismatch');
  const expectedFirstBlock = Math.ceil((28 + 20 + 4 + (4 + 2 * 20) + 4) / BLOCK_SIZE);
  if (m.entries[0].start_block !== expectedFirstBlock) throw new Error(`selftest first start_block ${m.entries[0].start_block} != ${expectedFirstBlock}`);
  if (m.entries[1].offset !== Math.ceil((m.entries[0].offset + m.entries[0].size) / BLOCK_SIZE) * BLOCK_SIZE) throw new Error('selftest second offset not block aligned');
  const out = path.join(require('node:os').tmpdir(), 'aurora-music-selftest.pck');
  fs.writeFileSync(out, built.buffer);
  const reparsed = validateAkpk(fs.readFileSync(out));
  if (reparsed) throw new Error(`selftest reparse failed: ${reparsed}`);
  console.log('selftest passed');
  console.log('package:', out, built.buffer.length, 'bytes');
  console.log('manifest:', JSON.stringify(built.manifest.package));
  return 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selftest) return selftest();
  if (!options.out) throw new Error('--out is required');
  const entries = [];
  for (const map of options.maps) {
    const [id, file] = map.split('=');
    entries.push({ id: Number(id), path: path.resolve(file) });
  }
  let next = options.startId;
  for (const file of options.files) {
    entries.push({ id: next, path: path.resolve(file) });
    next += 1;
  }
  const built = buildMusicPck({ entries });
  const error = validateAkpk(built.buffer);
  if (error) throw new Error(error);
  fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
  fs.writeFileSync(path.resolve(options.out), built.buffer);
  fs.writeFileSync(path.resolve(options.out) + '.manifest.json', JSON.stringify(built.manifest, null, 2) + '\n');
  console.log(`built ${options.out}: ${built.buffer.length} bytes, ${entries.length} sound entries`);
  return 0;
}

module.exports = { buildMusicPck, validateAkpk, DEFAULT_LANGUAGE_SECTION };

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(String(error && error.message ? error.message : error));
    process.exitCode = 2;
  }
}
