'use strict';
const fs = require('fs');
const path = process.argv[2];
const data = fs.readFileSync(path);
const i32 = (o) => data.readInt32LE(o);
const u16 = (o) => data.readUInt16LE(o);
const u32 = (o) => data.readUInt32LE(o);
const u64 = (o) => data.readBigUInt64LE(o);
function tableAt(offset) {
  const distance = i32(offset);
  const vtable = offset - distance;
  return { offset, vtable, vtableBytes: u16(vtable), objectBytes: u16(vtable + 2) };
}
function fieldAt(table, id) {
  const vtable = table.offset - i32(table.offset);
  const vtableSize = u16(vtable);
  const slot = vtable + 4 + id * 2;
  if (slot + 2 > vtable + vtableSize) return null;
  const rel = u16(slot);
  return rel ? table.offset + rel : null;
}
const root = u32(0);
const victoryPtr = fieldAt({offset: root, vtable: root - i32(root), vtableBytes: u16(root - i32(root)), objectBytes: u16(root - i32(root) + 2)}, 0);
const victory = victoryPtr + u32(victoryPtr);
const vecPtr = fieldAt(tableAt(victory), 0);
const vector = vecPtr + u32(vecPtr);
const count = u32(vector);
let maxField = -1, hist = new Map(), f10vals = new Map(), f11vals = new Map();
let perRow = [];
let nullSome = 0, sameSomeFace = 0, diffSomeFace = 0;
const someCounts = new Map();
const examples = [];
for (let i = 0; i < count; i++) {
  const slot = vector + 4 + i * 4;
  const table = tableAt(slot + u32(slot));
  const fc = (table.vtableBytes - 4) / 2;
  if (fc > maxField) maxField = fc;
  hist.set(fc, (hist.get(fc) || 0) + 1);
  const get = (id, read) => { const at = fieldAt(table, id); return at === null ? null : read(at); };
  const row = {
    index: i,
    wrestlerId: get(0, u16),
    nameString: get(1, u32),
    type1: get(2, (o) => data.readUInt8(o)),
    hideId: get(3, (o) => u64(o).toString()),
    someId: get(4, u32),
    victoryFace: get(5, u32),
    victoryHeel: get(6, u32),
    titleFace: get(7, u32),
    titleHeel: get(8, u32),
    doubleTitle: get(9, u32),
    music: get(10, u32),
    f11: get(11, u32),
  };
  if (row.f11 !== null) { f11vals.set(row.f11, (f11vals.get(row.f11) || 0) + 1); }
  if (row.music !== null) { f10vals.set(row.music, (f10vals.get(row.music) || 0) + 1); }
  if (row.someId === null || row.someId === 0) nullSome++;
  if (row.someId !== null && row.victoryFace !== null) {
    if (row.someId === row.victoryFace) sameSomeFace++; else diffSomeFace++;
  }
  if (row.someId != null) someCounts.set(row.someId, (someCounts.get(row.someId) || 0) + 1);
  perRow.push(row);
}
console.log(JSON.stringify({
  source: path, count, maxFieldIndex: maxField - 1, fieldCountHistogram: [...hist.entries()].sort((a,b)=>a[0]-b[0]),
  nullSome, sameSomeFace, diffSomeFace,
  musicNonNull: [...f10vals.entries()].sort((a,b)=>a[1]-b[1]).slice(-20),
  f11NonNull: [...f11vals.entries()].sort((a,b)=>a[1]-b[1]).slice(-20),
}, null, 2));
// someId repeats
const repeats = [...someCounts.entries()].filter(([,c]) => c > 1).sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log('someId repeats:', JSON.stringify(repeats));
// examples where someId != victoryFace
console.log('diff examples:', JSON.stringify(perRow.filter(r => r.someId != null && r.victoryFace != null && r.someId !== r.victoryFace).slice(0, 15), null, 2));
// rows with f11 non-null
console.log('f11 rows:', JSON.stringify(perRow.filter(r => r.f11 !== null).slice(0,20), null, 2));
