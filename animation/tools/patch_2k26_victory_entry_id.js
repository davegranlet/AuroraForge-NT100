'use strict';

// Change only the wrestler/entry ID of one already-registered 2K26 Victory
// row. Motion references, row metadata, vector shape, and every other source
// byte are preserved. Use for controlled entry-ID versus motion-ID tests.

const fs = require('node:fs');
const path = require('node:path');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
const { rowsWithValues } = require('./append_2k26_victory_entry');

function patchVictoryEntryId({ input, output, fromEntryId, toEntryId, expectedMotionId }) {
  if (!input || !output) throw new Error('input and output are required');
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);
  if (!fs.existsSync(inputPath)) throw new Error(`VictoryList input does not exist: ${inputPath}`);
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite existing output: ${outputPath}`);
  for (const [name, value] of Object.entries({ fromEntryId, toEntryId, expectedMotionId })) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new Error(`${name} must be a u16`);
  }
  if (fromEntryId === toEntryId) throw new Error('fromEntryId and toEntryId must differ');

  const before = fs.readFileSync(inputPath);
  const rows = rowsWithValues(before);
  const matches = rows.filter(row => row.wrestlerId === fromEntryId);
  if (matches.length !== 1) throw new Error(`expected one Victory row ${fromEntryId}, found ${matches.length}`);
  if (rows.some(row => row.wrestlerId === toEntryId)) throw new Error(`Victory entry ID ${toEntryId} is already occupied`);
  const row = matches[0];
  if (row.someId !== expectedMotionId || row.victoryFace !== expectedMotionId) {
    throw new Error(`Victory row ${fromEntryId} does not point both motion fields to ${expectedMotionId}`);
  }

  const { root } = readHeader(before, 'Vict');
  const vectorPos = followChain(before, root, [0, 0]);
  const vector = readVector(before, vectorPos);
  const table = vector.tables[row.index];
  if (table === null) throw new Error(`Victory row ${row.index} has a null table`);
  const idField = fieldByIndex(tableAt(before, table), 0);
  if (!idField || idField.size < 2 || before.readUInt16LE(idField.at) !== fromEntryId) {
    throw new Error('Victory row entry-ID field is missing, truncated, or inconsistent');
  }

  const after = Buffer.from(before);
  after.writeUInt16LE(toEntryId, idField.at);
  for (let index = 0; index < before.length; index += 1) {
    if (index !== idField.at && before[index] !== after[index]) throw new Error(`unexpected byte change at offset ${index}`);
  }
  const verifiedRows = rowsWithValues(after);
  const patched = verifiedRows[row.index];
  if (patched.wrestlerId !== toEntryId || patched.someId !== expectedMotionId || patched.victoryFace !== expectedMotionId) {
    throw new Error('patched row failed read-back verification');
  }
  if (verifiedRows.length !== rows.length || verifiedRows.some((candidate, index) => index !== row.index && candidate.wrestlerId !== rows[index].wrestlerId)) {
    throw new Error('a different Victory row changed identity');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, after, { flag: 'wx' });
  return {
    schema: 'aurora-forge/2k26-victory-entry-id-patch/v1',
    input: inputPath,
    output: outputPath,
    rowIndex: row.index,
    fromEntryId,
    toEntryId,
    motionId: expectedMotionId,
    changedFieldWidth: 2,
    changedBytes: before.reduce((count, value, index) => count + (value !== after[index] ? 1 : 0), 0),
    nativeAndOtherRowsPreserved: true,
    pass: true,
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : Number(process.argv[index + 1]);
}

function stringArg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? '' : process.argv[index + 1] || '';
}

if (require.main === module) {
  try {
    const report = patchVictoryEntryId({ input: stringArg('--input'), output: stringArg('--out'), fromEntryId: arg('--from-entry-id'), toEntryId: arg('--to-entry-id'), expectedMotionId: arg('--motion-id') });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`2K26 Victory entry-ID patch failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { patchVictoryEntryId };
