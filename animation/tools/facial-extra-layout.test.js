'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {BoundedBits,inspectFacial,readScalarExtras}=require('./facial-extra-layout');
const {parse}=require('./clips-layout');
test('bounded facial reads reject truncated and invalid bit requests',()=>{
 const rd=new BoundedBits(Buffer.from([255]));assert.equal(rd.read(8),255);assert.throws(()=>rd.read(1),/exceeds/);
 assert.throws(()=>new BoundedBits(Buffer.alloc(1)).read(33),/exceeds/);
});
const fixture=process.env.AURORA_NATIVE_FACIAL;
test('validates complete bone prefix and zero word padding; rejects nonzero tail',{skip:!fixture},()=>{
 const b=fs.readFileSync(fixture),records=parse(b,{includeRaw:false}).records.filter(r=>r.trackIdentifiers.length===8);assert.equal(records.length,1);
 const r=records[0],p=inspectFacial(b,r.index);assert.equal(p.bonePrefixBits,6470);assert.equal(p.paddingBits,43);assert.equal(p.paddingAllZero,true);
 const values=readScalarExtras(b,r.index);assert.equal(values.channels.length,720);assert.equal(new Set(values.channels.map(c=>c.key)).size,720);
 assert.throws(()=>require('./clips-codec/parse-clips-record').parseClipsRecord(fixture,r.index),/Extra\/non-bone descriptors/);
 assert.ok(values.channels.filter(c=>!c.static).every(c=>c.values.length===361));
 const g=r.sections.find(s=>s.name==='group90'),mutated=Buffer.from(b);const stream=r.offset+parseInt(g.relativeOffset,16);mutated[stream+(p.dataEndBits>>3)]|=1<<(p.dataEndBits&7);
 assert.throws(()=>inspectFacial(mutated,r.index),/Nonzero unexplained/);
 const prefix=Buffer.from(b);prefix.writeUInt32LE(p.bonePrefixBits+1,r.offset+0x9c);assert.throws(()=>inspectFacial(prefix,r.index),/prefix mismatch/);
});
