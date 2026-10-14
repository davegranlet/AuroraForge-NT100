'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { findEntranceEntry } = require('./find-2k25-entrance-entry');
const { diffEntranceEntries } = require('./diff-2k25-entrance-entries');

// Minimal synthetic "Entr" buffer: nine sections, one record in section 8.
// Layout mirrors append_2k25_entrance_entry.js writer constants.
function fixture(options = {}) {
  const { includeRecord = true, recordId = 14000 } = options;
  const out = [];
  function u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v); out.push(b); return out.length * 0 + 4; }
  void u32;
  const bytes = [];
  const w32 = (v) => { bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff); };
  const w16 = (v) => { bytes.push(v & 0xff, (v >> 8) & 0xff); };
  const w8 = (v) => { bytes.push(v & 0xff); };
  const at = () => bytes.length;
  // header: root uoff + 'Entr'
  w32(32); bytes.push(0x45, 0x6e, 0x74, 0x72);
  // root vtable at 8: len 22, tablelen 40, nine field offsets (all 36+field*0 -> point at uoff slots)
  const rootVtable = at();
  w16(22); w16(40);
  for (let s = 0; s < 9; s++) w16(4 + 32 - 8 + 0); // placeholder, fixed below
  void rootVtable;
  w16(0);
  // root table at 32: soffset + nine wrapper uoffsets
  const rootTable = at();
  const wrapPos = [];
  w32(rootTable - 8);
  const uoffSlots = [];
  for (let s = 0; s < 9; s++) { uoffSlots.push(at()); w32(0); }
  // wrappers + vectors
  for (let s = 0; s < 9; s++) {
    const wv = at();
    w16(6); w16(8); w16(4);
    const wt = at();
    w32(wt - wv);
    const vecSlot = at();
    w32(0);
    wrapPos.push({ wt, vecSlot });
    // patch root uoffset
    const rel = wt - (rootTable + 4 + s * 4);
    bytes[uoffSlots[s]] = rel & 0xff; bytes[uoffSlots[s] + 1] = (rel >> 8) & 0xff;
    bytes[uoffSlots[s] + 2] = (rel >> 16) & 0xff; bytes[uoffSlots[s] + 3] = (rel >> 24) & 0xff;
  }
  // fix root vtable field offsets: field s lives at rootTable+4+s*4, offset from table start = 4+s*4
  for (let s = 0; s < 9; s++) {
    const v = 4 + s * 4;
    bytes[8 + 4 + s * 2] = v & 0xff; bytes[8 + 4 + s * 2 + 1] = (v >> 8) & 0xff;
  }
  // vectors: sections 0..7 empty, section 8 gets one record
  const recordSlots = [];
  for (let s = 0; s < 9; s++) {
    const vec = at();
    const rel = vec - (wrapPos[s].wt + 4);
    bytes[wrapPos[s].vecSlot] = rel & 0xff; bytes[wrapPos[s].vecSlot + 1] = (rel >> 8) & 0xff;
    bytes[wrapPos[s].vecSlot + 2] = (rel >> 16) & 0xff; bytes[wrapPos[s].vecSlot + 3] = (rel >> 24) & 0xff;
    if (s === 8 && includeRecord) { w32(1); recordSlots.push(at()); w32(0); } else { w32(0); }
  }
  // record vtable (24 bytes) + table (44 bytes), field offsets [6,8,5,36,12,16,20,24,28,32]
  const rv = at();
  w16(24); w16(44);
  [6, 8, 5, 36, 12, 16, 20, 24, 28, 32].forEach(w16);
  const rt = at();
  w32(rt - rv);
  const w16at = (pos, v) => { bytes[pos] = v & 0xff; bytes[pos + 1] = (v >> 8) & 0xff; };
  const w32at = (pos, v) => { bytes[pos] = v & 0xff; bytes[pos + 1] = (v >> 8) & 0xff; bytes[pos + 2] = (v >> 16) & 0xff; bytes[pos + 3] = (v >> 24) & 0xff; };
  bytes[rt + 5] = 1;
  w16at(rt + 6, recordId);
  w32at(rt + 8, 4294957742);
  w32at(rt + 12, 247); w32at(rt + 16, 502); w32at(rt + 20, 1152); w32at(rt + 24, 26008); w32at(rt + 28, 504);
  w16at(rt + 32, 0);
  for (let i = rt + 33; i < rt + 44; i++) bytes[i] = 0;
  if (includeRecord) {
    const trel = rt - recordSlots[0];
    w32at(recordSlots[0], trel);
  }
  void w8;
  return Buffer.from(bytes);
}

test('find-2k25-entrance-entry locates the record by id', () => {
  const found = findEntranceEntry(fixture(), 14000);
  assert.ok(found);
  assert.strictEqual(found.section, 8);
  assert.strictEqual(found.index, 0);
  assert.strictEqual(found.record.nameString, 4294957742);
  assert.strictEqual(found.record.type, 1);
  assert.strictEqual(found.record.field4, 247);
});

test('find-2k25-entrance-entry misses cleanly and rejects non-Entr input', () => {
  const buffer = fixture();
  assert.strictEqual(findEntranceEntry(buffer, 9999), null);
  assert.throws(() => findEntranceEntry(Buffer.from('not-entr-data............'), 1), /Entr/);
});

test('diff-2k25-entrance-entries reports per-section new records', () => {
  const empty = fixture({ includeRecord: false });
  const fresh = fixture();
  const diff = diffEntranceEntries(empty, fresh);
  assert.deepStrictEqual(diff.slice(0, 8).map((section) => section.newRecords.length), Array(8).fill(0));
  assert.strictEqual(diff[8].baseCount, 0);
  assert.strictEqual(diff[8].freshCount, 1);
  assert.strictEqual(diff[8].newRecords[0].id, 14000);
});
