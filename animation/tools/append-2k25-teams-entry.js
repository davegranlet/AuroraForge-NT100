'use strict';

// Clean-room appender for WWE 2K25 Stable/TeamsTable.jsfb (identifier: Team).
//
// Measured schema (from the user's CakeView oracle bake):
//   root table @16 -> field 0 -> vector @24 of N record tables.
//   Typical record (12 B, shared vtable, rels [6,8]):
//     f0 = u16 team index @+6, f1 = uoffset @+8 -> detail table.
//   Detail table (32 B, rels [6,8,12,16,20,24,28]):
//     f0 = u16 id @+6 (mirrors the record f0),
//     f1..f5 = uoffsets -> grandchild tables/string,
//     f6 = u32 scalar @+28.
// Records 0/1/2 carry their own vtables or sentinel IDs and are never
// used as templates.
//
// It clones a typical record PLUS a private copy of its detail table (both
// ID words patched; grandchild tables/string copied verbatim so every new
// offset stays forward), splices one vector slot (see
// tools/jsfb-append-lib.js), and validates: count +1, new row found with
// the patched ID, every pre-existing row re-parses identical.
// It deliberately does not use, copy, or require Tribute/PWM code or files.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

const DETAIL_PTR_FIELDS = [1, 2, 3, 4, 5];

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'Team');
  const vec = lib.followChain(buffer, root, [0]);
  return lib.readVector(buffer, vec);
}

function readRecord(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved) throw new Error(`appendTeamsEntry: not a table at ${table}`);
  if (resolved.osize !== 12) throw new Error(`appendTeamsEntry: record at ${table} is not 12 bytes`);
  const f0 = lib.fieldByIndex(resolved, 0);
  const f1 = lib.fieldByIndex(resolved, 1);
  if (!f0 || f0.size < 2 || !f1 || f1.size < 4) throw new Error(`appendTeamsEntry: record at ${table} lacks f0/f1`);
  const detail = f1.at + buffer.readUInt32LE(f1.at);
  return { table, vtable: resolved.vtable, teamId: buffer.readUInt16LE(f0.at), detail, detailFieldAt: f1.at };
}

function readDetail(buffer, detail) {
  const resolved = lib.tableAt(buffer, detail);
  if (!resolved) throw new Error(`appendTeamsEntry: not a table at detail ${detail}`);
  const words = {};
  for (const f of resolved.fields) words[f.field] = buffer.readUInt32LE(f.at);
  return { resolved, words };
}

function tryReadRecord(buffer, table) {
  try {
    return readRecord(buffer, table);
  } catch {
    return null;
  }
}

function findRecordByTeamId(buffer, vecInfo, teamId) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = tryReadRecord(buffer, table);
    if (rec && rec.teamId === (teamId & 0xffff)) return { index: i, ...rec };
  }
  return null;
}

function appendTeamsEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateTeamId, newTeamId } = options || {};
  if (templateTeamId === undefined || newTeamId === undefined) {
    throw new Error('appendTeamsEntry: templateTeamId and newTeamId are required');
  }
  if (newTeamId < 0 || newTeamId > 0xffff) throw new Error('appendTeamsEntry: newTeamId must fit u16');
  const vecInfo = locateRecords(buffer);
  if (findRecordByTeamId(buffer, vecInfo, newTeamId)) {
    throw new Error(`appendTeamsEntry: team id ${newTeamId} already exists; refusing duplicate`);
  }
  const template = findRecordByTeamId(buffer, vecInfo, templateTeamId);
  if (!template) throw new Error(`appendTeamsEntry: template team id ${templateTeamId} not found`);

  const detail = readDetail(buffer, template.detail);
  if (detail.resolved.osize !== 32) throw new Error('appendTeamsEntry: template detail is not 32 bytes; refusing');
  const detailFields = detail.resolved.fields.map((f) => f.field);
  for (const f of DETAIL_PTR_FIELDS) {
    if (!detailFields.includes(f)) throw new Error(`appendTeamsEntry: detail lacks pointer field f${f}`);
  }
  // Sanity: every pointer field must resolve to a plausible target.
  const grandchild = {};
  for (const f of DETAIL_PTR_FIELDS) {
    const field = lib.fieldByIndex(detail.resolved, f);
    const target = field.at + buffer.readUInt32LE(field.at);
    const asTable = lib.tableAt(buffer, target);
    const asString = target + 4 < buffer.length && buffer.readUInt32LE(target) < 500 &&
      target + 4 + buffer.readUInt32LE(target) <= buffer.length;
    if (!asTable && !asString) throw new Error(`appendTeamsEntry: detail f${f} target ${target} is implausible`);
    grandchild[f] = target;
  }
  const detailIdField = lib.fieldByIndex(detail.resolved, 0);
  if (!detailIdField || detailIdField.size < 2) throw new Error('appendTeamsEntry: detail lacks f0 id word');

  // Repair set: the extended vector's slots only (vector at file head; every
  // table/vtable/child lives after the insertion point and shifts uniformly).
  const refs = lib.collectSlots(buffer, vecInfo);

  // New chunk (4-aligned, every new offset forward): record (12) + detail
  // copy (32) + verbatim copies of the template's grandchildren (tables keep
  // their shared vtables via repointed soffs; their inner words target
  // unmoved addresses so they stay valid). Target->copy map preserves any
  // aliasing between the pointer fields.
  const align4 = (n) => (n + 3) & ~3;
  const copies = [];
  const copyOf = new Map();
  function addCopy(target, size, vtable) {
    if (copyOf.has(target)) return copyOf.get(target);
    const entry = { target, size, vtable, newPos: 0, chunkOff: 0, padSize: 0 };
    copies.push(entry);
    copyOf.set(target, entry);
    return entry;
  }
  for (const f of DETAIL_PTR_FIELDS) {
    const target = grandchild[f];
    const asTable = lib.tableAt(buffer, target);
    if (asTable) addCopy(target, asTable.osize, asTable.vtable);
    else addCopy(target, 4 + buffer.readUInt32LE(target), null);
  }
  let chunkSize = align4(12 + 32);
  for (const c of copies) {
    c.padSize = align4(c.size);
    c.chunkOff = chunkSize;
    chunkSize += c.padSize;
  }
  const newBytes = Buffer.alloc(chunkSize, 0);
  const spliced = lib.spliceAppend(buffer, vecInfo, newBytes, refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  const recPos = spliced.newTablePos;
  const detPos = recPos + 12;
  for (const c of copies) c.newPos = recPos + c.chunkOff;

  buffer.subarray(template.table, template.table + 12).copy(out, recPos);
  out.writeInt32LE(recPos - shift(template.vtable), recPos);
  out.writeUInt16LE(newTeamId & 0xffff, recPos + 6);
  out.writeUInt32LE(detPos - (recPos + 8), recPos + 8);

  buffer.subarray(template.detail, template.detail + 32).copy(out, detPos);
  out.writeInt32LE(detPos - shift(detail.resolved.vtable), detPos);
  const composite = buffer.readUInt16LE(detailIdField.at);
  if (composite !== (templateTeamId & 0xffff)) {
    throw new Error('appendTeamsEntry: template detail id does not mirror the template team id; refusing');
  }
  out.writeUInt16LE(newTeamId & 0xffff, detPos + (detailIdField.at - template.detail));
  for (const f of DETAIL_PTR_FIELDS) {
    const field = lib.fieldByIndex(detail.resolved, f);
    const entry = copyOf.get(grandchild[f]);
    const at = detPos + (field.at - template.detail);
    const value = entry.newPos - at;
    if (value < 0) throw new Error('appendTeamsEntry: backward offset after copy; refusing');
    out.writeUInt32LE(value, at);
  }
  for (const c of copies) {
    buffer.subarray(c.target, c.target + c.size).copy(out, c.newPos);
    if (c.vtable !== null) out.writeInt32LE(c.newPos - shift(c.vtable), c.newPos);
  }

  validateTeamsAppend(buffer, out, { beforeCount: vecInfo.count, newTeamId });
  return out;
}

function validateTeamsAppend(before, after, options) {
  const { beforeCount, newTeamId } = options;
  const beforeVec = locateRecords(before);
  const afterVec = locateRecords(after);
  if (afterVec.count !== beforeCount + 1) {
    throw new Error(`appendTeamsEntry: count ${afterVec.count} !== ${beforeCount + 1}`);
  }
  for (let i = 0; i < beforeCount; i++) {
    const aTable = beforeVec.tables[i];
    const bTable = afterVec.tables[i];
    const a = tryReadRecord(before, aTable);
    const b = tryReadRecord(after, bTable);
    if (!a || !b) {
      // Anomalous rows (own vtable / sentinel shape): raw bytes must survive.
      const ra = lib.tableAt(before, aTable);
      const rb = lib.tableAt(after, bTable);
      if (!ra || !rb || ra.osize !== rb.osize) throw new Error(`appendTeamsEntry: record ${i} shape changed`);
      for (let k = 0; k < ra.osize; k++) {
        if (before[aTable + k] !== after[bTable + k]) throw new Error(`appendTeamsEntry: record ${i} byte ${k} changed`);
      }
      continue;
    }
    if (a.teamId !== b.teamId) throw new Error(`appendTeamsEntry: record ${i} id changed`);
    const da = readDetail(before, a.detail);
    const db = readDetail(after, b.detail);
    for (const f of Object.keys(da.words)) {
      if (DETAIL_PTR_FIELDS.includes(Number(f))) continue;
      if (da.words[f] !== db.words[f]) throw new Error(`appendTeamsEntry: record ${i} detail f${f} changed`);
    }
    for (const f of DETAIL_PTR_FIELDS) {
      const fa = lib.fieldByIndex(da.resolved, Number(f));
      const fb = lib.fieldByIndex(db.resolved, Number(f));
      const ta = fa.at + before.readUInt32LE(fa.at);
      const tb = fb.at + after.readUInt32LE(fb.at);
      const ra = lib.tableAt(before, ta);
      const rb = lib.tableAt(after, tb);
      if (!!ra !== !!rb) throw new Error(`appendTeamsEntry: record ${i} detail f${f} target kind changed`);
      if (ra && (ra.osize !== rb.osize)) throw new Error(`appendTeamsEntry: record ${i} detail f${f} target size changed`);
    }
  }
  const created = findRecordByTeamId(after, afterVec, newTeamId);
  if (!created) throw new Error(`appendTeamsEntry: new team id ${newTeamId} not found after append`);
  const createdDetail = readDetail(after, created.detail);
  const idWord = after.readUInt16LE(lib.fieldByIndex(createdDetail.resolved, 0).at);
  if (idWord !== (newTeamId & 0xffff)) {
    throw new Error('appendTeamsEntry: new detail id word does not mirror the new team id');
  }
}

module.exports = { appendTeamsEntry, locateRecords, findRecordByTeamId };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-team-id') === undefined || get('--new-team-id') === undefined) {
    console.error('Usage: node append-2k25-teams-entry.js <input.jsfb> <output.jsfb> --template-team-id N --new-team-id N');
    process.exit(2);
  }
  try {
    const edited = appendTeamsEntry(source, { templateTeamId: get('--template-team-id'), newTeamId: get('--new-team-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
