'use strict';

// Compare semantic WWE 2K26 CdefDatabase rows across an append operation.
const fs = require('node:fs');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');

function readRows(file) {
  const bytes = fs.readFileSync(file);
  const { root } = readHeader(bytes, 'Cont');
  const vector = readVector(bytes, followChain(bytes, root, [0]));
  const field = (table, index) => fieldByIndex(tableAt(bytes, table), index);
  return vector.tables.map((table, index) => {
    if (table === null) return { index, null: true };
    const readU32 = (slot) => {
      const item = field(table, slot);
      return item ? bytes.readUInt32LE(item.at) : null;
    };
    return { index, pairId: readU32(0), size: readU32(1), one: readU32(2) };
  }).filter(row => !row.null);
}

function compareRows(beforePath, afterPath, expectedPairId, expectedSize, expectedOne = 1) {
  const before = readRows(beforePath);
  const after = readRows(afterPath);
  const byPair = (rows, label) => {
    const map = new Map();
    for (const row of rows) {
      if (row.pairId === null) throw new Error(`${label} contains a row without pairId`);
      if (map.has(row.pairId)) throw new Error(`${label} contains duplicate pairId ${row.pairId}`);
      map.set(row.pairId, row);
    }
    return map;
  };
  const prior = byPair(before, 'before database');
  const current = byPair(after, 'after database');
  for (const [pairId, row] of prior) {
    const actual = current.get(pairId);
    if (!actual || actual.size !== row.size || actual.one !== row.one) {
      throw new Error(`existing Cdef pair ${pairId} changed or disappeared: before=${JSON.stringify(row)} after=${JSON.stringify(actual)}`);
    }
  }
  const additions = after.filter(row => !prior.has(row.pairId));
  if (additions.length !== 1) throw new Error(`expected one new Cdef row, found ${additions.length}`);
  const added = additions[0];
  if (added.pairId !== Number(expectedPairId) || added.size !== Number(expectedSize) || added.one !== Number(expectedOne)) {
    throw new Error(`new Cdef row mismatch: got ${JSON.stringify(added)}`);
  }
  return {
    schema: 'aurora-forge/2k26-cdef-semantic-compare/v1',
    existingRowsPreserved: prior.size,
    appendedRow: added,
    pass: true,
  };
}

if (require.main === module) {
  try {
    const [before, after, pairId, size, one = '1'] = process.argv.slice(2);
    if (!before || !after || !/^\d+$/.test(pairId || '') || !/^\d+$/.test(size || '') || !/^\d+$/.test(one)) {
      throw new Error('Usage: node compare_2k26_cdef_rows.js <before.jsfb> <after.jsfb> <pair-id> <size> [one]');
    }
    process.stdout.write(`${JSON.stringify(compareRows(before, after, pairId, size, one), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Cdef semantic comparison failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { readRows, compareRows };
