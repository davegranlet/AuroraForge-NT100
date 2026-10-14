'use strict';
// Integration gates for the split clips-codec modules. Requires the local
// stock fixture (not shipped); the test self-skips when the fixture is absent.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { parseClipsRecord } = require('./parse-clips-record');
const { evalDenseGroup } = require('./eval-dense-group');
const { encodeDenseGroup } = require('./encode-dense-group');
const { copyBits } = require('./copy-bits');
const { concatWriters } = require('./concat-writers');
const { readTrackDescriptors } = require('./read-track-descriptors');

const FIXTURE = 'D:/AuroraForge-Aug26/_work/clips25/Animation/Victory/6100.clips';
const RECORD = 15;
const skip = !fs.existsSync(FIXTURE);

test('V1 gate: verbatim group re-emission is byte-identical', { skip }, () => {
  const r = parseClipsRecord(FIXTURE, RECORD);
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const parts = [];
  let cursor = 0;
  for (const bone of r.bones) {
    for (const group of bone.groups) {
      assert.strictEqual(group.start, cursor, `gap at bone ${bone.track}`);
      parts.push(copyBits(stream, group.start, group.end));
      cursor = group.end;
    }
  }
  const out = concatWriters(parts).flush();
  const original = stream.subarray(0, Math.ceil(r.consumed / 8));
  assert.strictEqual(out.length, original.length);
  assert.ok(out.equals(original), 'rebuilt bits differ from stock');
});

test('V2 gate: stock hips groups decode and re-encode bit-identical', { skip }, () => {
  const r = parseClipsRecord(FIXTURE, RECORD);
  const stream = r.file.subarray(r.base, r.base + r.group.bytes);
  const frames = r.rec.frameValue;
  const descs = readTrackDescriptors(r, 1);
  const position = r.bones[1].groups[0];
  const rotation = r.bones[1].groups[1];
  const posRows = evalDenseGroup(stream, position, descs.slice(0, 3), frames);
  const rotRows = evalDenseGroup(stream, rotation, descs.slice(3, 6), frames);
  assert.ok(posRows && rotRows, 'hips groups must be dense-decodable');
  const posWriter = encodeDenseGroup(posRows, descs.slice(0, 3));
  const rotWriter = encodeDenseGroup(rotRows, descs.slice(3, 6));
  assert.strictEqual(posWriter.clampCount || 0, 0);
  const posBits = posWriter.flush();
  const posLength = posWriter.bitLength();
  assert.strictEqual(posLength, position.end - position.start);
  for (let p = 0; p < posLength; p++) {
    const a = (posBits[p >> 3] >> (p & 7)) & 1;
    const q = position.start + p;
    const b = (stream[q >> 3] >> (q & 7)) & 1;
    assert.strictEqual(a, b, `position bit ${p}`);
  }
  assert.strictEqual(rotWriter.bitLength(), rotation.end - rotation.start);
});
