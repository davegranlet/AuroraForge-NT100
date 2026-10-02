'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { decode, readKeys } = require('./yanm-keyframes');

function fixture() {
  const b = Buffer.alloc(96);
  b.write('YANM');
  b.writeUInt32BE(88, 4);
  b.writeUInt16BE(2, 10);
  b.writeUInt16BE(0x2200, 16);
  b.writeUInt16BE(24, 18);
  b.writeUInt32BE(0x12345678, 20);
  b.writeUInt32BE(40, 24); // Keys relative to root + 8.
  b.writeUInt32BE(2, 28);
  b.writeUInt32BE(56, 32);
  b.writeUInt32BE(2, 36);
  b.writeInt16BE(-27, 48);
  b.writeUInt16BE(3, 54);
  b.writeUInt16BE(7, 62);
  b.writeUInt16BE(10, 78);
  return b;
}

test('track count comes from +10, not section length at +4', () => {
  const [section] = decode(fixture());
  assert.equal(section.tracks.length, 1);
  assert.equal(section.tracks[0].timelineMatches, true);
  assert.deepEqual(section.tracks[0].primary.keys.map(k => k.frame), [3, 10]);
  assert.equal(section.tracks[0].primary.keys[0].packed[0], -27);
});
test('multiple sections retain independent offset bases', () => {
  const sections = decode(Buffer.concat([fixture(), fixture()]));
  assert.equal(sections.length, 2);
  assert.equal(sections[1].root, 96);
  assert.equal(sections[1].tracks[0].timelineMatches, true);
});
test('compact delta flag is retained but not added to time', () => {
  const b = Buffer.from([0, 1, 0x80, 5]);
  const keys = readKeys(b, 0, 1, 4, 2, 4);
  assert.equal(keys.totalFrames, 5);
  assert.equal(keys.keys[0].deltaFlags, 0x8000);
});
test('timeline disagreement is reported, never silently accepted', () => {
  const b = fixture(); b.writeUInt16BE(11, 78);
  assert.equal(decode(b)[0].tracks[0].timelineMatches, false);
});
test('unknown record type is explicit, not guessed', () => {
  const b = fixture(); b.writeUInt16BE(0xffff, 16);
  assert.equal(decode(b)[0].tracks[0].supported, false);
});
test('reject missing signature and truncated sections', () => {
  assert.throws(() => decode(Buffer.alloc(8)), /No YANM/);
  assert.throws(() => decode(fixture().subarray(0, 80)), /bounds/);
});
test('reject key blocks crossing their section into another section', () => {
  const b = Buffer.concat([fixture(), fixture()]);
  b.writeUInt32BE(8, 28);
  assert.throws(() => decode(b), /bounds/);
});
test('reject oversized counts and unexpected headers', () => {
  const b = fixture(); b.writeUInt32BE(1000001, 28);
  assert.throws(() => decode(b), /limit/);
  const c = fixture(); c.writeUInt16BE(25, 18);
  assert.throws(() => decode(c), /header/);
});
