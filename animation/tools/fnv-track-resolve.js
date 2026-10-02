'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { identifiers } = require('./adefs-symbol-compare');

const MASK64 = 0xFFFFFFFFFFFFFFFFn;
function fnv1a64(value) {
  let hash = 0xCBF29CE484222325n;
  for (const byte of Buffer.from(value, 'utf8')) hash = (hash ^ BigInt(byte)) * 0x100000001B3n & MASK64;
  return `0x${hash.toString(16).toUpperCase().padStart(16, '0')}`;
}

function resolve(clipsInput, recordIndex, dictionaryInput) {
  const clips = parseFile(clipsInput, { includeRaw: false });
  const record = clips.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} does not exist`);
  const dictionary = identifiers(fs.readFileSync(path.resolve(dictionaryInput)));
  const namesByHash = new Map();
  for (const name of dictionary) {
    const hash = fnv1a64(name);
    if (!namesByHash.has(hash)) namesByHash.set(hash, []);
    namesByHash.get(hash).push(name);
  }
  const tracks = record.trackIdentifiers.map((id, index) => ({ index, id, names: (namesByHash.get(id) || []).sort() }));
  return {
    schema: 'aurora-forge-fnv-track-resolve/v1',
    status: 'Research',
    source: { clips: path.basename(clipsInput), record: recordIndex, dictionary: path.basename(dictionaryInput), dictionaryIdentifiers: dictionary.size },
    summary: { tracks: tracks.length, resolvedTracks: tracks.filter(track => track.names.length).length },
    tracks,
    limits: ['Resolves only exact FNV-1a 64-bit identifier matches. A missing name is unresolved metadata, not evidence that the track is invalid.'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 5) throw new Error('Usage: node tools/fnv-track-resolve.js <target.clips> <record-index> <decoded-global-adefs.bin>');
    process.stdout.write(`${JSON.stringify(resolve(process.argv[2], Number(process.argv[3]), process.argv[4]), null, 2)}\n`);
  } catch (error) {
    console.error(`FNV track resolution failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { fnv1a64, resolve };
