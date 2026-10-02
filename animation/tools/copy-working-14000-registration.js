'use strict';

const fs = require('fs');
const path = require('path');

function fail(message) {
  throw new Error(message);
}

function fieldAt(buffer, table, field) {
  const vtable = table - buffer.readInt32LE(table);
  const slot = vtable + 4 + field * 2;
  if (slot + 2 > vtable + buffer.readUInt16LE(vtable)) return null;
  const relative = buffer.readUInt16LE(slot);
  return relative ? table + relative : null;
}

function offsetAt(buffer, table, field) {
  const at = fieldAt(buffer, table, field);
  return at === null ? null : at + buffer.readUInt32LE(at);
}

function findVictoryTable(buffer, id) {
  if (buffer.subarray(4, 8).toString('ascii') !== 'Vict') fail('Victory file is not Vict');
  const root = buffer.readUInt32LE(0);
  const wrapper = offsetAt(buffer, root, 0);
  const vector = offsetAt(buffer, wrapper, 0);
  const count = buffer.readUInt32LE(vector);
  for (let index = 0; index < count; index += 1) {
    const slot = vector + 4 + index * 4;
    const table = slot + buffer.readUInt32LE(slot);
    const idAt = fieldAt(buffer, table, 0);
    if (idAt !== null && buffer.readUInt16LE(idAt) === id) return table;
  }
  return null;
}

function findEntranceTable(buffer, id) {
  if (buffer.subarray(4, 8).toString('ascii') !== 'Entr') fail('Entrance file is not Entr');
  const root = buffer.readUInt32LE(0);
  for (let section = 0; section < 9; section += 1) {
    const wrapper = offsetAt(buffer, root, section);
    const vector = offsetAt(buffer, wrapper, 0);
    const count = buffer.readUInt32LE(vector);
    for (let index = 0; index < count; index += 1) {
      const slot = vector + 4 + index * 4;
      const table = slot + buffer.readUInt32LE(slot);
      const idAt = fieldAt(buffer, table, 0);
      if (idAt !== null && buffer.readUInt16LE(idAt) === id) return table;
    }
  }
  return null;
}

function readScalar(buffer, table, field, kind) {
  const at = fieldAt(buffer, table, field);
  if (at === null) return null;
  if (kind === 'u8') return buffer.readUInt8(at);
  if (kind === 'u16') return buffer.readUInt16LE(at);
  if (kind === 'u32') return buffer.readUInt32LE(at);
  if (kind === 'u64') return buffer.readBigUInt64LE(at);
  fail(`unknown scalar kind ${kind}`);
}

function writeScalar(buffer, table, field, kind, value) {
  const at = fieldAt(buffer, table, field);
  if (at === null) fail(`destination field ${field} is absent`);
  if (kind === 'u8') buffer.writeUInt8(Number(value), at);
  else if (kind === 'u16') buffer.writeUInt16LE(Number(value), at);
  else if (kind === 'u32') buffer.writeUInt32LE(Number(value), at);
  else if (kind === 'u64') buffer.writeBigUInt64LE(BigInt(value), at);
  else fail(`unknown scalar kind ${kind}`);
}

function copyRecordFields(sourceFile, destFile, finder, fields, id) {
  const source = fs.readFileSync(sourceFile);
  const dest = fs.readFileSync(destFile);
  const sourceTable = finder(source, id);
  const destTable = finder(dest, id);
  if (sourceTable === null) fail(`source ${sourceFile} does not contain ${id}`);
  if (destTable === null) fail(`destination ${destFile} does not contain ${id}`);
  const copied = {};
  for (const [field, kind] of fields) {
    const value = readScalar(source, sourceTable, field, kind);
    if (value === null) {
      copied[field] = null;
      continue;
    }
    writeScalar(dest, destTable, field, kind, value);
    copied[field] = typeof value === 'bigint' ? value.toString() : value;
  }
  fs.writeFileSync(destFile, dest);
  return copied;
}

function copyFile(sourceRoot, destRoot, relative) {
  const src = path.join(sourceRoot, relative);
  const dst = path.join(destRoot, relative);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function main() {
  const sourceRoot = path.resolve(process.argv[2] || '');
  const destRoot = path.resolve(process.argv[3] || '');
  if (!sourceRoot || !destRoot || !fs.existsSync(sourceRoot) || !fs.existsSync(destRoot)) {
    fail('Usage: node copy-working-14000-registration.js <working-extracted-root> <destination-BakeMe-root>');
  }
  const id = 14000;
  const victory = copyRecordFields(
    path.join(sourceRoot, 'Entrances', 'VictoryListData.jsfb'),
    path.join(destRoot, 'Entrances', 'VictoryListData.jsfb'),
    findVictoryTable,
    [[1, 'u32'], [2, 'u8'], [3, 'u64'], [4, 'u32'], [5, 'u32'], [6, 'u32'], [7, 'u32'], [8, 'u32'], [9, 'u32']],
    id
  );
  const entrance = copyRecordFields(
    path.join(sourceRoot, 'Entrances', 'EntranceListData.jsfb'),
    path.join(destRoot, 'Entrances', 'EntranceListData.jsfb'),
    findEntranceTable,
    [[1, 'u32'], [2, 'u8'], [3, 'u64'], [4, 'u32'], [5, 'u32'], [6, 'u32'], [7, 'u32'], [8, 'u32'], [9, 'u16']],
    id
  );
  for (const relative of [
    path.join('Audio', 'RA_LINES_PS', 'directory_listing.adb2'),
    path.join('Sdb', 'ARA.sdb'),
    path.join('Sdb', 'ENG.sdb'),
    path.join('Sdb', 'FRA.sdb'),
    path.join('Sdb', 'GER.sdb'),
    path.join('Sdb', 'ITA.sdb'),
    path.join('Sdb', 'SPA.sdb'),
  ]) {
    copyFile(sourceRoot, destRoot, relative);
  }
  console.log(JSON.stringify({ patchedId: id, victory, entrance, copiedSupportFiles: 7 }, null, 2));
}

main();
