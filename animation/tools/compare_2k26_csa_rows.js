#!/usr/bin/env node
'use strict';

// Semantic comparison for 2K26 CsaDatabase rows. This intentionally compares
// resolved FlatBuffer values rather than raw offsets, which change on append.
const fs = require('node:fs');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');

function readRows(file) {
  const b = fs.readFileSync(file);
  const { root } = readHeader(b, 'Cont');
  const rows = readVector(b, followChain(b, root, [0])).tables;
  const readField = (table, index) => fieldByIndex(tableAt(b, table), index);
  const readU32 = (table, index) => {
    const f = readField(table, index);
    return f ? b.readUInt32LE(f.at) : null;
  };
  const readSoff = (table, index) => {
    const f = readField(table, index);
    if (!f) return null;
    const target = f.at + b.readUInt32LE(f.at);
    const length = b.readUInt32LE(target);
    return b.toString('utf8', target + 4, target + 4 + length);
  };
  const readVectorField = (table, index) => {
    const f = readField(table, index);
    if (!f) return null;
    const target = f.at + b.readUInt32LE(f.at);
    const length = b.readUInt32LE(target);
    return Array.from({ length }, (_, i) => b.readUInt32LE(target + 4 + 4 * i));
  };
  return rows.map((table, index) => {
    if (table === null) return { index, null: true };
    const shape = tableAt(b, table);
    const id = readField(table, 0);
    return {
      index,
      id0: id ? (id.size >= 8 ? b.readBigUInt64LE(id.at).toString() : String(b.readUInt32LE(id.at))) : null,
      motionId: readU32(table, 1),
      category: readSoff(table, 2),
      group: readSoff(table, 3),
      variant: readSoff(table, 4),
      pairs: readVectorField(table, 5),
      objectBytes: shape.osize,
      field0Offset: id ? id.at - table : null,
      field0Span: id ? id.size : null,
    };
  });
}

function compareRows(beforePath, afterPath, expectedNewMotion) {
  const before = readRows(beforePath);
  const after = readRows(afterPath);
  if (after.length !== before.length + 1) throw new Error(`expected exactly one appended row (${before.length} -> ${after.length})`);
  for (let i = 0; i < before.length; i++) {
    if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) throw new Error(`pre-existing row ${i} changed semantically`);
  }
  const added = after[after.length - 1];
  if (added.motionId !== expectedNewMotion) throw new Error(`last row motion id ${added.motionId} != ${expectedNewMotion}`);
  return { schema: 'aurora-forge/2k26-csa-semantic-compare/v1', existingRowsPreserved: before.length, appendedRow: added, pass: true };
}

if (require.main === module) {
  try {
    const [before, after, motionText] = process.argv.slice(2);
    if (!before || !after || !/^\d+$/.test(motionText || '')) throw new Error('Usage: node compare_2k26_csa_rows.js <before.jsfb> <after.jsfb> <appended-motion-id>');
    console.log(JSON.stringify(compareRows(before, after, Number(motionText)), null, 2));
  } catch (error) {
    console.error(`Csa semantic comparison failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { readRows, compareRows };
