#!/usr/bin/env node
'use strict';
// v1.1.1.a: prepend a new root/vector; retain the entire original object graph.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw Error('Usage: node append_2k25_entrance_preserving_graph.js source output');
const b = fs.readFileSync(source);
assert.equal(b.toString('ascii', 4, 8), 'Entr');
function field(buf, table, id) {
  const vt = table - buf.readInt32LE(table), slot = vt + 4 + id * 2;
  if (slot + 2 > vt + buf.readUInt16LE(vt)) return null;
  const relative = buf.readUInt16LE(slot);
  return relative ? table + relative : null;
}
function target(buf, table, id) {
  const p = field(buf, table, id);
  assert.notEqual(p, null);
  return p + buf.readUInt32LE(p);
}
const oldRoot = b.readUInt32LE(0);
const oldVector = target(b, target(b, oldRoot, 8), 0);
const count = b.readUInt32LE(oldVector);
const oldTables = Array.from({length: count}, (_, i) => {
  const p = oldVector + 4 + i * 4, t = p + b.readUInt32LE(p);
  assert.notEqual(b.readUInt16LE(field(b, t, 0)), 14000, 'Duplicate 14000');
  return t;
});
const rootVtable = 8, root = 32, wrapperVtable = 72, wrapper = 80, vector = 88;
const recordVtable = vector + 4 + (count + 1) * 4;
const record = recordVtable + 24;
const shift = Math.ceil((record + 36) / 8) * 8;
const out = Buffer.alloc(shift + b.length);
b.copy(out, shift);
out.writeUInt32LE(root, 0); out.write('Entr', 4);
out.writeUInt16LE(22, rootVtable); out.writeUInt16LE(40, rootVtable + 2);
out.writeInt32LE(root - rootVtable, root);
for (let i = 0; i < 9; i++) {
  out.writeUInt16LE(4 + i * 4, rootVtable + 4 + i * 2);
  const p = root + 4 + i * 4;
  const to = i === 8 ? wrapper : target(b, oldRoot, i) + shift;
  out.writeUInt32LE(to - p, p);
}
out.writeUInt16LE(6, wrapperVtable); out.writeUInt16LE(8, wrapperVtable + 2);
out.writeUInt16LE(4, wrapperVtable + 4); out.writeInt32LE(wrapper - wrapperVtable, wrapper);
out.writeUInt32LE(vector - wrapper - 4, wrapper + 4);
out.writeUInt32LE(count + 1, vector);
oldTables.concat([null]).forEach((t, i) => {
  const p = vector + 4 + i * 4;
  out.writeUInt32LE((t === null ? record : t + shift) - p, p);
});
out.writeUInt16LE(24, recordVtable); out.writeUInt16LE(36, recordVtable + 2);
[8,12,7,0,16,20,24,28,32,10].forEach((r,i) => out.writeUInt16LE(r,recordVtable+4+i*2));
out.writeInt32LE(record-recordVtable,record);
out.writeUInt8(1,record+7); out.writeUInt16LE(14000,record+8);
out.writeUInt16LE(10226,record+10); out.writeUInt32LE(4294957742,record+12);
[852,852,1161,26008,2236].forEach((v,i)=>out.writeUInt32LE(v,record+16+i*4));
// Byte identity covers every original table, vtable, vector, string and offset.
assert.deepEqual(out.subarray(shift), b);
for (let i=0;i<8;i++) assert.equal(target(out,root,i),target(b,oldRoot,i)+shift);
const newVec=target(out,target(out,root,8),0);
assert.equal(out.readUInt32LE(newVec),count+1);
oldTables.forEach((t,i)=>{const p=newVec+4+i*4;assert.equal(p+out.readUInt32LE(p),t+shift);});
fs.mkdirSync(path.dirname(path.resolve(destination)),{recursive:true});
fs.writeFileSync(destination,out);
console.log(JSON.stringify({destination,version:'1.1.1.a',originalBytes:b.length,preservedBytes:b.length,shift,originalTemplates:count,templates:count+1,bytes:out.length,validated:true},null,2));
