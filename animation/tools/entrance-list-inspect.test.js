'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {inspect,find}=require('./entrance-list-inspect');
test('rejects unrelated buffers and invalid scalar searches',()=>{
 assert.throws(()=>inspect(Buffer.alloc(16)),/identifier/);
 assert.throws(()=>find(Buffer.alloc(16),-1),/uint32/);
});
test('finds SHOW OFF in its real section/field, without the section8 schema',{skip:!process.env.AURORA_ENTRANCE_FIXTURE},()=>{
 const b=fs.readFileSync(process.env.AURORA_ENTRANCE_FIXTURE),rows=find(b,1612760982);
 assert.equal(rows.length,1);assert.equal(rows[0].section,6);
 assert.equal(rows[0].fields.find(f=>f.field===0).u32,132);
 assert.equal(rows[0].fields.find(f=>f.field===2).u32,1612760982);
 assert.equal(rows[0].fields.find(f=>f.field===7).u32,273);
});
