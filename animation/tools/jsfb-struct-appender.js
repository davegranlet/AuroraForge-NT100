'use strict';

// Append a fixed-size struct record to a .jsfb FlatBuffer by cloning an
// existing struct, changing one u32 field, inserting it into its vector, and
// re-fixing every uoffset so the file stays structurally valid.
//
// This is the reusable engine behind per-file registration writers.
//
// Exports: findStructVector, appendStruct, collectUoffsets

function u16(b, o) { return b.readUInt16LE(o); }
function u32(b, o) { return b.readUInt32LE(o); }
function i32(b, o) { return b.readInt32LE(o); }

// A candidate table iff its vtable is plausibly in-bounds.
function tableAt(b, off) {
  if (off < 0 || off + 4 > b.length) return null;
  const vt = off - i32(b, off);
  if (vt < 0 || vt >= b.length) return null;
  const vbs = u16(b, vt);
  const obs = u16(b, vt + 2);
  if (vbs < 4 || vbs > 65535 || obs < 4 || obs > 65535) return null;
  if (vt + vbs > b.length || off + obs > b.length) return null;
  return { off, vt, vbs, obs };
}

function isTable(b, off) { return tableAt(b, off) !== null; }
function isNameId(v) { return v >= 0xffffc000 && v < 0xfffff000; }

// Walk the whole file from the root and collect every uoffset location.
// A uoffset is a table field whose target is a valid table/vector/string, or a
// vector slot (element offset). Returns an array of byte offsets.
function collectUoffsets(b) {
  const root = u32(b, 0);
  const result = [0]; // byte 0 is a uoffset to the root table
  const seen = new Set();
  const work = [root];
  function enq(o) { if (o >= 0 && o < b.length && !seen.has(o)) { seen.add(o); work.push(o); } }
  while (work.length) {
    const off = work.pop();
    const t = tableAt(b, off);
    if (!t) continue;
    const vbs = t.vbs;
    for (let i = 0; i < (vbs - 4) / 2; i++) {
      const rel = u16(b, t.vt + 4 + i * 2);
      if (!rel) continue;
      const fo = t.off + rel;
      if (fo + 4 > b.length) continue;
      const raw = u32(b, fo);
      const target = fo + raw;
      if (isTable(b, target)) {
        result.push(fo);
        enq(target);
      } else {
        const len = u32(b, target);
        if (len > 0 && len < 1000000 && target + 4 + len * 4 <= b.length) {
          // vector: its slots are uoffsets if they point at tables/strings
          result.push(fo);
          for (let k = 0; k < len; k++) {
            const slot = target + 4 + k * 4;
            const e = slot + u32(b, slot);
            if (isTable(b, e)) { result.push(slot); enq(e); }
          }
        } else if (len > 0 && len < 1000000 && target + 4 + len <= b.length) {
          // string: its length is a scalar, not a uoffset; nothing to do
          result.push(fo);
        }
      }
    }
  }
  return result;
}

// Locate the vector of `structSize`-byte structs that contains `valueOffset`.
// Returns { arrayStart, count, lenPrefix } where lenPrefix is the vector count location.
function findStructVector(b, valueOffset, structSize) {
  // determine phase: struct start = valueOffset - k where 0 <= k < structSize and
  // the struct looks valid (a name-id at the valueOffset position and a name-id at start).
  let best = null;
  for (let k = 0; k < structSize; k += 4) {
    const start = valueOffset - k;
    if (start < 0 || start + structSize > b.length) continue;
    // walk backward while the previous struct's name-id field is a name-id
    let lo = start;
    while (lo - structSize >= 0 && isNameId(u32(b, lo - structSize))) lo -= structSize;
    // walk forward while the next struct's name-id field is a name-id
    let hi = start;
    while (hi + structSize <= b.length && isNameId(u32(b, hi + structSize))) hi += structSize;
    const count = (hi - lo) / structSize + 1;
    if (!best || count > best.count) best = { lo, hi, count, phase: k };
  }
  if (!best) return null;
  return { arrayStart: best.lo, arrayEnd: best.hi + structSize, count: best.count, phase: best.phase, lenPrefix: best.lo - 4 };
}

// Append a clone of the struct at `templateOffset` with `fieldOffset` (within
// struct) set to `newValue`. Inserts it at the array end and bumps the vector
// count, re-fixing all uoffsets.
function appendStruct(b, opts) {
  const { structSize, templateOffset, fieldOffset, newValue, array, } = opts;
  const insertPoint = array.arrayEnd;
  const insertSize = structSize;
  const out = Buffer.alloc(b.length + insertSize);
  b.copy(out, 0, 0, insertPoint);
  b.copy(out, insertPoint + insertSize, insertPoint, b.length);
  // clone the template struct bytes, then patch the field
  const template = b.subarray(templateOffset, templateOffset + structSize);
  template.copy(out, insertPoint);
  out.writeUInt32LE(newValue >>> 0, insertPoint + fieldOffset);
  // bump vector count
  out.writeUInt32LE(array.count + 1, array.lenPrefix);
  // fix uoffsets: for every uoffset location L < insertPoint with target >= insertPoint, add insertSize
  const uoffs = collectUoffsets(b);
  const seen = new Set();
  for (const L of uoffs) {
    if (L >= insertPoint) continue; // shifted with data, value unchanged
    if (seen.has(L)) continue;
    seen.add(L);
    const raw = u32(b, L);
    const target = L + raw;
    if (target >= insertPoint) out.writeUInt32LE(raw + insertSize, L);
  }
  return out;
}

module.exports = { collectUoffsets, findStructVector, appendStruct, tableAt, isTable, isNameId, u32, i32, u16 };
