'use strict';

const fs = require('node:fs');
const lib = require('../jsfb-append-lib');

function inspect(buffer, expectedIdent) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const header = lib.readHeader(buffer, expectedIdent);
  const root = lib.tableAt(buffer, header.root);
  if (!root) throw new Error('JSFB root table is invalid');
  return {
    schema: 'aurora-forge-jsfb/v1',
    bytes: buffer.length,
    identifier: header.ident,
    rootOffset: header.root,
    rootTable: {
      offset: root.table,
      vtableOffset: root.vtable,
      vtableBytes: root.vsize,
      objectBytes: root.osize,
      fields: root.fields.map((field) => ({
        field: field.field,
        offset: field.at,
        bytes: field.size,
      })),
    },
  };
}

function inspectFile(file, expectedIdent) {
  return inspect(fs.readFileSync(file), expectedIdent);
}

function rootVector(buffer, chain = [0], expectedIdent) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  const header = lib.readHeader(buffer, expectedIdent);
  const vectorOffset = lib.followChain(buffer, header.root, chain);
  const vector = lib.readVector(buffer, vectorOffset);
  return {
    schema: 'aurora-forge-jsfb-vector/v1',
    identifier: header.ident,
    rootOffset: header.root,
    vectorOffset,
    count: vector.count,
    slotsOffset: vector.slotsOff,
    records: vector.tables,
  };
}

function validate(buffer, expectedIdent) {
  try {
    const result = inspect(buffer, expectedIdent);
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = {
  inspect,
  inspectFile,
  rootVector,
  validate,
  readHeader: lib.readHeader,
  tableAt: lib.tableAt,
  followChain: lib.followChain,
  readVector: lib.readVector,
};
