'use strict';

// Clean-room appender for WWE 2K25 Characters/CharacterMapping.jsfb
// (identifier: Char). Measured schema: root table @20 -> field 0 ->
// vector @28 of N inline-scalar record tables. Dominant shape (241 of 832
// records): 64-byte table, 12-field vtable (f0 = u16 id @+6, f1 absent,
// f2..f7/f11 = u64 hashes). No children, no strings.
//
// It clones a dominant-shape record, patches only the u16 id, splices one
// vector slot, and validates: count +1, new record found, every old record
// byte-identical. Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'Char');
  if (root !== 20) throw new Error('appendCharacterMappingEntry: unexpected root (not 20)');
  const vec = lib.followChain(buffer, root, [0]);
  if (vec !== 28) throw new Error('appendCharacterMappingEntry: unexpected vector (not 28)');
  return lib.readVector(buffer, vec);
}

function readId(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved) return null;
  const f0 = lib.fieldByIndex(resolved, 0);
  if (!f0 || f0.size < 2) return null;
  return { vtable: resolved.vtable, osize: resolved.osize, id: buffer.readUInt16LE(f0.at) };
}

function findById(buffer, vecInfo, id) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = readId(buffer, table);
    if (rec && rec.id === (id & 0xffff) && rec.osize === 64) return { index: i, table, ...rec };
  }
  return null;
}

function appendCharacterMappingEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateId, newId } = options || {};
  if (templateId === undefined || newId === undefined) {
    throw new Error('appendCharacterMappingEntry: templateId and newId are required');
  }
  if (newId < 0 || newId > 0xffff) throw new Error('appendCharacterMappingEntry: newId must fit u16');
  const vecInfo = locateRecords(buffer);
  if (findById(buffer, vecInfo, newId)) {
    throw new Error(`appendCharacterMappingEntry: id ${newId} already exists; refusing duplicate`);
  }
  const template = findById(buffer, vecInfo, templateId);
  if (!template) throw new Error(`appendCharacterMappingEntry: template id ${templateId} not found (dominant 64-byte shape)`);
  const templateBytes = buffer.subarray(template.table, template.table + 64);

  const refs = lib.collectSlots(buffer, vecInfo);
  const spliced = lib.spliceAppend(buffer, vecInfo, Buffer.alloc(64, 0), refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  const pos = spliced.newTablePos;
  templateBytes.copy(out, pos);
  out.writeInt32LE(pos - shift(template.vtable), pos);
  out.writeUInt16LE(newId & 0xffff, pos + 6);

  const afterVec = locateRecords(out);
  if (afterVec.count !== vecInfo.count + 1) throw new Error('appendCharacterMappingEntry: count validation failed');
  const created = findById(out, afterVec, newId);
  if (!created || created.index !== vecInfo.count) throw new Error('appendCharacterMappingEntry: new record validation failed');
  for (let i = 0; i < vecInfo.count; i++) {
    const ra = lib.tableAt(buffer, vecInfo.tables[i]);
    const rb = lib.tableAt(out, afterVec.tables[i]);
    if (!ra || !rb || ra.osize !== rb.osize) throw new Error(`appendCharacterMappingEntry: record ${i} shape changed`);
    const a = buffer.subarray(vecInfo.tables[i], vecInfo.tables[i] + ra.osize);
    const b = out.subarray(afterVec.tables[i], afterVec.tables[i] + ra.osize);
    if (!a.equals(b)) throw new Error(`appendCharacterMappingEntry: record ${i} changed`);
  }
  return out;
}

module.exports = { appendCharacterMappingEntry, locateRecords, findById };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-id') === undefined || get('--new-id') === undefined) {
    console.error('Usage: node append-2k25-character-mapping-entry.js <input.jsfb> <output.jsfb> --template-id N --new-id N');
    process.exit(2);
  }
  try {
    const edited = appendCharacterMappingEntry(source, { templateId: get('--template-id'), newId: get('--new-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
