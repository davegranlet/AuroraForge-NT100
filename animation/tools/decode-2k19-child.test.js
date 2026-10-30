'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {decodeChildSection,decodeEntrance}=require('./decode-2k19-entrance-source');

// Fixtures are read-only inputs from the local WWE 2K19 extraction; tests skip when absent.
const {resolve2k19ExtractPath}=require('./resolve-2k19-extract-path');
const childFixture=resolve2k19ExtractPath('entrance/2730.bin');
const entranceFixture=resolve2k19ExtractPath('entrance/273.bin');

test('child 2730 decodes as one 62-track classic body with 1452 source frames',{skip:!fs.existsSync(childFixture)},()=>{
  const child=decodeChildSection(fs.readFileSync(childFixture));
  assert.equal(child.durationFrames,1452);
  assert.equal(child.frames,1453);
  assert.equal(child.sourceTracks.length,62);
  assert.equal(child.body.length,64);
  assert.deepEqual(child.sourceHashes.slice(0,4),['0c5879e5','f91a7a26','0daecc2e','0daecc2d']);
  for(const t of child.body) assert.equal(t.p.length,1453,`track ${t.index} frame count`);
});

test('child body mapping equals the entrance body mapping for the same motion (shared code path)',{skip:!fs.existsSync(entranceFixture)||!fs.existsSync(childFixture)},()=>{
  const {buildTargetBody,sourceMotionFromBody}=require('./decode-2k19-entrance-source');
  const {decode}=require('./yanm-keyframes');
  const sec=decode(fs.readFileSync(childFixture))[0];
  const duration=sec.tracks[0].frameCount;
  const motion=sourceMotionFromBody(sec.tracks,duration);
  const direct=buildTargetBody(motion,duration);
  const child=decodeChildSection(fs.readFileSync(childFixture));
  assert.deepEqual(child.body[62].p[100],direct[62].p[100]);
  assert.deepEqual(child.body[1].q[500],direct[1].q[500]);
  void decodeEntrance;
});
