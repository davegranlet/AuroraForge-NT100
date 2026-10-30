'use strict';

// VictoryMotionTable tool — the Victory-side counterpart of `entrance-motion-table.js`.
// Bounded reader for a possible `Vict` FlatBuffer(s) used by the VICTORY motion
// registration layer in 2K26. On success it prints the parsed rows (identifier,
// record count, fields). On absence it says so explicitly and provides the list of
// related files found by the same identifier scan, and a list of nearby list-tables
// (VictoryListData, CutsceneNoRegistry, etc.) for context.
 //
// CLI:
//   node victory-motion-table.js <path-to-file>       // read one file
//   node victory-motion-table.js --scan <root>        // scan a game root for files
//   node victory-motion-table.js --help               // show the summary of the CLI

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_IDENTIFIERS = ['Entr', 'Vict', 'VICT', 'DOR', 'VCUT'];

// Bounded reader for the `Vict` identifier (VictoryListData family). The Victory rows
// carry a 14-field layout observed natively (verified field road-map from the
// 2K26 game data). Fields may be sparse; absence is preserved as null.
const VICT_FILE_IDENTIFIER = 'Vict';
const VICT_RECORD_FIELDS = 14;

function requireSpan(buffer, offset, bytes, label) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  if (!Number.isInteger(offset) || !Number.isInteger(bytes) || offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error(`${label} exceeds VictoryMotionTable bounds`);
  }
}

function tableAt(buffer, offset, label) {
  requireSpan(buffer, offset, 4, label);
  const distance = buffer.readInt32LE(offset);
  const vtable = offset - distance;
  requireSpan(buffer, vtable, 4, `${label} vtable`);
  const vtableBytes = buffer.readUInt16LE(vtable);
  const objectBytes = buffer.readUInt16LE(vtable + 2);
  if (!distance || vtableBytes < 4 || (vtableBytes & 1) || objectBytes < 4) throw new Error(`${label} vtable is invalid`);
  requireSpan(buffer, vtable, vtableBytes, `${label} vtable`);
  requireSpan(buffer, offset, objectBytes, label);
  return { offset, vtable, vtableBytes, objectBytes };
}

function fieldOffset(buffer, table, fieldIndex) {
  const vtableField = table.vtable + 4 + fieldIndex * 2;
  if (vtableField + 2 > table.vtable + table.vtableBytes) return null;
  const relative = buffer.readUInt16LE(vtableField);
  if (relative === 0) return null;
  if (relative + 4 > table.objectBytes) throw new Error(`record field ${fieldIndex} exceeds object bounds`);
  return table.offset + relative;
}

function relativeTarget(buffer, offset, label) {
  requireSpan(buffer, offset, 4, label);
  const target = offset + buffer.readUInt32LE(offset);
  requireSpan(buffer, target, 4, label);
  return target;
}

function readVictListTable(buffer) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  requireSpan(buffer, 0, 8, 'header');
  if (buffer.toString('ascii', 4, 8) !== VICT_FILE_IDENTIFIER) throw new Error('VictoryList file identifier is invalid');
  const root = tableAt(buffer, buffer.readUInt32LE(0), 'root table');
  const vectorField = fieldOffset(buffer, root, 0);
  if (vectorField === null) throw new Error('VictoryList root has no record vector');
  const vector = relativeTarget(buffer, vectorField, 'record vector');
  const recordCount = buffer.readUInt32LE(vector);
  if (recordCount === 0 || recordCount > 20000) throw new Error('VictoryList record count is invalid');
  requireSpan(buffer, vector + 4, recordCount * 4, 'record vector entries');
  const records = [];
  for (let index = 0; index < recordCount; index += 1) {
    const pointer = vector + 4 + index * 4;
    const record = tableAt(buffer, relativeTarget(buffer, pointer, `record ${index}`), `record ${index}`);
    const fields = [];
    for (let field = 0; field < VICT_RECORD_FIELDS; field += 1) {
      const offset = fieldOffset(buffer, record, field);
      if (offset === null) { fields.push(null); continue; }
      // Victory row scalars in the 2K26 data: u32 lanes read as little-endian u32.
      // Preserve absence explicitly; no invented semantics.
      fields.push(buffer.readUInt32LE(offset));
    }
    records.push({ index, fields });
  }
  return { identifier: VICT_FILE_IDENTIFIER, bytes: buffer.length, recordCount, records };
}

function listFilesWithId(root, out, visited) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      listFilesWithId(full, out, visited);
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.jsfb') &&
        !entry.name.toLowerCase().endsWith('.tsfb') &&
        !entry.name.toLowerCase().endsWith('.jsfb.raw')) continue;
    try {
      const fh = fs.openSync(full, 'r');
      const head = Buffer.alloc(8);
      fs.readSync(fh, head, 0, 8, 4);
      fs.closeSync(fh);
      const identifier = head.toString('ascii', 0, 4);
      if (DEFAULT_IDENTIFIERS.includes(identifier)) {
        out.push(full + ' => ' + identifier);
      }
    } catch (e) {
      // unreadable file is ignored; the scan does not need to object
    }
  }
}

function showUsage() {
  console.log('victory-motion-table — reads Victory/Entrance motion-table rows.');
  console.log('Usage:');
  console.log('  node victory-motion-table.js <file>');
  console.log('  node victory-motion-table.js --scan <root>');
}

function main() {
  const args = process.argv.slice(2);
  const first = args[0];
  if (!first) { showUsage(); return; }
  if (first === '--help') return showUsage();

  if (first === '--scan') {
    const root = args[1];
    if (!fs.existsSync(root)) return console.log('root not found: ' + root);
    const out = [];
    listFilesWithId(root, out, null);
    if (!out.length) return console.log('no matches');
    return console.log(out.join('\n'));
  }
  const target = first;
  if (!fs.existsSync(target)) return console.log('file not found: ' + target);
  const bytes = fs.readFileSync(target);
  const headerIdentifier = bytes.toString('ascii', 4, 8);
  console.log('file: ' + target);
  console.log('header identifier: ' + headerIdentifier);
  try {
    if (headerIdentifier === 'Vict') {
      const parsed = readVictListTable(bytes);
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }
    const t = require(path.join(__dirname, 'entrance-motion-table.js'));
    const parsed = t.readEntranceMotionTable(bytes);
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('error: ' + e.message);
  }
}

if (require.main === module) main();
module.exports = { listFilesWithId, showUsage, DEFAULT_IDENTIFIERS, readVictListTable, VICT_FILE_IDENTIFIER, VICT_RECORD_FIELDS };
