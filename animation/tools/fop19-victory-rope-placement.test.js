'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {readVictoryRopePlacements}=require('./fop19-victory-rope-placement');
const {parseClipsRecord}=require('./clips-codec/parse-clips-record');
const {readTrackDescriptors}=require('./clips-codec/read-track-descriptors');
const source=require('./resolve-2k19-extract-path').resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop');
test('Victory6100 event placements explain all four static corner-rope target roots',{skip:!fs.existsSync(source)},()=>{
 const bytes=fs.readFileSync(source),rows=readVictoryRopePlacements(bytes);
 assert.equal(rows.length,8);
 assert.deepEqual(rows.slice(4).map(r=>r.tuples.map(t=>t.time)),[[0,1420,2060],[0,470,988],[0,436,988],[0,1460,2060]]);
 const template=path.resolve(__dirname,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
 for(let i=0;i<4;i++){
  const tuple=rows[i].tuples[0],r=parseClipsRecord(template,[12,11,10,9][i]),d=readTrackDescriptors(r,0);
  assert.equal(rows[i].tuples.length,1);
  const converted=[tuple.position[0],-tuple.position[1],tuple.position[2],0,-tuple.yaw/2,0];
  converted.forEach((v,c)=>assert.ok(Math.abs(v-d[c].rest)<.001,'source event placement disagrees with target static root'));
 }
 const bad=Buffer.from(bytes);bad.writeFloatBE(NaN,rows[0].tuples[0].offset);
 assert.throws(()=>readVictoryRopePlacements(bad),/Invalid/);
});
