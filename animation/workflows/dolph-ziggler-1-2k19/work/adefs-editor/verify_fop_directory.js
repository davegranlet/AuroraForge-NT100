'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {readDirectory}=require('../../outputs/dolph-ziggler-1-2k19/read-fop-directory');
const root='D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/_work';
const fixtures=[273,274,275].map(id=>({id,file:path.join(root,String(id),fs.readdirSync(path.join(root,String(id))).find(n=>n.endsWith('.0fop')))}));
fixtures.push({id:6100,file:'D:/AuroraForge-Aug26/_work/2k19-victory-6100-event/00_0CE8FE35827FD8DE.unpacked.0fop'});
const report=[];
for(const fixture of fixtures){
 const bytes=fs.readFileSync(fixture.file),parsed=readDirectory(bytes);
 assert.equal(parsed.entries.length,({273:14,274:15,275:18,6100:24})[fixture.id]);
 assert.equal(parsed.entries[0].payloadOffset,parsed.directoryEnd);
 const bad=Buffer.from(bytes);bad.writeUInt32BE(parsed.directoryEnd-1,0x68);
 assert.throws(()=>readDirectory(bad),/overlaps/);
 report.push({...fixture,bytes:bytes.length,legacyCountAt0x14:bytes.readUInt32BE(0x14),...parsed});
}
fs.writeFileSync('outputs/dolph-ziggler-1-2k19/fop-directory-verification.json',JSON.stringify(report,null,2));
console.log(report.map(r=>({id:r.id,entries:r.entries.length,directoryEnd:r.directoryEnd,overlapRejectionPassed:true})));
