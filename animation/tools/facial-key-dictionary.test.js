'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {facialNameKey,readFacialKeyDictionary}=require('./facial-key-dictionary');
test('facial key uses the standard CRC32C check vector and measured AU key',()=>{
 assert.equal(facialNameKey('123456789'),0xe3069283);
 assert.equal(facialNameKey('au001_l'),397076300);
 assert.notEqual(facialNameKey('AU001_L'),facialNameKey('au001_l'));
 assert.throws(()=>facialNameKey('\0'),/Invalid/);
});
test('resolves real Victory AU keys without assigning source morphs',()=>{
 const b=fs.readFileSync(path.resolve(__dirname,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips'));
 const r=readFacialKeyDictionary(b,16,['au001_l','au001_r','does-not-exist']);
 assert.equal(r.matched,2);assert.equal(r.entries[8].name,'au001_l');
 assert.equal(r.entries.filter(e=>e.name===null).length,718);
 assert.throws(()=>readFacialKeyDictionary(b,15,['au001_l']),/eight-bone/);
});
