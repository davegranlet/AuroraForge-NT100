#!/usr/bin/env node
'use strict';

// Verifies the runtime lookup chain for one 2K26 Victory motion:
// Victory Csa row -> its single phase-100 pair -> Cdef size -> ADefs duration.
// This catches menu-visible entries that lack the pair metadata required when
// the editor resolves the motion.
const fs = require('node:fs');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
const { decode } = require('./adefs-file');
const { parsePayload } = require('./adefs-payload');
const { csaIdForMotion } = require('./csa-2k26-id');

function field(buffer, table, index) { return fieldByIndex(tableAt(buffer, table), index); }
function u32(buffer, item) {
  if (!item || item.size < 4) throw new Error('required u32 field missing or truncated');
  return buffer.readUInt32LE(item.at);
}
function u64(buffer, item) {
  if (!item || item.size < 8) throw new Error('required u64 field missing or truncated');
  return buffer.readBigUInt64LE(item.at);
}
function text(buffer, item) {
  if (!item || item.size < 4) throw new Error('required string field missing or truncated');
  const target = item.at + buffer.readUInt32LE(item.at);
  if (target <= item.at || target + 4 > buffer.length) throw new Error('string offset outside file');
  const length = buffer.readUInt32LE(target);
  if (!length || target + 4 + length > buffer.length) throw new Error('string bytes outside file');
  return buffer.toString('utf8', target + 4, target + 4 + length);
}
function vector(buffer, item) {
  if (!item || item.size < 4) throw new Error('required vector field missing or truncated');
  const target = item.at + buffer.readUInt32LE(item.at);
  if (target <= item.at || target + 4 > buffer.length) throw new Error('vector offset outside file');
  const length = buffer.readUInt32LE(target);
  if (length > 16 || target + 4 + length * 4 > buffer.length) throw new Error('invalid pair vector');
  return Array.from({ length }, (_, index) => buffer.readUInt32LE(target + 4 + index * 4));
}
function vectorTables(buffer, expectedIdent) {
  const { root } = readHeader(buffer, expectedIdent);
  const info = readVector(buffer, followChain(buffer, root, [0]));
  return info.tables.map((table, index) => ({ table, index })).filter(row => row.table !== null);
}

function verifyVictoryRegistration(csaBuffer, cdefBuffer, adefsBuffer, motionId, codecOptions = {}) {
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 99999) throw new Error('invalid motion id');
  const expectedPair = 1000000 + motionId;
  const csaTables = vectorTables(csaBuffer, 'Cont');
  const matches = csaTables.filter(({ table }) => u32(csaBuffer, field(csaBuffer, table, 1)) === motionId);
  if (matches.length !== 1) throw new Error(`expected one Csa row for ${motionId}, found ${matches.length}`);
  const { table: csaTable, index: csaIndex } = matches[0];
  const csaIdField = field(csaBuffer, csaTable, 0);
  const csaShape = tableAt(csaBuffer, csaTable);
  if (csaShape.osize !== 36 || csaIdField.at - csaTable !== 24 || csaIdField.size < 8) {
    throw new Error(`Victory Csa row does not match the native 2K26 Victory shape (object=${csaShape.osize}, field0Offset=${csaIdField.at - csaTable}, field0Span=${csaIdField.size})`);
  }
  const csa = {
    index: csaIndex,
    id0: u64(csaBuffer, csaIdField),
    category: text(csaBuffer, field(csaBuffer, csaTable, 2)),
    variant: text(csaBuffer, field(csaBuffer, csaTable, 4)),
    pairs: vector(csaBuffer, field(csaBuffer, csaTable, 5)),
  };
  const expectedId0 = csaIdForMotion(motionId);
  if (csa.id0 !== expectedId0) throw new Error(`Victory Csa key ${csa.id0} does not match native CutsceneAssembly path key ${expectedId0}`);
  if (csa.category !== 'Victory' || csa.variant !== 'Single') throw new Error('Csa row is not a single Victory entry');
  if (csa.pairs.length !== 1 || csa.pairs[0] !== expectedPair) throw new Error(`Victory Csa pair must be exactly ${expectedPair}`);
  if (csaTables.filter(({ table }) => {
    const idField = field(csaBuffer, table, 0);
    if (!idField) return false;
    return idField.size >= 8 ? u64(csaBuffer, idField) === csa.id0 : BigInt(u32(csaBuffer, idField)) === csa.id0;
  }).length !== 1) throw new Error('Csa id0 is not unique');

  const cdefTables = vectorTables(cdefBuffer, 'Cont');
  const pairMatches = cdefTables.filter(({ table }) => u32(cdefBuffer, field(cdefBuffer, table, 0)) === expectedPair);
  if (pairMatches.length !== 1) throw new Error(`expected one Cdef row for pair ${expectedPair}, found ${pairMatches.length}`);
  const { table: cdefTable, index: cdefIndex } = pairMatches[0];
  const cdef = {
    index: cdefIndex,
    size: u32(cdefBuffer, field(cdefBuffer, cdefTable, 1)),
    one: u32(cdefBuffer, field(cdefBuffer, cdefTable, 2)),
  };

  const payload = decode(adefsBuffer, codecOptions).payload;
  const parsed = parsePayload(payload);
  const states = parsed.definitions.flatMap(definition => definition.states);
  if (!states.length) throw new Error('ADefs has no states');
  const ends = states.map(state => state.node['2027243719']);
  if (ends.some(value => !Number.isInteger(value) || value < 0)) throw new Error('ADefs node end frame is missing or invalid');
  const endFrame = Math.max(...ends);
  if (cdef.size !== endFrame) throw new Error(`Cdef size ${cdef.size} does not match ADefs end frame ${endFrame}`);
  if (cdef.one !== 1) throw new Error(`Cdef flag must match the measured single-Victory value 1; found ${cdef.one}`);
  return {
    schema: 'aurora-forge/2k26-victory-registration-check/v1',
    motionId,
    category: csa.category,
    variant: csa.variant,
    csaIndex: csa.index,
    csaId0: csa.id0.toString(),
    csaRowShape: { objectBytes: csaShape.osize, field0Offset: csaIdField.at - csaTable, field0Width: 8 },
    phasePair: expectedPair,
    cdefIndex: cdef.index,
    cdefSize: cdef.size,
    adefsEndFrame: endFrame,
    definitionCount: parsed.definitions.length,
    stateCount: states.length,
    eventCount: states.reduce((count, state) => count + state.events.length, 0),
    pass: true,
  };
}

if (require.main === module) {
  try {
    const [csaPath, cdefPath, adefsPath, idText] = process.argv.slice(2);
    if (!csaPath || !cdefPath || !adefsPath || !/^\d+$/.test(idText || '')) {
      throw new Error('Usage: node verify_2k26_victory_registration.js <CsaDatabase.jsfb> <CdefDatabase.jsfb> <motion.adefs> <motionId>');
    }
    console.log(JSON.stringify(verifyVictoryRegistration(
      fs.readFileSync(csaPath), fs.readFileSync(cdefPath), fs.readFileSync(adefsPath), Number(idText),
      {
        workRoot: process.argv.includes('--work') ? process.argv[process.argv.indexOf('--work') + 1] : undefined,
        oodlePath: process.argv.includes('--oodle') ? process.argv[process.argv.indexOf('--oodle') + 1] : undefined,
      }
    ), null, 2));
  } catch (error) {
    console.error(`Victory registration verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyVictoryRegistration };
