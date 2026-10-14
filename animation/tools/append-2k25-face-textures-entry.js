'use strict';

// Clean-room appender for WWE 2K25 Roster/FaceTextures.jsfb (identifier:
// Play). Measured schema: root table @20 -> field 0 -> vector @28 of N
// 12-byte records [soff, pad u16, f0 u16 id @+6, f1 uoffset @+8] where f1
// points at a per-record sub-vector (count + slots) of child tables. The
// common child (545 of 550 records) is 12 bytes holding one u64 face hash.
//
// It clones a single-child template record TOGETHER with a private copy of
// its sub-vector and child (hash cloned verbatim — the face hash for a new
// entry is not derivable from the motion id and can be calibrated later),
// patches only the top id, splices one top vector slot, and validates:
// count +1, new row + child correct, every old row and child identical.
// Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'Play');
  const vec = lib.followChain(buffer, root, [0]);
  return lib.readVector(buffer, vec);
}

function readSubVector(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved || resolved.osize !== 12) return null;
  const f0 = lib.fieldByIndex(resolved, 0);
  const f1 = lib.fieldByIndex(resolved, 1);
  if (!f0 || f0.size < 2 || !f1 || f1.size < 4) return null;
  const sub = f1.at + buffer.readUInt32LE(f1.at);
  const count = buffer.readUInt32LE(sub);
  if (sub + 4 + count * 4 > buffer.length) return null;
  const children = [];
  for (let i = 0; i < count; i++) {
    const slot = sub + 4 + i * 4;
    children.push(slot + buffer.readUInt32LE(slot));
  }
  return {
    table, vtable: resolved.vtable, id: buffer.readUInt16LE(f0.at),
    sub, subCount: count, children,
  };
}

function findById(buffer, vecInfo, id) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = readSubVector(buffer, table);
    if (rec && rec.id === (id & 0xffff)) return { index: i, ...rec };
  }
  return null;
}

function appendFaceTexturesEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateId, newId } = options || {};
  if (templateId === undefined || newId === undefined) {
    throw new Error('appendFaceTexturesEntry: templateId and newId are required');
  }
  if (newId < 0 || newId > 0xffff) throw new Error('appendFaceTexturesEntry: newId must fit u16');
  const vecInfo = locateRecords(buffer);
  if (findById(buffer, vecInfo, newId)) {
    throw new Error(`appendFaceTexturesEntry: id ${newId} already exists; refusing duplicate`);
  }
  const template = findById(buffer, vecInfo, templateId);
  if (!template) throw new Error(`appendFaceTexturesEntry: template id ${templateId} not found`);
  if (template.subCount !== 1) {
    throw new Error('appendFaceTexturesEntry: template must carry exactly one child; refusing');
  }
  const childTable = template.children[0];
  const childResolved = lib.tableAt(buffer, childTable);
  if (!childResolved || childResolved.osize !== 12) {
    throw new Error('appendFaceTexturesEntry: template child is not the 12-byte single-hash shape; refusing');
  }
  const childBytes = buffer.subarray(childTable, childTable + 12);

  const { root } = lib.readHeader(buffer, 'Play');
  const refs = [
    ...lib.collectSlots(buffer, vecInfo),
    ...lib.collectRootSoff(buffer, root),
    ...lib.collectSoffs(buffer, vecInfo.tables),
  ];
  // Chunk: record (12) + sub-vector (8) + child (12). All offsets forward.
  const chunk = Buffer.alloc(12 + 8 + 12, 0);
  const spliced = lib.spliceAppend(buffer, vecInfo, chunk, refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  const recPos = spliced.newTablePos;
  const subPos = recPos + 12;
  const childPos = subPos + 8;

  buffer.subarray(template.table, template.table + 12).copy(out, recPos);
  out.writeInt32LE(recPos - shift(template.vtable), recPos);
  out.writeUInt16LE(newId & 0xffff, recPos + 6);
  out.writeUInt32LE(subPos - (recPos + 8), recPos + 8);

  out.writeUInt32LE(1, subPos);
  out.writeUInt32LE(childPos - (subPos + 4), subPos + 4);

  childBytes.copy(out, childPos);
  out.writeInt32LE(childPos - shift(childResolved.vtable), childPos);

  validateFaceAppend(buffer, out, { beforeCount: vecInfo.count, newId });
  return out;
}

function snapshot(buffer, vecInfo) {
  const rows = [];
  for (let i = 0; i < vecInfo.count; i++) {
    const rec = readSubVector(buffer, vecInfo.tables[i]);
    if (!rec) throw new Error(`appendFaceTexturesEntry: record ${i} unreadable`);
    const kids = rec.children.map((c) => {
      const r = lib.tableAt(buffer, c);
      if (!r) throw new Error('appendFaceTexturesEntry: child unreadable');
      return buffer.subarray(c, c + r.osize).toString('hex');
    });
    rows.push({ id: rec.id, kids });
  }
  return rows;
}

function validateFaceAppend(before, after, options) {
  const { beforeCount, newId } = options;
  const beforeVec = locateRecords(before);
  const afterVec = locateRecords(after);
  if (afterVec.count !== beforeCount + 1) throw new Error('appendFaceTexturesEntry: count validation failed');
  const a = snapshot(before, beforeVec);
  const b = snapshot(after, afterVec);
  for (let i = 0; i < beforeCount; i++) {
    if (a[i].id !== b[i].id || a[i].kids.join('|') !== b[i].kids.join('|')) {
      throw new Error(`appendFaceTexturesEntry: record ${i} changed`);
    }
  }
  if (b[beforeCount].id !== (newId & 0xffff)) throw new Error('appendFaceTexturesEntry: new record validation failed');
  if (b[beforeCount].kids.length !== 1) throw new Error('appendFaceTexturesEntry: new child validation failed');
}

module.exports = { appendFaceTexturesEntry, locateRecords, findById };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-id') === undefined || get('--new-id') === undefined) {
    console.error('Usage: node append-2k25-face-textures-entry.js <input.jsfb> <output.jsfb> --template-id N --new-id N');
    process.exit(2);
  }
  try {
    const edited = appendFaceTexturesEntry(source, { templateId: get('--template-id'), newId: get('--new-id') });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
