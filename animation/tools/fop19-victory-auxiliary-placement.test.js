'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {readVictoryAuxiliaryPlacements}=require('./fop19-victory-rope-placement');
const {resolve2k19ExtractPath}=require('./resolve-2k19-extract-path');
const {decode}=require('./yanm-keyframes');
const {parseFile,clipNameId}=require('./clips-layout');
const {parseClipsRecordBuffer}=require('./clips-codec/parse-clips-record');
const {readTrackDescriptors}=require('./clips-codec/read-track-descriptors');
const fixture=resolve2k19ExtractPath('_work/6100/00_0CE8FE35827FD8DE.unpacked.0fop');
const childRoot=path.join(path.dirname(fixture),'children');
const targetFile=path.resolve(__dirname,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');
const stagedFile=path.resolve(__dirname,'../workflows/victory-6100-2k19/victory-row-corrected-2k26-v3-group90-reordered/active-compare/right/Animation/CaeAdvanced/1014003.clips');

function rotateLeft7XorName(value){let h=0;for(const c of Buffer.from(value))h=(((h<<7)|(h>>>25))^c)>>>0;return h>>>0;}

test('maps all four fixed 6100 companion roots to their target clip identities',{skip:!fs.existsSync(fixture)},()=>{
 const rows=readVictoryAuxiliaryPlacements(fs.readFileSync(fixture));
 assert.deepEqual(rows.map(r=>[r.sourceChild,r.section,r.recordIndex]),[[7,18,0],[8,19,0],[13,24,0],[14,24,1]]);
 const expected={7:[252.25,131,-252.25],8:[-252.25,131,252.25],13:[-252.25,89,252.25],14:[252.25,89,-252.25]};
 const layout=parseFile(targetFile,{includeRaw:false});
 for(const row of rows){
  const file=fs.readdirSync(childRoot).find(name=>name.startsWith(`${row.sourceChild}_`)&&name.endsWith('.bin'));
  assert.ok(file,`missing child ${row.sourceChild}`);
  const section=decode(fs.readFileSync(path.join(childRoot,file)))[0];
  assert.equal(section.tracks.length,2);
  assert.equal(section.tracks[0].hash,rotateLeft7XorName(row.sourceRootName).toString(16));
  assert.deepEqual(row.position,expected[row.sourceChild]);
  assert.ok(section.tracks.every(t=>t.frameCount===2420&&t.timelineMatches));
  const clip=`6100_00_r${row.sourceRootName.slice(-2)}`;
  const targetId=clipNameId(clip),record=layout.records.find(r=>r.id===targetId);
  assert.ok(record,`target clip missing: ${clip}`);
  assert.equal(record.trackIdentifiers.length,3);
 }
});

test('staged 14003 clips preserve all four fixed companion placements',{skip:!fs.existsSync(fixture)||!fs.existsSync(stagedFile)},()=>{
 const sourceRows=readVictoryAuxiliaryPlacements(fs.readFileSync(fixture));
 const bytes=fs.readFileSync(stagedFile),layout=parseFile(stagedFile,{includeRaw:false});
 for(const row of sourceRows){
  const clip=`6100_00_r${row.sourceRootName.slice(-2)}`;
  const record=layout.records.find(r=>r.id===clipNameId(clip));
  assert.ok(record,`staged clip missing: ${clip}`);
  assert.equal(record.frameValue,2421);
  const decoded=parseClipsRecordBuffer(bytes,record.index);
  const descriptors=readTrackDescriptors({rec:decoded.rec},0);
  assert.ok(descriptors.every(d=>d.width===0),`${clip} fixed placement should be stored as static rest values`);
  const expected=[row.position[0],-row.position[1],row.position[2],0,-row.yaw/2,0];
  expected.forEach((value,i)=>assert.ok(Math.abs(value-descriptors[i].rest)<0.001,`${clip} root component ${i} disagrees with source placement`));
  assert.equal(decoded.group.bytes,0,`${clip} unexpectedly contains animated groups`);
 }
});
