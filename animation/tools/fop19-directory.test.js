'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {readDirectory}=require('./fop19-directory');
const fixture=require('./resolve-2k19-extract-path').resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop');
test('Victory6100 directory accounts for every source byte after the directory',{skip:!fs.existsSync(fixture)},()=>{
 const b=fs.readFileSync(fixture),x=readDirectory(b);
 assert.equal(x.entries.length,24);
 assert.equal(x.directoryEnd,868);
 assert.equal(x.entries.reduce((n,e)=>n+e.spanBytes,x.directoryEnd),b.length);
 const overlap=Buffer.from(b);overlap.writeUInt32BE(x.directoryEnd-1,0x68);
 assert.throws(()=>readDirectory(overlap),/overlaps/);
 const reversed=Buffer.from(b);reversed.writeUInt32BE(x.entries[0].payloadOffset,0x88);
 assert.throws(()=>readDirectory(reversed),/Non-monotonic/);
});
