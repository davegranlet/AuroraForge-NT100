'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {eulerWordsToQuaternion,positionFrames,rotationFrames,multiply,inverse,rotate,decodeEntrance}=require('./decode-2k19-entrance-source');
const distance=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((s,v,c)=>s+v*b[c],0))))*180/Math.PI;

test('Euler folds have a full-word period and remain physically continuous',()=>{
  assert.ok(distance(eulerWordsToQuaternion([32767,-14499,-32767]),eulerWordsToQuaternion([-32768,-14499,-32768]))<0.02);
  assert.ok(distance(eulerWordsToQuaternion([1234,5678,9012]),eulerWordsToQuaternion([1234+65536,5678,9012]))<0.00001);
});
test('ZYX composition is preserved instead of treating Euler words as a rotation vector',()=>{
  const q=eulerWordsToQuaternion([16384,16384,0]);
  const expected=multiply([Math.SQRT1_2,0,Math.SQRT1_2,0],[Math.SQRT1_2,Math.SQRT1_2,0,0]);
  assert.ok(distance(q,expected)<0.00001);
});
test('translation increments are accumulated once regardless of key spacing',()=>{
  const p=positionFrames({keys:[{frame:0,delta:0,packed:[0,0,0]},{frame:10,delta:10,packed:[2,-4,6]}]},[.5,1,2,3],10);
  assert.deepEqual(p[0],[1,2,3]);assert.deepEqual(p[10],[2,0,6]);assert.deepEqual(p[5],[1.5,1,4.5]);
});
test('root and relative hips compose back into the original source pose',()=>{
  const root=eulerWordsToQuaternion([0,17000,0]),hip=eulerWordsToQuaternion([3200,10000,-2200]);
  const local=multiply(inverse(root),hip);
  assert.ok(distance(multiply(root,local),hip)<0.00001);
  const p=[10,20,30],inverseP=rotate(inverse(root),p.map(v=>-v)),roundTrip=rotate(root,inverseP).map((v,c)=>v+p[c]);
  assert.ok(Math.hypot(...roundTrip)<1e-10);
});
test('rotation sampling preserves exact endpoints and quaternion continuity across a sentinel',()=>{
  const keys=[{frame:0,packed:[32760,-14499,-32760]},{frame:1,packed:[-32768,-14499,-32768]},{frame:2,packed:[-32760,-14499,32760]}];
  const rows=rotationFrames({keys},2);
  rows.forEach((q,i)=>assert.ok(distance(q,eulerWordsToQuaternion(keys[i].packed))<0.00001));
  assert.ok(distance(rows[0],rows[1])<.1&&distance(rows[1],rows[2])<.1);
});
const {resolve2k19ExtractPath}=require('./resolve-2k19-extract-path');
const fixture=resolve2k19ExtractPath('entrance/273.bin');
const victoryFixture=resolve2k19ExtractPath('victory/6100.bin');
test('real Victory6100 retains the complete source body/facial timeline',{skip:!fs.existsSync(victoryFixture)},()=>{
  const {decodeVictory}=require('./decode-2k19-entrance-source');
  const source=decodeVictory(victoryFixture);
  assert.equal(source.durationFrames,2420);assert.equal(source.frames,2421);
  assert.equal(source.body.length,64);assert.equal(source.facial.length,7);
  for(const track of [...source.body,...source.facial]){
    assert.equal(track.p.length,2421);assert.equal(track.q.length,2421);
    assert.ok(track.p.every(row=>row.every(Number.isFinite)));
    assert.ok(track.q.every(row=>Math.abs(Math.hypot(...row)-1)<1e-6));
  }
  for(const i of [53,54,55,56,57,58,59,60])assert.equal(source.body[i].provenance,`source track ${i}`);
  assert.notDeepEqual(source.sourceTracks[1].p[0],source.sourceTracks[1].p.at(-1));
});
test('real 273 source keeps all five phase lengths, legs, and continuous source anchors',{skip:!fs.existsSync(fixture)},()=>{
  const source=decodeEntrance(fixture);
  assert.deepEqual(source.phases.map(p=>p.durationFrames),[360,794,890,956,200]);
  for(let i=0;i<source.phases.length;i++){
    const p=source.phases[i];assert.equal(p.sourceTracks.length,62);assert.equal(p.body.length,64);assert.equal(p.facial.length,7);
    for(const tr of [53,54,55,56,57,58,59,60])assert.equal(p.body[tr].provenance,`source track ${tr}`);
    if(i+1<source.phases.length){
      const next=source.phases[i+1],a=p.sourceTracks[1].p.at(-1),b=next.sourceTracks[1].p[0];
      assert.ok(Math.hypot(...a.map((v,c)=>v-b[c]))<.03,'source position anchors drift');
    }
  }
});
