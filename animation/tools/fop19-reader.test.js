'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { readFop19 } = require('./fop19-reader');

const fixture = 'D:\\AuroraForge-Aug26\\_work\\2k19-victory-6100-event\\00_0CE8FE35827FD8DE.unpacked.0fop';

test('reads the extracted 2K19 Victory 6100 0FOP event index', () => {
  assert.ok(fs.existsSync(fixture), `Missing authoritative 0FOP fixture: ${fixture}`);
  const fop = readFop19(fs.readFileSync(fixture));
  assert.equal(fop.bytes, 20620);
  assert.equal(fop.prefixBytes, 0x20);
  assert.equal(fop.motionId, 6100);
  assert.equal(fop.internalName, '6100_The_Rock_Modern');
  assert.equal(fop.entryCount, 24);
  assert.equal(fop.entriesOffset, 0x64);
  assert.equal(fop.entries[0].payloadOffsetBE, 0x364);
  assert.equal(fop.entries[0].eventIdBE, 1);
  assert.equal(fop.entries[23].eventIdBE, 24);
});

test('rejects a non-0FOP payload', () => {
  assert.throws(() => readFop19(Buffer.alloc(0x44)), /0FOP/);
});
