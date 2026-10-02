'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse, build } = require('./amym-container');

function fixture() {
  const buffer = Buffer.alloc(80);
  buffer.write('AMYM'); buffer.writeUInt32LE(2, 4); buffer.writeUInt32LE(3, 8);
  buffer.writeUInt32LE(2, 28); buffer.writeUInt32LE(2, 40); buffer.writeUInt32LE(1, 44);
  [3, 4, 5].forEach((size, index) => buffer.writeUInt32LE(size, 48 + index * 4));
  [24, 10, 0].forEach((id, index) => buffer.writeUInt16LE(id, 60 + index * 2));
  buffer.writeUInt16LE(0xabcd, 66); // Preserve alignment bytes rather than fabricate zeros.
  buffer.fill(0x41, 68, 71); buffer.fill(0x42, 71, 75); buffer.fill(0x43, 75);
  return buffer;
}

test('AMYM reads multiple groups and preserves opaque entries and alignment', () => {
  const original = fixture(), decoded = parse(original);
  assert.equal(decoded.payloadOffset, 68);
  assert.deepEqual(decoded.groups.map(x => [x.firstEntry, x.count]), [[0, 2], [2, 1]]);
  assert.deepEqual(decoded.entries.map(x => x.id), [24, 10, 0]);
  assert.deepEqual(build(decoded), original);
  const changed = build(decoded, [Buffer.alloc(8, 0x44), decoded.entries[1].payload, decoded.entries[2].payload]);
  const readback = parse(changed);
  assert.equal(readback.entries[1].offset, 76);
  assert.deepEqual(readback.entries[2].payload, decoded.entries[2].payload);
  assert.equal(changed.readUInt16LE(66), 0xabcd);
});

test('AMYM rejects truncated, trailing, invalid-group and corrupt-size data', () => {
  assert.throws(() => parse(fixture().subarray(0, 79)), /bounds/);
  assert.throws(() => parse(Buffer.concat([fixture(), Buffer.alloc(1)])), /trailing/);
  const badGroup = fixture(); badGroup.writeUInt32LE(4, 28);
  assert.throws(() => parse(badGroup), /group exceeds/);
  const badSize = fixture(); badSize.writeUInt32LE(0xffffffff, 48);
  assert.throws(() => parse(badSize), /bounds/);
});

for (const [id, count, bytes] of [[6100, 15, 393244], [6101, 19, 599316], [6102, 8, 248208]]) {
  const input = `D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory/${id}.acts`;
  test(`AMYM independently covers and round-trips the complete 2K22 Victory ${id} asset`, { skip: !fs.existsSync(input) }, () => {
    const original = fs.readFileSync(input), decoded = parse(original);
    assert.equal(decoded.entryCount, count);
    assert.equal(original.length, bytes);
    assert.equal(decoded.entries.at(-1).offset + decoded.entries.at(-1).bytes, bytes);
    assert.deepEqual(build(decoded), original);
  });
}
