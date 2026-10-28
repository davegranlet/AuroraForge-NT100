'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {parseBank,extractBanks,extractVictoryBank}=require('./ymam19-reader');
const source=process.env.AURORA_SOURCE273;
const victory=require('./resolve-2k19-extract-path').resolve2k19ExtractPath('victory/6100.bin');
test('reads all128 Victory curves with wrapper-proven extent and explicit zero alignment padding',{skip:!fs.existsSync(victory)},()=>{
 const b=fs.readFileSync(victory),bank=extractVictoryBank(b,2421);
 assert.equal(bank.offset,313072);assert.equal(bank.length,334089);
 assert.equal(bank.parsed.curves.length,128);assert.equal(bank.parsed.curves.at(-1).frames.length,118);
 const c=bank.parsed.coverage;
 assert.equal(c.header+c.records+c.names+c.frames+c.framePadding+c.values,bank.length);
 assert.equal(c.framePadding,2);
 const wrapper=Buffer.from(b);wrapper.writeUInt32BE(bank.length+1,bank.offset-4);
 assert.throws(()=>extractVictoryBank(wrapper,2421),/wrapper extent/);
 const pad=Buffer.from(b),valueStart=pad.readUInt32BE(bank.offset+0x40);pad[bank.offset+valueStart-1]=1;
 assert.throws(()=>extractVictoryBank(pad,2421),/padding/);
});
test('rejects unsupported bank data and absent phase counts',()=>{
 assert.throws(()=>parseBank(Buffer.alloc(8),361),/size/);
 assert.throws(()=>extractBanks(Buffer.alloc(8),[]),/Five explicit/);
 assert.throws(()=>extractBanks(Buffer.alloc(8),[361,795,891,957,201]),/Expected five/);
});
test('extracts exact source ranges and rejects malformed keyed curve storage',{skip:!source},()=>{
 const bytes=fs.readFileSync(source),banks=extractBanks(bytes,[361,795,891,957,201]);
 assert.equal(banks.length,5);
 assert.deepEqual(banks.map(b=>b.offset),[38236,170272,423608,725576,872832]);
 for(const bank of banks){assert.equal(bank.parsed.curves.length,119);assert.equal(bank.parsed.coverage.exact,true);assert.ok(bank.bytes.equals(bytes.subarray(bank.offset,bank.offset+bank.length)));}
 const b=Buffer.from(banks[0].bytes),first=b.readUInt32BE(0x38+4);b.writeUInt16BE(361,first);assert.throws(()=>parseBank(b,361),/frame order\/range/);
 const count=Buffer.from(banks[0].bytes);count.writeUInt32BE(118,0x24);assert.throws(()=>parseBank(count,361),/profile/);
 const name=Buffer.from(banks[0].bytes);name[0xb54+15]=65;assert.throws(()=>parseBank(name,361),/name slot/);
});
