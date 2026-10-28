'use strict';

// Shared clean-room FlatBuffer splice primitives for WWE 2K25 *.jsfb
// registration appenders.
//
// Strategy (same family as tools/clips-codec/append-cutscene-entry.js):
// insert 4 bytes at the END of the target vector, shift the file tail by +4,
// bump every reference that CROSSES the insertion point, append the cloned
// record table at EOF, point the new slot at it. Everything else in the file
// stays byte-identical.
//
// A reference "crosses" insertion point P when exactly one of (field, target)
// sits at/after P. The caller enumerates references structurally (vector
// slots, table soffs, known uoffset fields) via collect helpers below — never
// by guessing from scalar values, so trailing payload words (SDB name-ids,
// hashes) are never touched.
//
// All table resolution is negative-soff aware: vtable = table - soff, where
// soff is a SIGNED i32 (many 2K25 files store tables BEFORE their vtable).

const u32 = (buf, o) => buf.readUInt32LE(o);
const i32 = (buf, o) => buf.readInt32LE(o);
const u16 = (buf, o) => buf.readUInt16LE(o);

function readHeader(buf, expectedIdent) {
  if (buf.length < 8) throw new Error('jsfb-append-lib: file too short for header');
  const root = u32(buf, 0);
  const ident = buf.subarray(4, 8).toString('ascii');
  if (expectedIdent && ident !== expectedIdent) {
    throw new Error(`jsfb-append-lib: expected identifier ${expectedIdent}, saw ${ident}`);
  }
  if (root >= buf.length) throw new Error('jsfb-append-lib: root offset out of bounds');
  return { root, ident };
}

// Resolve a table at absolute offset `table`. Returns null when the bytes do
// not look like a table (bad vtable bounds). Handles negative soff.
function tableAt(buf, table) {
  if (table < 0 || table + 4 > buf.length) return null;
  const vtable = table - i32(buf, table);
  if (vtable < 0 || vtable + 4 > buf.length) return null;
  const vsize = u16(buf, vtable);
  const osize = u16(buf, vtable + 2);
  if (vsize < 4 || osize < 4) return null;
  if (vsize > 1024 || osize > 65536) return null;
  if (vtable + vsize > buf.length) return null;
  if (table + osize > buf.length + 1) return null;
  const fieldCount = (vsize - 4) / 2;
  if (!Number.isInteger(fieldCount)) return null;
  const rels = [];
  for (let f = 0; f < fieldCount; f++) rels.push(u16(buf, vtable + 4 + f * 2));
  // Every live field offset must land inside the table; otherwise these
  // bytes are not a table (kills false positives on binary payloads).
  for (const rel of rels) {
    if (rel !== 0 && rel >= osize) return null;
  }
  // Sizes come from rel ordering, NOT field ordering: a field extends to the
  // next higher rel (or to the table end). Vtable rels are not monotonic.
  const sorted = [...new Set(rels.filter((r) => r !== 0))].sort((a, b) => a - b);
  const fields = [];
  for (let f = 0; f < fieldCount; f++) {
    const rel = rels[f];
    if (!rel) continue;
    const at = table + rel;
    const higher = sorted.find((r) => r > rel);
    const end = higher === undefined ? table + osize : table + higher;
    fields.push({ field: f, rel, at, size: Math.max(0, end - at) });
  }
  return { table, vtable, vsize, osize, fields };
}

function fieldByIndex(resolved, f) {
  return resolved.fields.find((entry) => entry.field === f) || null;
}

// Follow a chain of uoffset fields from the root table. chain=[0] means
// root.f0 (direct vector, e.g. Team/Play/CharPro); chain=[0,0] means
// root.f0 -> wrapper.f0 (e.g. Vict). Returns the target absolute offset.
function followChain(buf, root, chain) {
  let table = root;
  for (const f of chain) {
    const resolved = tableAt(buf, table);
    if (!resolved) throw new Error(`jsfb-append-lib: not a table at ${table}`);
    const field = fieldByIndex(resolved, f);
    if (!field) throw new Error(`jsfb-append-lib: field ${f} absent at table ${table}`);
    if (field.size < 4) throw new Error(`jsfb-append-lib: field ${f} too small at table ${table}`);
    table = field.at + u32(buf, field.at);
    if (table >= buf.length) throw new Error('jsfb-append-lib: chain target out of bounds');
  }
  return table;
}

// Read a u32-count + uoffset-slot vector at absolute offset `vec`.
function readVector(buf, vec) {
  const count = u32(buf, vec);
  if (vec + 4 + count * 4 > buf.length) throw new Error('jsfb-append-lib: vector overruns file');
  const slotsOff = vec + 4;
  const tables = [];
  for (let i = 0; i < count; i++) {
    const slot = slotsOff + i * 4;
    const rel = u32(buf, slot);
    if (!rel) { tables.push(null); continue; }
    tables.push(slot + rel);
  }
  return { vec, count, countOff: vec, slotsOff, tables };
}

// Collect every vector-slot reference in a vector: [{ pos, target }].
function collectSlots(buf, vecInfo) {
  const refs = [];
  for (let i = 0; i < vecInfo.count; i++) {
    const pos = vecInfo.slotsOff + i * 4;
    const rel = u32(buf, pos);
    if (!rel) continue;
    refs.push({ pos, target: pos + rel, kind: 'slot' });
  }
  return refs;
}

// Collect table-soff references for explicit table offsets: [{ pos, target }]
// where pos = table start and target = vtable.
function collectSoffs(buf, tables) {
  const refs = [];
  for (const table of tables) {
    if (table === null || table === undefined) continue;
    if (table + 4 > buf.length) continue;
    refs.push({ pos: table, target: table - i32(buf, table), kind: 'soff' });
  }
  return refs;
}

// Collect the root table's own soff reference (its vtable is often deduped
// far away and can sit across the insertion point).
function collectRootSoff(buf, root) {
  if (root + 4 > buf.length) return [];
  return [{ pos: root, target: root - i32(buf, root), kind: 'soff' }];
}

// Collect a single uoffset field reference: { pos, target }.
function uoffsetRef(buf, fieldAt) {
  return { pos: fieldAt, target: fieldAt + u32(buf, fieldAt), kind: 'uoffset' };
}

// Apply the tail-shift repair: the file grew by `delta` at point P, so every
// recorded reference whose (field, target) straddle P is fixed in `out`.
// Positions in refs are PRE-edit; they are mapped to post-edit first.
function applyShiftRepair(out, refs, insertAt, delta) {
  const shift = (pos) => pos + (pos >= insertAt ? delta : 0);
  for (const ref of refs) {
    const pos = shift(ref.pos);
    const targetNow = ref.target + (ref.target >= insertAt ? delta : 0);
    if (ref.kind === 'soff') {
      out.writeInt32LE(pos - targetNow, pos);
    } else {
      out.writeUInt32LE(targetNow - pos, pos);
    }
  }
}

// Verify a repair pass: every pre-edit ref must resolve in `after` to the
// shifted target. Returns the number of references verified. Throws on the
// first mismatch, naming the offending reference.
function verifyRefs(before, after, refs, insertAt, delta) {
  const shift = (pos) => pos + (pos >= insertAt ? delta : 0);
  let checked = 0;
  for (const ref of refs) {
    const pos = shift(ref.pos);
    const want = shift(ref.target);
    let got;
    if (ref.kind === 'soff') {
      got = pos - after.readInt32LE(pos);
    } else {
      got = pos + after.readUInt32LE(pos);
    }
    if (got !== want) {
      throw new Error(
        `jsfb-append-lib: ref repair failed kind=${ref.kind} pos=${ref.pos}->${pos} want=${want} got=${got}`,
      );
    }
    checked++;
  }
  void before;
  return checked;
}
// Returns { buffer, newTablePos, newSlotPos, insertAt }.
function spliceAppend(buf, vecInfo, newRecordBytes, refs = []) {
  const insertAt = vecInfo.slotsOff + vecInfo.count * 4;
  const delta = 4;
  const newTablePos = buf.length + delta;
  const out = Buffer.alloc(buf.length + delta + newRecordBytes.length);
  buf.copy(out, 0, 0, insertAt);
  out.writeUInt32LE(vecInfo.count + 1, vecInfo.countOff);
  buf.copy(out, insertAt + delta, insertAt, buf.length);
  applyShiftRepair(out, refs, insertAt, delta);
  const newSlotPos = insertAt;
  out.writeUInt32LE(newTablePos - newSlotPos, newSlotPos);
  Buffer.from(newRecordBytes).copy(out, newTablePos);
  return { buffer: out, newTablePos, newSlotPos, insertAt };
}

// Splice variant that places a zero-filled chunk of `chunkSize` bytes
// IMMEDIATELY after the new slot (at [P+4, P+4+chunkSize)) instead of at EOF.
// Use it when the new tables share targets that live after P: sharing then
// stays forward. The caller fills the chunk afterwards using the returned
// addresses. Returns { buffer, chunkPos, newSlotPos, insertAt, delta } where
// delta = 4 + chunkSize is the total tail shift.
function spliceAppendAt(buf, vecInfo, chunkSize, refs = []) {
  const insertAt = vecInfo.slotsOff + vecInfo.count * 4;
  const delta = 4 + chunkSize;
  const out = Buffer.alloc(buf.length + delta);
  buf.copy(out, 0, 0, insertAt);
  out.writeUInt32LE(vecInfo.count + 1, vecInfo.countOff);
  buf.copy(out, insertAt + delta, insertAt, buf.length);
  applyShiftRepair(out, refs, insertAt, delta);
  const newSlotPos = insertAt;
  const chunkPos = insertAt + 4;
  return { buffer: out, chunkPos, newSlotPos, insertAt, delta };
}

module.exports = {
  u32, u16, i32,
  readHeader, tableAt, fieldByIndex, followChain, readVector,
  collectSlots, collectSoffs, collectRootSoff, uoffsetRef, applyShiftRepair, verifyRefs, spliceAppend, spliceAppendAt,
};
