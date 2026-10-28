'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {parseFile,parse}=require('./clips-layout');
const {readTrackDescriptors}=require('./clips-codec/read-track-descriptors');
const {parseClipsRecord}=require('./clips-codec/parse-clips-record');
const {encodeSourceBodyRecord}=require('./build-source19-body-clips');
const template=path.resolve(__dirname,'../../umbrella-app/app/skeletons/14000-base/BakeMe/Animation/Victory/100.clips');

test('explicit non-body companion record id selects duplicate track signatures without weakening body matching',()=>{
 const layout=parseFile(template,{includeRaw:false});
 const first=layout.records[3],second=layout.records[8];
 assert.deepEqual(first.trackIdentifiers,second.trackIdentifiers);
 const matches=layout.records.filter(r=>r.trackIdentifiers.length===first.trackIdentifiers.length&&r.trackIdentifiers.every((id,i)=>id===first.trackIdentifiers[i]));
 assert.ok(matches.length>1,'fixture must exercise a duplicate structural track sequence');
 const parsed=parseClipsRecord(template,first.index),frames=2;
 const body=Array.from({length:first.trackIdentifiers.length},(_,i)=>{
  const d=readTrackDescriptors(parsed,i),p=d.slice(0,3).map(x=>x.rest),rotation=d.slice(3,6).map(x=>x.rest);
  return {index:i,p:[p,p],rotation:[rotation,rotation]};
 });
 const dir=fs.mkdtempSync(path.join(__dirname,'.source19-body-test-'));
 try{
  const out=path.join(dir,'record.clips');
  assert.throws(()=>encodeSourceBodyRecord({templatePath:template,recordIndex:first.index,expectedBoneIds:first.trackIdentifiers,body,frames,outputPath:out}),/one explicitly matched body bone-ID sequence/);
  const result=encodeSourceBodyRecord({templatePath:template,recordIndex:first.index,expectedBoneIds:first.trackIdentifiers,expectedRecordId:first.id,body,frames,outputPath:out});
  assert.equal(result.tracks,first.trackIdentifiers.length);
  const checked=parse(fs.readFileSync(out),{includeRaw:false});
  assert.equal(checked.count,1);assert.equal(checked.records[0].id,first.id);assert.equal(checked.records[0].frameValue,frames);
  assert.throws(()=>encodeSourceBodyRecord({templatePath:template,recordIndex:first.index,expectedBoneIds:first.trackIdentifiers,expectedRecordId:second.id,body,frames,outputPath:path.join(dir,'bad.clips')}),/Explicit companion record ID\/bone sequence mismatch/);
  assert.equal(fs.existsSync(path.join(dir,'bad.clips')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
