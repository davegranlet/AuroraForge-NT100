'use strict';

// Clean-room appender for WWE 2K25 MoveData/CAMMoveData.jsfb (identifier:
// CMov). Measured schema: root table @12 -> field 0 -> vector @20 of N
// record tables with PER-RECORD vtables (usually 116-byte vtables, 56 field
// slots). The motion id lives as the LOW u16 of the 8-byte f3 payload
// (rel 60 in the 80-byte Entrance class, rel 72 in the 100-byte Victory
// class; oracle witnesses: idx13347 f3=14001, idx9805 f3=14003).
//
// It clones a caller-chosen template record (exact vtable-shape match
// required), copies its vtable bytes verbatim, patches only f3's low u16,
// splices one vector slot, and validates: count +1, new f3 id correct,
// every old record byte-identical. Clean-room: no Tribute/PWM code/files.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateRecords(buffer) {
  const { root } = lib.readHeader(buffer, 'CMov');
  const vec = lib.followChain(buffer, root, [0]);
  return lib.readVector(buffer, vec);
}

function readMotionId(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved) return null;
  const f3 = lib.fieldByIndex(resolved, 3);
  if (!f3 || f3.size < 2) return null;
  return {
    vtable: resolved.vtable, vsize: resolved.vsize, osize: resolved.osize,
    f3rel: f3.rel, motionId: buffer.readUInt16LE(f3.at),
  };
}

function findByMotionId(buffer, vecInfo, motionId, vsize, osize) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = readMotionId(buffer, table);
    if (rec && rec.motionId === (motionId & 0xffff) && rec.vsize === vsize && rec.osize === osize) {
      return { index: i, table, ...rec };
    }
  }
  return null;
}

function appendCAMMoveEntry(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { templateMotionId, newId, vsize, osize } = options || {};
  if (templateMotionId === undefined || newId === undefined) {
    throw new Error('appendCAMMoveEntry: templateMotionId and newId are required');
  }
  if (newId < 0 || newId > 0xffff) throw new Error('appendCAMMoveEntry: newId must fit u16');
  const vecInfo = locateRecords(buffer);
  if (vsize === undefined || osize === undefined) {
    throw new Error('appendCAMMoveEntry: templateMotionId, vsize and osize are required');
  }
  const template = findByMotionId(buffer, vecInfo, templateMotionId, vsize, osize);
  if (!template) throw new Error(`appendCAMMoveEntry: template motion ${templateMotionId} with shape ${vsize}/${osize} not found`);
  if (findByMotionId(buffer, vecInfo, newId, vsize, osize)) {
    throw new Error(`appendCAMMoveEntry: motion ${newId} already exists in shape ${vsize}/${osize}; refusing duplicate`);
  }
  const vtableBytes = buffer.subarray(template.vtable, template.vtable + vsize);
  const tableBytes = buffer.subarray(template.table, template.table + osize);
  if ((vsize & 3) !== 0 || (osize & 3) !== 0) throw new Error('appendCAMMoveEntry: unaligned vtable/table; refusing');

  const { root } = lib.readHeader(buffer, 'CMov');
  const refs = [
    ...lib.collectSlots(buffer, vecInfo),
    ...lib.collectRootSoff(buffer, root),
    ...lib.collectSoffs(buffer, vecInfo.tables),
  ];
  const chunk = Buffer.concat([vtableBytes, tableBytes]);
  const spliced = lib.spliceAppend(buffer, vecInfo, chunk, refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  void shift;
  const newVtable = spliced.newTablePos;
  const newTable = newVtable + vsize;
  // The chunk leads with the vtable copy, so repoint the new slot past it.
  out.writeUInt32LE(newTable - spliced.newSlotPos, spliced.newSlotPos);
  // vtable copy needs no fixups (pure data); repoint the new table at it.
  out.writeInt32LE(newTable - newVtable, newTable);
  const f3at = newTable + template.f3rel;
  out.writeUInt16LE(newId & 0xffff, f3at);

  const afterVec = locateRecords(out);
  if (afterVec.count !== vecInfo.count + 1) throw new Error('appendCAMMoveEntry: count validation failed');
  const created = readMotionId(out, afterVec.tables[vecInfo.count]);
  if (!created || created.motionId !== (newId & 0xffff) || created.vsize !== vsize || created.osize !== osize) {
    throw new Error('appendCAMMoveEntry: new record validation failed');
  }
  if (!out.subarray(newVtable, newVtable + vsize).equals(vtableBytes)) {
    throw new Error('appendCAMMoveEntry: vtable copy validation failed');
  }
  for (let i = 0; i < vecInfo.count; i++) {
    const ra = lib.tableAt(buffer, vecInfo.tables[i]);
    const rb = lib.tableAt(out, afterVec.tables[i]);
    if (!ra || !rb || ra.osize !== rb.osize) throw new Error(`appendCAMMoveEntry: record ${i} shape changed`);
    if (!buffer.subarray(vecInfo.tables[i], vecInfo.tables[i] + ra.osize).equals(out.subarray(afterVec.tables[i], afterVec.tables[i] + ra.osize))) {
      throw new Error(`appendCAMMoveEntry: record ${i} changed`);
    }
  }
  return out;
}

module.exports = { appendCAMMoveEntry, locateRecords, readMotionId };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--template-motion-id') === undefined || get('--new-id') === undefined ||
      get('--vsize') === undefined || get('--osize') === undefined) {
    console.error('Usage: node append-2k25-cammove-entry.js <input.jsfb> <output.jsfb> --template-motion-id N --new-id N --vsize N --osize N');
    process.exit(2);
  }
  try {
    const edited = appendCAMMoveEntry(source, {
      templateMotionId: get('--template-motion-id'), newId: get('--new-id'),
      vsize: get('--vsize'), osize: get('--osize'),
    });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
