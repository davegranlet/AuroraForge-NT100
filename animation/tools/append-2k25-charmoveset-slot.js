'use strict';

// Clean-room slot appender for WWE 2K25 Roster/CharMoveSetDataTable.jsfb
// (identifier: Char). Measured schema:
//   root @16 -> f0 -> vector @24 of 713 record tables (idx0 is a header
//   sentinel; idx1..712 share one vtable: f0 = u16 wrestler id @+6,
//   f1 = uoffset @+8 -> 28-byte wrapper).
//   Wrapper (6 fields): wf0 -> vector of 354 tiny slot tables, wf1 = 5-u32
//   scalar vector, wf2 = opaque blob, wf3/wf4 -> small table vectors,
//   wf5 -> usually empty vector.
//   Slot table (8 B): soff + uoffset(=4) -> child u32 SDB name-id at table+8.
//
// The oracle proves the registration pattern: CakeView repointed wrestler 1,
// slot 185 at the new SDB string 4294957744 (a real f4 field), leaving the
// top-level wrestler ids untouched.
//
// It clones a stock slot of the SAME wrestler vector, patches only the child
// SDB word, appends one slot (+12-byte table/child chunk at EOF), repairs
// every reference crossing the nested insertion point, and validates: slot
// count +1, new child == new id, every record re-walks identical.
// Clean-room: no Tribute/PWM code or files used.

const fs = require('node:fs');
const path = require('node:path');
const lib = require('./jsfb-append-lib');

function locateTopVector(buffer) {
  const { root } = lib.readHeader(buffer, 'Char');
  const vec = lib.followChain(buffer, root, [0]);
  return { root, vecInfo: lib.readVector(buffer, vec) };
}

function readTopRecord(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved) return null;
  const f0 = lib.fieldByIndex(resolved, 0);
  const f1 = lib.fieldByIndex(resolved, 1);
  if (!f0 || f0.size < 2 || !f1 || f1.size < 4) return null;
  return {
    table, vtable: resolved.vtable, osize: resolved.osize,
    wrestlerId: buffer.readUInt16LE(f0.at),
    wrapper: f1.at + buffer.readUInt32LE(f1.at), wrapperFieldAt: f1.at,
  };
}

function readWrapper(buffer, wrapper) {
  const resolved = lib.tableAt(buffer, wrapper);
  if (!resolved || resolved.osize < 28) return null;
  const fields = {};
  for (let f = 0; f < 6; f++) {
    const field = lib.fieldByIndex(resolved, f);
    if (!field || field.size < 4) return null;
    fields[f] = { at: field.at, target: field.at + buffer.readUInt32LE(field.at) };
  }
  return { wrapper, vtable: resolved.vtable, fields };
}

// True when `at` heads a vector whose every slot resolves to a table.
function asTableVector(buffer, at) {
  if (at + 4 > buffer.length) return null;
  const count = buffer.readUInt32LE(at);
  if (count > 100000 || at + 4 + count * 4 > buffer.length) return null;
  const tables = [];
  for (let i = 0; i < count; i++) {
    const slot = at + 4 + i * 4;
    const rel = buffer.readUInt32LE(slot);
    if (!rel) { tables.push(null); continue; }
    const table = slot + rel;
    if (!lib.tableAt(buffer, table)) return null;
    tables.push(table);
  }
  return { vec: at, count, slotsOff: at + 4, tables };
}

function readSlot(buffer, table) {
  const resolved = lib.tableAt(buffer, table);
  if (!resolved || resolved.osize !== 8) return null;
  const f = lib.fieldByIndex(resolved, 0);
  void f;
  const child = table + 8;
  if (child + 4 > buffer.length) return null;
  return { table, vtable: resolved.vtable, child, sdbId: buffer.readUInt32LE(child) >>> 0 };
}

function findWrestler(buffer, vecInfo, wrestlerId) {
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    const rec = readTopRecord(buffer, table);
    if (rec && rec.wrestlerId === (wrestlerId & 0xffff)) return { index: i, ...rec };
  }
  return null;
}

function collectRefs(buffer, root, vecInfo) {
  const refs = [...lib.collectSlots(buffer, vecInfo), ...lib.collectRootSoff(buffer, root)];
  for (let i = 0; i < vecInfo.count; i++) {
    const table = vecInfo.tables[i];
    if (table === null) continue;
    refs.push(...lib.collectSoffs(buffer, [table]));
    const rec = readTopRecord(buffer, table);
    if (!rec) continue;
    refs.push(...lib.collectSoffs(buffer, [rec.wrapper]));
    const wrap = readWrapper(buffer, rec.wrapper);
    if (!wrap) continue;
    for (let f = 0; f < 6; f++) {
      refs.push({ pos: wrap.fields[f].at, target: wrap.fields[f].target, kind: 'uoffset' });
      const sub = asTableVector(buffer, wrap.fields[f].target);
      if (!sub) continue;
      refs.push(...lib.collectSlots(buffer, sub));
      for (const t of sub.tables) {
        if (t === null) continue;
        refs.push(...lib.collectSoffs(buffer, [t]));
        const resolved = lib.tableAt(buffer, t);
        if (!resolved) continue;
        for (const field of resolved.fields) {
          if (field.size < 4 || field.at + 4 > buffer.length) continue;
          const target = field.at + buffer.readUInt32LE(field.at);
          if (lib.tableAt(buffer, target)) {
            refs.push({ pos: field.at, target, kind: 'uoffset' });
          }
        }
      }
    }
  }
  return refs;
}

function appendCharMoveSetSlot(input, options) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { wrestlerId, templateSdbId, newSdbId } = options || {};
  if (wrestlerId === undefined || templateSdbId === undefined || newSdbId === undefined) {
    throw new Error('appendCharMoveSetSlot: wrestlerId, templateSdbId and newSdbId are required');
  }
  const { root, vecInfo } = locateTopVector(buffer);
  const wrestler = findWrestler(buffer, vecInfo, wrestlerId);
  if (!wrestler) throw new Error(`appendCharMoveSetSlot: wrestler ${wrestlerId} not found`);
  const wrap = readWrapper(buffer, wrestler.wrapper);
  if (!wrap) throw new Error('appendCharMoveSetSlot: wrapper unreadable');
  const wf0 = asTableVector(buffer, wrap.fields[0].target);
  if (!wf0) throw new Error('appendCharMoveSetSlot: wf0 is not a table vector');

  let template = null;
  for (const t of wf0.tables) {
    if (t === null) continue;
    const slot = readSlot(buffer, t);
    if (slot && slot.sdbId === (templateSdbId >>> 0)) { template = slot; break; }
  }
  if (!template) throw new Error(`appendCharMoveSetSlot: template slot 0x${(templateSdbId >>> 0).toString(16)} not found`);
  for (const t of wf0.tables) {
    if (t === null) continue;
    const slot = readSlot(buffer, t);
    if (slot && slot.sdbId === (newSdbId >>> 0)) {
      throw new Error('appendCharMoveSetSlot: new SDB id already present in this vector; refusing duplicate');
    }
  }

  const refs = collectRefs(buffer, root, vecInfo);
  const chunk = Buffer.alloc(12, 0);
  const nestedVec = { ...wf0, count: wf0.count, countOff: wf0.vec, slotsOff: wf0.slotsOff };
  const spliced = lib.spliceAppend(buffer, nestedVec, chunk, refs);
  const out = spliced.buffer;
  const shift = (p) => p + (p >= spliced.insertAt ? 4 : 0);
  const slotPos = spliced.newTablePos;
  const childPos = slotPos + 8;

  buffer.subarray(template.table, template.table + 8).copy(out, slotPos);
  out.writeInt32LE(slotPos - shift(template.vtable), slotPos);
  out.writeUInt32LE(4, slotPos + 4);
  out.writeUInt32LE(newSdbId >>> 0, childPos);

  validateCharMoveSetAppend(buffer, out, { wrestlerId, newSdbId, beforeCount: wf0.count });
  return out;
}

function snapshotWrestler(buffer, vecInfo, wrestlerId) {
  const wrestler = findWrestler(buffer, vecInfo, wrestlerId);
  if (!wrestler) throw new Error('snapshot: wrestler missing');
  const wrap = readWrapper(buffer, wrestler.wrapper);
  const heads = [];
  for (let f = 0; f < 6; f++) heads.push(buffer.readUInt32LE(wrap.fields[f].target));
  const wf0 = asTableVector(buffer, wrap.fields[0].target);
  const slots = wf0.tables.map((t) => {
    if (t === null) return null;
    const slot = readSlot(buffer, t);
    return slot ? slot.sdbId : 'unreadable';
  });
  return { heads, slots };
}

function validateCharMoveSetAppend(before, after, options) {
  const { wrestlerId, newSdbId, beforeCount } = options;
  const beforeTop = locateTopVector(before);
  const afterTop = locateTopVector(after);
  if (beforeTop.vecInfo.count !== afterTop.vecInfo.count) {
    throw new Error('appendCharMoveSetSlot: top-level count changed');
  }
  // Top-level wrestler ids must survive for every record (idx0 is a header
  // sentinel without f0: its raw bytes must survive instead).
  for (let i = 0; i < beforeTop.vecInfo.count; i++) {
    const aTable = beforeTop.vecInfo.tables[i];
    const bTable = afterTop.vecInfo.tables[i];
    const a = readTopRecord(before, aTable);
    const b = readTopRecord(after, bTable);
    if (!a || !b) {
      const ra = lib.tableAt(before, aTable);
      const rb = lib.tableAt(after, bTable);
      if (!ra || !rb || ra.osize !== rb.osize) throw new Error(`appendCharMoveSetSlot: top record ${i} shape changed`);
      for (let k = 0; k < ra.osize; k++) {
        if (before[aTable + k] !== after[bTable + k]) throw new Error(`appendCharMoveSetSlot: top record ${i} byte ${k} changed`);
      }
      continue;
    }
    if (a.wrestlerId !== b.wrestlerId) {
      throw new Error(`appendCharMoveSetSlot: top record ${i} changed`);
    }
  }
  const a = snapshotWrestler(before, beforeTop.vecInfo, wrestlerId);
  const b = snapshotWrestler(after, afterTop.vecInfo, wrestlerId);
  if (b.slots.length !== beforeCount + 1) throw new Error('appendCharMoveSetSlot: wf0 count validation failed');
  for (let i = 0; i < beforeCount; i++) {
    if (a.slots[i] !== b.slots[i]) throw new Error(`appendCharMoveSetSlot: slot ${i} changed`);
  }
  if (b.slots[beforeCount] !== (newSdbId >>> 0)) throw new Error('appendCharMoveSetSlot: new slot validation failed');
  // Prove the whole-file repair: every collected reference re-resolves.
  const refs = collectRefs(before, beforeTop.root, beforeTop.vecInfo);
  const nestedP = (() => {
    const w = findWrestler(before, beforeTop.vecInfo, wrestlerId);
    const wr = readWrapper(before, w.wrapper);
    const v = asTableVector(before, wr.fields[0].target);
    return v.slotsOff + v.count * 4;
  })();
  const verified = lib.verifyRefs(before, after, refs, nestedP, 4);
  if (verified < 1000) throw new Error(`appendCharMoveSetSlot: suspiciously few refs verified (${verified})`);
}

// Version-agnostic template picker: returns the first slot of the first
// preferred wrestler that exists in the file, with its current SDB id.
function pickTemplate(input, preferredWrestlerIds) {
  const buffer = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const { vecInfo } = locateTopVector(buffer);
  for (const wrestlerId of preferredWrestlerIds) {
    const wrestler = findWrestler(buffer, vecInfo, wrestlerId);
    if (!wrestler) continue;
    const wrap = readWrapper(buffer, wrestler.wrapper);
    if (!wrap) continue;
    const wf0 = asTableVector(buffer, wrap.fields[0].target);
    if (!wf0) continue;
    for (const t of wf0.tables) {
      if (t === null) continue;
      const slot = readSlot(buffer, t);
      if (slot && slot.sdbId) return { wrestlerId, templateSdbId: slot.sdbId >>> 0 };
    }
  }
  return null;
}

module.exports = { appendCharMoveSetSlot, locateTopVector, findWrestler, pickTemplate };

if (require.main === module) {
  const source = process.argv[2];
  const output = process.argv[3];
  const get = (name) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : Number(process.argv[i + 1]);
  };
  if (!source || !output || get('--wrestler-id') === undefined ||
      get('--template-sdb-id') === undefined || get('--new-sdb-id') === undefined) {
    console.error('Usage: node append-2k25-charmoveset-slot.js <input.jsfb> <output.jsfb> --wrestler-id N --template-sdb-id N --new-sdb-id N');
    process.exit(2);
  }
  try {
    const edited = appendCharMoveSetSlot(source, {
      wrestlerId: get('--wrestler-id'), templateSdbId: get('--template-sdb-id'), newSdbId: get('--new-sdb-id'),
    });
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output, edited);
    console.log(JSON.stringify({ output: path.resolve(output), bytes: edited.length }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
