'use strict';

// Clean-room appender for WWE 2K25 Roster/CharProfileTable.jsfb (identifier:
// Char). Measured schema: root table @12 -> field 0 -> vector @20 of N
// 12-byte outer records (vtable rels [6,8]: f0 low-u16 id @+6, f1 uoffset
// @+8) each pointing at a 92-byte child table. The mainstream child (810 of
// 821 rows) has the exact 42-field vtable rels below; its f2 u16 @+8 mirrors
// the outer f0, and fields 20-33 are uoffsets to nested tables/blobs.
//
// The oracle carries no 14000-range rows here, so the caller supplies the
// char id to mint. The writer clones outer + child, patches the two mirrored
// id words, and SHARES every nested target: the new chunk is placed
// immediately after the vector end (lib.spliceAppendAt), so all shared
// targets sit after the new fields and every offset stays forward.
// Refuses cleanly when the template's child vtable differs from measured.
// Validates: count +1, mirrored ids, every old row identical, every shared
// target content-equal, full ref-repair proof.
// Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

// Exact measured vtable rels of the mainstream 92-byte child (42 fields).
const CHILD_RELS = [0, 0, 8, 0, 12, 0, 16, 20, 24, 28, 32, 0, 0, 0, 0, 0, 10, 5, 0, 0,
  36, 40, 44, 48, 52, 56, 60, 64, 0, 68, 72, 76, 80, 84, 88, 0, 0, 6, 0, 0, 0, 7];
const CHILD_PTR_FIELDS = [20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33];
// Known child shapes: 2K25 mainstream (92/88) and 2K26 (116/110).
const CHILD_SHAPES = {
  '92:88': { osize: 92, vsize: 88, f2rel: 8, ptrFields: CHILD_PTR_FIELDS },
  '116:110': { osize: 116, vsize: 110, f2rel: 8, ptrFields: [4, 5, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 45, 47, 48] },
};

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'Char');
  const vec = lib.followChain(buffer, root, [0]);
  return { root, vecInfo: lib.readVector(buffer, vec) };
}

function readOuter(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved || resolved.osize !== 12 || resolved.vsize !== 8) return null;
  const f0 = lib.fieldByIndex(resolved, 0);
  const f1 = lib.fieldByIndex(resolved, 1);
  if (!f0 || f0.rel !== 6 || f0.size < 2 || !f1 || f1.rel !== 8 || f1.size < 4) return null;
  return {
    table, vtable: resolved.vtable, id: buffer.readUInt16LE(f0.at),
    child: f1.at + buffer.readUInt32LE(f1.at), childFieldAt: f1.at,
  };
}

function readChild(buffer, child) {
  const resolved = lib.tableAt(buffer, child);
  if (!resolved) return null;
  const shape = CHILD_SHAPES[`${resolved.osize}:${resolved.vsize}`];
  if (!shape) return null;
  if (shape.osize === 92) {
    const rels = [];
    for (let f = 0; f < 42; f++) {
      const field = lib.fieldByIndex(resolved, f);
      rels.push(field ? field.rel : 0);
    }
    for (let f = 0; f < 42; f++) {
      if (rels[f] !== CHILD_RELS[f]) return null;
    }
  }
  const f2 = lib.fieldByIndex(resolved, 2);
  if (!f2 || f2.size < 2) return null;
  return { child, vtable: resolved.vtable, osize: shape.osize, vsize: shape.vsize, ptrFields: shape.ptrFields, mirrorId: buffer.readUInt16LE(f2.at), f2rel: f2.rel };
}

// Version-agnostic: first outer record whose child matches the measured shape.
function pickTemplate(input) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { vecInfo } = locateRecords(buffer);
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const outer = readOuter(buffer, table);
    if (!outer) continue;
    if (!readChild(buffer, outer.child)) continue;
    return { templateCharId: outer.id };
  }
  return null;
}

function findByCharId(buffer, vecInfo, charId) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const outer = readOuter(buffer, table);
    if (!outer) continue;
    if (outer.id !== (charId & 0xffff)) continue;
    if (!readChild(buffer, outer.child)) continue;
    return { index: i, ...outer };
  }
  return null;
}

function appendCharProfileTableEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateCharId, newCharId } = options || {};
  if (templateCharId === undefined || newCharId === undefined) {
    throw new Error('appendCharProfileTableEntry: templateCharId and newCharId are required');
  }
  if (newCharId < 0 || newCharId > 0xffff) throw new Error('appendCharProfileTableEntry: newCharId must fit u16');
  const { root, vecInfo } = locateRecords(buffer);
  if (findByCharId(buffer, vecInfo, newCharId)) {
    throw new Error(`appendCharProfileTableEntry: char id ${newCharId} already exists; refusing duplicate`);
  }
  const template = findByCharId(buffer, vecInfo, templateCharId);
  if (!template) throw new Error(`appendCharProfileTableEntry: template char id ${templateCharId} not found (mainstream shape)`);
  const child = readChild(buffer, template.child);
  const childResolved = lib.tableAt(buffer, template.child);
  // Snapshot every pointer target's content for the share check.
  const targets = {};
  for (const f of child.ptrFields) {
    const field = lib.fieldByIndex(childResolved, f);
    const target = field.at + buffer.readUInt32LE(field.at);
    const asTable = lib.tableAt(buffer, target);
    targets[f] = { at: field.at, target, osize: asTable ? asTable.osize : null };
  }

  const refs = [
    ...lib.collectSlots(buffer, vecInfo),
    ...lib.collectRootSoff(buffer, root),
    ...lib.collectSoffs(buffer, vecInfo.tables),
  ];
  const spliced = lib.spliceAppendAt(buffer, vecInfo, 12 + child.osize, refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? spliced.delta : 0);
  const outerPos = spliced.chunkPos;
  const childPos = outerPos + 12;

  buffer.subarray(template.table, template.table + 12).copy(out, outerPos);
  out.writeInt32LE(outerPos - shift(template.vtable), outerPos);
  out.writeUInt16LE(newCharId & 0xffff, outerPos + 6);
  out.writeUInt32LE(childPos - (outerPos + 8), outerPos + 8);

  buffer.subarray(template.child, template.child + child.osize).copy(out, childPos);
  out.writeInt32LE(childPos - shift(child.vtable), childPos);
  out.writeUInt16LE(newCharId & 0xffff, childPos + child.f2rel);
  for (const f of child.ptrFields) {
    const field = lib.fieldByIndex(childResolved, f);
    const at = childPos + (field.at - template.child);
    const value = shift(targets[f].target) - at;
    if (value < 0) throw new Error('appendCharProfileTableEntry: backward offset; refusing');
    out.writeUInt32LE(value, at);
  }
  // New slot -> new outer.
  out.writeUInt32LE(outerPos - spliced.newSlotPos, spliced.newSlotPos);

  validateTableAppend(buffer, out, {
    beforeCount: vecInfo.count, newCharId, refs,
    insertAt: spliced.insertAt, delta: spliced.delta, targets,
  });
  return out;
}

function targetContent(buffer, target, osize) {
  if (osize !== null) return buffer.subarray(target, target + osize).toString('hex');
  // Opaque blob: compare a bounded window (blobs are small by construction;
  // the share check keys on the pointer target resolving identically).
  return buffer.subarray(target, Math.min(target + 256, buffer.length)).toString('hex');
}

function validateTableAppend(before, after, options) {
  const { beforeCount, newCharId, refs, insertAt, delta, targets } = options;
  const a = locateRecords(before);
  const b = locateRecords(after);
  if (b.vecInfo.count !== beforeCount + 1) throw new Error('appendCharProfileTableEntry: count validation failed');
  for (let i = 0; i < beforeCount; i++) {
    const oa = readOuter(before, a.vecInfo.tables[i]);
    const ob = readOuter(after, b.vecInfo.tables[i]);
    if (!oa || !ob) {
      // Atypical outer shape (e.g. the obs8 variant): raw bytes must survive.
      const ra = lib.tableAt(before, a.vecInfo.tables[i]);
      const rb = lib.tableAt(after, b.vecInfo.tables[i]);
      if (!ra || !rb || ra.osize !== rb.osize) throw new Error(`appendCharProfileTableEntry: row ${i} shape changed`);
      for (let k = 0; k < ra.osize; k++) {
        if (before[a.vecInfo.tables[i] + k] !== after[b.vecInfo.tables[i] + k]) {
          throw new Error(`appendCharProfileTableEntry: row ${i} byte ${k} changed`);
        }
      }
      continue;
    }
    if (oa.id !== ob.id) throw new Error(`appendCharProfileTableEntry: row ${i} changed`);
    const oaChild = readChild(before, oa.child);
    const obChild = readChild(after, ob.child);
    const childSize = oaChild ? oaChild.osize : 92;
    if (!before.subarray(oa.child, oa.child + childSize).equals(after.subarray(ob.child, ob.child + childSize))) {
      throw new Error(`appendCharProfileTableEntry: row ${i} child changed`);
    }
  }
  const created = findByCharId(after, b.vecInfo, newCharId);
  if (!created || created.index !== beforeCount) throw new Error('appendCharProfileTableEntry: new row validation failed');
  const createdChild = readChild(after, created.child);
  if (!createdChild || createdChild.mirrorId !== (newCharId & 0xffff)) {
    throw new Error('appendCharProfileTableEntry: mirrored id validation failed');
  }
  const createdResolved = lib.tableAt(after, created.child);
  const shift = (p) => p + (p >= insertAt ? delta : 0);
  for (const f of Object.keys(targets).map(Number)) {
    const field = lib.fieldByIndex(createdResolved, f);
    const target = field.at + after.readUInt32LE(field.at);
    if (target !== shift(targets[f].target)) {
      throw new Error(`appendCharProfileTableEntry: shared target f${f} moved`);
    }
    const want = targetContent(before, targets[f].target, targets[f].osize);
    const got = targetContent(after, target, targets[f].osize);
    if (want !== got) throw new Error(`appendCharProfileTableEntry: shared target f${f} content changed`);
  }
  const verified = lib.verifyRefs(before, after, refs, insertAt, delta);
  if (verified < 100) throw new Error(`appendCharProfileTableEntry: too few refs verified (${verified})`);
}

module.exports = { appendCharProfileTableEntry, pickTemplate, locateRecords, findByCharId };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-char-id') === undefined || get('--new-char-id') === undefined) {
    console.error('Usage: node append-2k25-charprofiletable-entry.js <input.jsfb> <output.jsfb> --template-char-id N --new-char-id N');
    process.exit(2);
  }
  try {
    const edited = appendCharProfileTableEntry(source, { templateCharId: get('--template-char-id'), newCharId: get('--new-char-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
