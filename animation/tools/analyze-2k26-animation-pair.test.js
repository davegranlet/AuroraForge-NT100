'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build, clipNameId } = require('./clips-layout');
const { analyzeClips } = require('./analyze-2k26-animation-pair');

test('structural adapter matches proven name hash and leaves semantic roles unknown', () => {
  const root = path.resolve(__dirname, '../../.local/source-release'); fs.mkdirSync(root, {recursive:true});
  const work = fs.mkdtempSync(path.join(root, 'pair-adapter-test-'));
  const payload = Buffer.alloc(0xA8), id = clipNameId('273_a_00_m');
  payload.writeBigUInt64LE(BigInt(id),0); payload.writeFloatLE(60,0x0C); payload.writeUInt32LE(1,0x20); payload.writeUInt32LE(100,0x44); payload.writeBigUInt64LE(123n,0xA0);
  const file = path.join(work,'test.clips'); fs.writeFileSync(file,build([payload]));
  const report = analyzeClips(file,{assetNames:['273_a_00_M']});
  assert.equal(report.count,1); assert.deepEqual(report.records[0].matchedAssetNames,['273_a_00_M']);
  assert.equal(report.records[0].roleCandidate,'unknown'); assert.equal(report.records[0].payloadFamilyCandidate,'unknown');
  assert.deepEqual(report.records[0].resolvedTrackIdentifiersCandidate[0].names,[]);
  const annotated=analyzeClips(file,{recordAnnotations:{[id]:{role:'body motion',evidence:'explicit caller annotation'}}});
  assert.equal(annotated.records[0].roleCandidate,'body motion'); assert.equal(annotated.records[0].annotationEvidence,'explicit caller annotation');
  const invalid=path.join(work,'invalid.clips'); fs.writeFileSync(invalid,Buffer.alloc(4));
  assert.throws(()=>analyzeClips(invalid),/invalid/);
});
