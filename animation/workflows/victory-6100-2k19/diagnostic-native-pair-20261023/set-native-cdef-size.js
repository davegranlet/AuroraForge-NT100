'use strict';

// Diagnostic-only in-place update of the newly appended Cdef size so it
// matches a copied native Victory ADefs/clip pair. Preserves every other byte.
const fs = require('node:fs');
const {
  readHeader, followChain, readVector, tableAt, fieldByIndex,
} = require('../../../tools/jsfb-append-lib');

function patchCdefSize(input, output, pairId, size) {
  if (!Number.isInteger(pairId) || pairId < 0 || pairId > 0xffffffff) throw new Error('pairId must be u32');
  if (!Number.isInteger(size) || size < 0 || size > 0xffffffff) throw new Error('size must be u32');
  const source = fs.readFileSync(input);
  const { root } = readHeader(source, 'Cont');
  const vector = readVector(source, followChain(source, root, [0]));
  const matches = [];
  for (const [index, position] of vector.tables.entries()) {
    if (position === null) continue;
    const table = tableAt(source, position);
    const idField = fieldByIndex(table, 0);
    if (idField && idField.size >= 4 && source.readUInt32LE(idField.at) === pairId) {
      matches.push({ index, table, idField, sizeField: fieldByIndex(table, 1) });
    }
  }
  if (matches.length !== 1) throw new Error(`expected one Cdef pair ${pairId}, found ${matches.length}`);
  const match = matches[0];
  if (!match.sizeField || match.sizeField.size < 4) throw new Error('Cdef size field missing or truncated');
  const previous = source.readUInt32LE(match.sizeField.at);
  const result = Buffer.from(source);
  result.writeUInt32LE(size, match.sizeField.at);
  if (result.length !== source.length || result.readUInt32LE(match.idField.at) !== pairId || result.readUInt32LE(match.sizeField.at) !== size) {
    throw new Error('Cdef size readback failed');
  }
  for (let offset = 0; offset < source.length; offset++) {
    if (offset >= match.sizeField.at && offset < match.sizeField.at + 4) continue;
    if (source[offset] !== result[offset]) throw new Error(`unexpected byte change at ${offset}`);
  }
  fs.writeFileSync(output, result, { flag: 'wx' });
  return { input, output, pairId, index: match.index, previous, size, bytes: result.length, changedBytes: 4 };
}

if (require.main === module) {
  const [input, output, pair, size] = process.argv.slice(2);
  try {
    if (!input || !output || !/^\d+$/.test(pair || '') || !/^\d+$/.test(size || '')) {
      throw new Error('Usage: node set-native-cdef-size.js <in-CdefDatabase.jsfb> <new-out.jsfb> <pairId> <endFrame>');
    }
    process.stdout.write(`${JSON.stringify(patchCdefSize(input, output, Number(pair), Number(size)), null, 2)}\n`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { patchCdefSize };
