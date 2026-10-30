'use strict';

// Add one WWE 2K26 VictoryListData row by cloning the selected native row.
// The validated authoring recipe changes only wrestler ID, display-name ID,
// someId and victoryFace; all other fields remain copied from the template.

const fs = require('node:fs');
const path = require('node:path');
const { readVictoryList } = require('./victory-list');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');

function rowsWithValues(buffer) {
  const { root } = readHeader(buffer, 'Vict');
  const vector = followChain(buffer, root, [0, 0]);
  const { tables } = readVector(buffer, vector);
  return tables.map((table, index) => {
    if (table === null) return { index, table: null };
    const resolved = tableAt(buffer, table);
    const get = (field, width) => {
      const item = fieldByIndex(resolved, field);
      if (!item) return null;
      if (item.size < width) throw new Error(`Victory row ${index} field ${field} is truncated`);
      if (width === 1) return buffer.readUInt8(item.at);
      if (width === 2) return buffer.readUInt16LE(item.at);
      if (width === 4) return buffer.readUInt32LE(item.at);
      if (width === 8) return buffer.readBigUInt64LE(item.at);
      throw new Error(`Unsupported scalar width ${width}`);
    };
    return {
      index,
      table,
      wrestlerId: get(0, 2),
      nameString: get(1, 4),
      type: get(2, 1) ?? 0,
      hideId: get(3, 8),
      someId: get(4, 4),
      victoryFace: get(5, 4),
      victoryHeel: get(6, 4),
      titleFace: get(7, 4),
      titleHeel: get(8, 4),
      doubleTitle: get(9, 4),
    };
  });
}

function parseIntArg(value, label, max) {
  if (!/^(0|[1-9]\d*)$/.test(String(value ?? ''))) throw new Error(`${label} must be an unsigned integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > max) throw new Error(`${label} is out of range`);
  return number;
}

function align(value, boundary = 4) {
  return Math.ceil(value / boundary) * boundary;
}

function buildAppendedRow(buffer, values) {
  const { root } = readHeader(buffer, 'Vict');
  const rootResolved = tableAt(buffer, root);
  const wrapperPos = followChain(buffer, root, [0]);
  const wrapperResolved = tableAt(buffer, wrapperPos);
  if (!rootResolved || !wrapperResolved) throw new Error('Victory root or wrapper table is invalid');
  const vectorPos = followChain(buffer, root, [0, 0]);
  const vector = readVector(buffer, vectorPos);
  const rowBytes = 44;
  const rowVtableBytes = 24;

  const newRootVtable = 8;
  const newRoot = align(newRootVtable + rootResolved.vsize, 8);
  const newWrapperVtable = newRoot + rootResolved.osize;
  const newWrapper = align(newWrapperVtable + wrapperResolved.vsize, 8);
  const newVector = newWrapper + wrapperResolved.osize;
  const newRecordVtable = newVector + 4 + (vector.count + 1) * 4;
  const newRecord = align(newRecordVtable + rowVtableBytes, 4);
  const shift = align(newRecord + rowBytes, 8);
  const out = Buffer.alloc(shift + buffer.length);
  buffer.copy(out, shift);

  out.writeUInt32LE(newRoot, 0);
  out.write('Vict', 4, 4, 'ascii');
  buffer.copy(out, newRootVtable, rootResolved.vtable, rootResolved.vtable + rootResolved.vsize);
  buffer.copy(out, newRoot, root, root + rootResolved.osize);
  out.writeInt32LE(newRoot - newRootVtable, newRoot);
  const rootField = fieldByIndex(rootResolved, 0);
  if (!rootField || rootField.size < 4) throw new Error('Victory root wrapper field is missing');
  const newRootField = newRoot + rootField.rel;
  out.writeUInt32LE(newWrapper - newRootField, newRootField);

  buffer.copy(out, newWrapperVtable, wrapperResolved.vtable, wrapperResolved.vtable + wrapperResolved.vsize);
  buffer.copy(out, newWrapper, wrapperPos, wrapperPos + wrapperResolved.osize);
  out.writeInt32LE(newWrapper - newWrapperVtable, newWrapper);
  const wrapperField = fieldByIndex(wrapperResolved, 0);
  if (!wrapperField || wrapperField.size < 4) throw new Error('Victory wrapper vector field is missing');
  const newWrapperField = newWrapper + wrapperField.rel;
  out.writeUInt32LE(newVector - newWrapperField, newWrapperField);

  out.writeUInt32LE(vector.count + 1, newVector);
  for (let index = 0; index < vector.count; index += 1) {
    const slot = newVector + 4 + index * 4;
    const target = vector.tables[index] + shift;
    if (vector.tables[index] === null) out.writeUInt32LE(0, slot);
    else out.writeUInt32LE(target - slot, slot);
  }
  const appendedSlot = newVector + 4 + vector.count * 4;
  out.writeUInt32LE(newRecord - appendedSlot, appendedSlot);

  out.writeUInt16LE(rowVtableBytes, newRecordVtable);
  out.writeUInt16LE(rowBytes, newRecordVtable + 2);
  const fieldOffsets = [6, 8, 5, 36, 12, 16, 20, 24, 28, 32];
  fieldOffsets.forEach((offset, index) => out.writeUInt16LE(offset, newRecordVtable + 4 + index * 2));
  out.writeInt32LE(newRecord - newRecordVtable, newRecord);
  out.writeUInt8(values.type, newRecord + 5);
  out.writeUInt16LE(values.wrestlerId, newRecord + 6);
  out.writeUInt32LE(values.nameString, newRecord + 8);
  out.writeUInt32LE(values.someId, newRecord + 12);
  out.writeUInt32LE(values.victoryFace, newRecord + 16);
  out.writeUInt32LE(values.victoryHeel, newRecord + 20);
  out.writeUInt32LE(values.titleFace, newRecord + 24);
  out.writeUInt32LE(values.titleHeel, newRecord + 28);
  out.writeUInt32LE(values.doubleTitle, newRecord + 32);
  out.writeBigUInt64LE(values.hideId, newRecord + 36);
  return { output: out, shift };
}

function append2k26VictoryEntry({ input, output, entryId, nameString, motionId = entryId, cloneId = 100, type }) {
  const inputPath = path.resolve(input || '');
  const outputPath = path.resolve(output || '');
  if (!input || !output) throw new Error('input and output are required');
  if (!fs.existsSync(inputPath)) throw new Error(`VictoryList input does not exist: ${inputPath}`);
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite existing output: ${outputPath}`);
  entryId = parseIntArg(entryId, 'entryId', 0xffff);
  nameString = parseIntArg(nameString, 'nameString', 0xffffffff);
  motionId = parseIntArg(motionId, 'motionId', 0xffffffff);
  cloneId = parseIntArg(cloneId, 'cloneId', 0xffff);
  if (type !== undefined) type = parseIntArg(type, 'type', 0xff);

  const beforeBytes = fs.readFileSync(inputPath);
  const before = readVictoryList(beforeBytes);
  const rowsBefore = rowsWithValues(beforeBytes);
  if (rowsBefore.some((row) => row.wrestlerId === entryId)) throw new Error(`Victory wrestler ID ${entryId} already exists`);
  const template = rowsBefore.find((row) => row.wrestlerId === cloneId);
  if (!template) throw new Error(`native Victory template row ${cloneId} was not found`);
  for (const field of ['hideId', 'someId', 'victoryFace', 'victoryHeel', 'titleFace', 'titleHeel', 'doubleTitle']) {
    if (template[field] === null) throw new Error(`native Victory template row ${cloneId} is missing field ${field}`);
  }

  const values = {
    wrestlerId: entryId,
    nameString,
    // A new custom Victory slot may need a catalog type different from the
    // native wrestler template. Preserve the template by default, but let the
    // measured 2K26 custom-entry recipe explicitly select its type.
    type: type === undefined ? template.type : type,
    hideId: template.hideId,
    someId: motionId,
    victoryFace: motionId,
    victoryHeel: template.victoryHeel,
    titleFace: template.titleFace,
    titleHeel: template.titleHeel,
    doubleTitle: template.doubleTitle,
  };
  const built = buildAppendedRow(beforeBytes, values);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, built.output, { flag: 'wx' });
  try {
    const afterBytes = fs.readFileSync(outputPath);
    if (!afterBytes.subarray(built.shift).equals(beforeBytes)) {
      throw new Error('native VictoryList bytes were not preserved byte-for-byte');
    }
    const after = readVictoryList(afterBytes);
    const rowsAfter = rowsWithValues(afterBytes);
    if (after.recordCount !== before.recordCount + 1) throw new Error('VictoryList row count did not increase by one');
    const appended = rowsAfter.at(-1);
    const expected = {
      wrestlerId: entryId,
      nameString,
      type: type === undefined ? template.type : type,
      hideId: template.hideId,
      someId: motionId,
      victoryFace: motionId,
      victoryHeel: template.victoryHeel,
      titleFace: template.titleFace,
      titleHeel: template.titleHeel,
      doubleTitle: template.doubleTitle,
    };
    for (const [field, value] of Object.entries(expected)) {
      if (appended[field] !== value) throw new Error(`appended Victory row ${field} mismatch: expected ${value}, found ${appended[field]}`);
    }
    if (rowsAfter.slice(0, before.recordCount).some((row, index) => row.table === null || row.wrestlerId !== rowsBefore[index].wrestlerId)) {
      throw new Error('one or more native Victory rows changed position or identity');
    }
    return {
      schema: 'aurora-forge/2k26-victory-list-append/v1',
      input: inputPath,
      output: outputPath,
      nativeRowsPreserved: before.recordCount,
      appendedIndex: appended.index,
      customRow: Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value])),
      nativeBytesPreserved: true,
      pass: true,
    };
  } catch (error) {
    try { fs.unlinkSync(outputPath); } catch {}
    throw error;
  }
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (require.main === module) {
  try {
    const report = append2k26VictoryEntry({ input: arg('--input'), output: arg('--out'), entryId: arg('--entry-id'), nameString: arg('--name-string'), motionId: arg('--motion-id'), cloneId: arg('--clone-id'), type: arg('--type') });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`2K26 Victory row append failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { append2k26VictoryEntry, rowsWithValues };
