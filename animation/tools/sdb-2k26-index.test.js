'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {transform,indexRecords}=require('./sdb-2k26');
test('indexes a raw SDB and decodes a requested name with the 2K26 cipher',()=>{
 const text=Buffer.from('SHOW OFF'),b=Buffer.alloc(20+text.length);b.writeUInt32LE(256);b.writeUInt32LE(1,4);b.writeUInt32LE(20,8);b.writeUInt32LE(text.length,12);b.writeUInt32LE(1612760982,16);transform(text,20).copy(b,20);
 const index=indexRecords(b);assert.equal(index.count,1);assert.equal(index.get(1612760982).text,'SHOW OFF');assert.equal(index.get(42),null);
});
test('rejects encrypted/non-SDB headers, overflowing records and truncated tables',()=>{
 const bad=Buffer.alloc(8);bad.writeUInt32LE(0x1bd61ba8);assert.throws(()=>indexRecords(bad),/Unsupported/);
 const table=Buffer.alloc(8);table.writeUInt32LE(256);table.writeUInt32LE(1,4);assert.throws(()=>indexRecords(table),/table exceeds/);
 const record=Buffer.alloc(20);record.writeUInt32LE(256);record.writeUInt32LE(1,4);record.writeUInt32LE(100,8);assert.throws(()=>indexRecords(record),/exceeds pool/);
});
