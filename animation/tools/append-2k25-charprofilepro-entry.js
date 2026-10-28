'use strict';

// Clean-room appender for WWE 2K25 Roster/CharProfilePro.jsfb (identifier:
// Char). Measured schema: root table @16 -> field 0 -> vector @24 of N
// record tables (no wrapper). Dominant shape (401 of 709): 32-byte table,
// 8-field vtable (f0/f1/f3 = u16 char id @+6/+8/+10, f2/f4 = uoffsets to
// empty vectors, f5 = uoffset to a 2-u32 vector, f6 = uoffset to a 12-byte
// child table with two 20-byte blobs, f7 = u32 sentinel 0xFFFFFFFF).
//
// The oracle carries no 14000-range rows here (CakeView did not extend this
// table for dance entries), so the caller supplies the char id to mint;
// the writer clones the dominant shape and patches only the three mirrored
// id words. New nested blobs are private copies, so every offset is forward.
// Validates: count +1, new ids correct, every old row fully identical.
// Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'Char');
  const vec = lib.followChain(buffer, root, [0]);
  return { root, vecInfo: lib.readVector(buffer, vec) };
}

function readRecord(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved || resolved.osize !== 32 || resolved.vsize !== 20) return null;
  const ids = [];
  for (const f of [0, 1, 3]) {
    const field = lib.fieldByIndex(resolved, f);
    if (!field || field.size < 2) return null;
    ids.push(buffer.readUInt16LE(field.at));
  }
  const ptrs = {};
  for (const f of [2, 4, 5, 6]) {
    const field = lib.fieldByIndex(resolved, f);
    if (!field || field.size < 4) return null;
    ptrs[f] = { at: field.at, target: field.at + buffer.readUInt32LE(field.at) };
  }
  const f7 = lib.fieldByIndex(resolved, 7);
  if (!f7) return null;
  return { table, vtable: resolved.vtable, ids, ptrs, sentinel: buffer.readUInt32LE(f7.at) };
}

function findByCharId(buffer, vecInfo, charId) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = readRecord(buffer, table);
    if (rec && rec.ids[0] === (charId & 0xffff)) return { index: i, ...rec };
  }
  return null;
}

function appendCharProfileProEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateCharId, newCharId } = options || {};
  if (templateCharId === undefined || newCharId === undefined) {
    throw new Error('appendCharProfileProEntry: templateCharId and newCharId are required');
  }
  if (newCharId < 0 || newCharId > 0xffff) throw new Error('appendCharProfileProEntry: newCharId must fit u16');
  const { root, vecInfo } = locateRecords(buffer);
  if (findByCharId(buffer, vecInfo, newCharId)) {
    throw new Error(`appendCharProfileProEntry: char id ${newCharId} already exists; refusing duplicate`);
  }
  const template = findByCharId(buffer, vecInfo, templateCharId);
  if (!template) throw new Error(`appendCharProfileProEntry: template char id ${templateCharId} not found (dominant shape)`);
  if (!(template.ids[0] === template.ids[1] && template.ids[1] === template.ids[2])) {
    throw new Error('appendCharProfileProEntry: template id words do not mirror; refusing');
  }
  // Sanity on nested shapes: f2/f4 -> empty vectors, f5 -> len-2 u32 vector,
  // f6 -> 12-byte child with two 20-byte blob targets.
  for (const f of [2, 4]) {
    if (buffer.readUInt32LE(template.ptrs[f].target) !== 0) {
      throw new Error(`appendCharProfileProEntry: template f${f} is not an empty vector; refusing`);
    }
  }
  const f5len = buffer.readUInt32LE(template.ptrs[5].target);
  if (f5len !== 2) throw new Error('appendCharProfileProEntry: template f5 is not a len-2 vector; refusing');
  const child = lib.tableAt(buffer, template.ptrs[6].target);
  if (!child || child.osize !== 12) throw new Error('appendCharProfileProEntry: template child is not 12 bytes; refusing');
  const cf0 = lib.fieldByIndex(child, 0);
  const cf1 = lib.fieldByIndex(child, 1);
  if (!cf0 || !cf1) throw new Error('appendCharProfileProEntry: template child lacks f0/f1');
  const blob0 = cf0.at + buffer.readUInt32LE(cf0.at);
  const blob1 = cf1.at + buffer.readUInt32LE(cf1.at);

  const refs = [
    ...lib.collectSlots(buffer, vecInfo),
    ...lib.collectRootSoff(buffer, root),
    ...lib.collectSoffs(buffer, vecInfo.tables),
  ];
  // Chunk (all adjacent/forward): record 32 + f2vec 4 + f4vec 4 + f5vec 12
  // + child 12 + blob0 20 + blob1 20 = 104 bytes.
  const NSIZE = 32 + 4 + 4 + 12 + 12 + 20 + 20;
  const spliced = lib.spliceAppend(buffer, vecInfo, Buffer.alloc(NSIZE, 0), refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  const recPos = spliced.newTablePos;
  let cur = recPos + 32;
  const f2Pos = cur; cur += 4;
  const f4Pos = cur; cur += 4;
  const f5Pos = cur; cur += 12;
  const childPos = cur; cur += 12;
  const blob0Pos = cur; cur += 20;
  const blob1Pos = cur; cur += 20;

  buffer.subarray(template.table, template.table + 32).copy(out, recPos);
  out.writeInt32LE(recPos - shift(template.vtable), recPos);
  out.writeUInt16LE(newCharId & 0xffff, recPos + 6);
  out.writeUInt16LE(newCharId & 0xffff, recPos + 8);
  out.writeUInt16LE(newCharId & 0xffff, recPos + 10);
  const setPtr = (f, target) => {
    const at = recPos + (template.ptrs[f].at - template.table);
    const value = target - at;
    if (value < 0) throw new Error('appendCharProfileProEntry: backward offset; refusing');
    out.writeUInt32LE(value, at);
  };
  setPtr(2, f2Pos);
  setPtr(4, f4Pos);
  setPtr(5, f5Pos);
  setPtr(6, childPos);
  out.writeUInt32LE(0, f2Pos);
  out.writeUInt32LE(0, f4Pos);
  buffer.subarray(template.ptrs[5].target, template.ptrs[5].target + 12).copy(out, f5Pos);
  buffer.subarray(template.ptrs[6].target, template.ptrs[6].target + 12).copy(out, childPos);
  out.writeInt32LE(childPos - shift(child.vtable), childPos);
  const setChildPtr = (cf, target) => {
    const at = childPos + (cf.at - template.ptrs[6].target);
    const value = target - at;
    if (value < 0) throw new Error('appendCharProfileProEntry: backward child offset; refusing');
    out.writeUInt32LE(value, at);
  };
  setChildPtr(cf0, blob0Pos);
  setChildPtr(cf1, blob1Pos);
  buffer.subarray(blob0, blob0 + 20).copy(out, blob0Pos);
  buffer.subarray(blob1, blob1 + 20).copy(out, blob1Pos);

  validateProAppend(buffer, out, { beforeCount: vecInfo.count, newCharId });
  return out;
}

function snapshot(buffer, vecInfo) {
  const rows = [];
  for (let i = 0; i < vecInfo.count; i++) {
    const rec = readRecord(buffer, vecInfo.tables[i]);
    if (!rec) { rows.push(null); continue; }
    const nested = [];
    for (const f of [2, 4, 5]) nested.push(buffer.subarray(rec.ptrs[f].target, rec.ptrs[f].target + (f === 5 ? 12 : 4)).toString('hex'));
    const child = lib.tableAt(buffer, rec.ptrs[6].target);
    const cf0 = lib.fieldByIndex(child, 0);
    const cf1 = lib.fieldByIndex(child, 1);
    const b0 = cf0.at + buffer.readUInt32LE(cf0.at);
    const b1 = cf1.at + buffer.readUInt32LE(cf1.at);
    nested.push(buffer.subarray(b0, b0 + 20).toString('hex'));
    nested.push(buffer.subarray(b1, b1 + 20).toString('hex'));
    rows.push({ ids: rec.ids, sentinel: rec.sentinel, nested });
  }
  return rows;
}

function validateProAppend(before, after, options) {
  const { beforeCount, newCharId } = options;
  const a = locateRecords(before);
  const b = locateRecords(after);
  if (b.vecInfo.count !== beforeCount + 1) throw new Error('appendCharProfileProEntry: count validation failed');
  const ra = snapshot(before, a.vecInfo);
  const rb = snapshot(after, b.vecInfo);
  for (let i = 0; i < beforeCount; i++) {
    if (JSON.stringify(ra[i]) !== JSON.stringify(rb[i])) {
      throw new Error(`appendCharProfileProEntry: record ${i} changed`);
    }
  }
  if (!rb[beforeCount] || rb[beforeCount].ids.some((id) => id !== (newCharId & 0xffff))) {
    throw new Error('appendCharProfileProEntry: new record validation failed');
  }
}

module.exports = { appendCharProfileProEntry, locateRecords, findByCharId };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-char-id') === undefined || get('--new-char-id') === undefined) {
    console.error('Usage: node append-2k25-charprofilepro-entry.js <input.jsfb> <output.jsfb> --template-char-id N --new-char-id N');
    process.exit(2);
  }
  try {
    const edited = appendCharProfileProEntry(source, { templateCharId: get('--template-char-id'), newCharId: get('--new-char-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
