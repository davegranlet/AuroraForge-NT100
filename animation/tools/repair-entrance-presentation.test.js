'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {repair}=require('./repair-entrance-presentation');
const lib=require('./jsfb-append-lib');
const fixture=process.env.AURORA_ENTRANCE_FIXTURE;
test('native-presentation diagnostic preserves original graph and only changes target flag/link',{skip:!fixture},()=>{
 const source=fs.readFileSync(fixture),result=repair(source,14002,1);
 assert.ok(result.buffer.subarray(result.report.shift).equals(source));
 const root=lib.readHeader(result.buffer,'Entr').root;
 const rows=lib.readVector(result.buffer,lib.followChain(result.buffer,root,[8,0]));
 const target=rows.tables.map(at=>lib.tableAt(result.buffer,at)).find(t=>{const f=lib.fieldByIndex(t,0);return f&&result.buffer.readUInt16LE(f.at)===14002;});
 assert.equal(result.buffer[lib.fieldByIndex(target,2).at],0);assert.ok(lib.fieldByIndex(target,11));
 assert.equal(result.report.defaultGraphTables,29);
 assert.throws(()=>repair(result.buffer,14002,1),/Expected diagnostic flag|already has/);
 assert.throws(()=>repair(source,14002,14002),/must differ/);
 assert.throws(()=>repair(source,65535,1),/match uniquely/);
});
test('refuses a populated presentation leaf rather than importing authored data',{skip:!fixture},()=>{
 const b=fs.readFileSync(fixture),root=lib.readHeader(b,'Entr').root;
 const rows=lib.readVector(b,lib.followChain(b,root,[8,0]));
 const template=rows.tables.map(at=>lib.tableAt(b,at)).find(t=>{const f=lib.fieldByIndex(t,0);return f&&b.readUInt16LE(f.at)===1;});
 const f=lib.fieldByIndex(template,11),graph=lib.tableAt(b,f.at+b.readUInt32LE(f.at));
 const first=graph.fields[0],child=lib.tableAt(b,first.at+b.readUInt32LE(first.at));
 const leafField=child.fields[0],leaf=leafField.at+b.readUInt32LE(leafField.at);
 b.writeInt32LE(leaf-graph.vtable,leaf);
 assert.throws(()=>repair(b,14002,1),/non-default authored/);
});
