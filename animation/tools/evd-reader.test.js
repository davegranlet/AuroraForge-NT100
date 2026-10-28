'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { HEADER_BYTES, readEvd } = require('./evd-reader');

const victoryRoot = 'D:\\AuroraForge-Aug26\\Extracted Files\\2k20\\Root\\Animation\\Victory';

test('reads the proven 2K20 Victory 6100 EVD envelope without interpreting its event payload', () => {
  const source = path.join(victoryRoot, '6100.evd');
  assert.ok(fs.existsSync(source), `Missing authoritative EVD fixture: ${source}`);
  const evd = readEvd(fs.readFileSync(source));
  assert.equal(evd.bytes, 20546);
  assert.equal(evd.motionId, 6100);
  assert.equal(evd.internalName, '6100_VIC_SINGLE_The_Rock_M_Face');
  assert.equal(evd.headerBytes, HEADER_BYTES);
  assert.equal(evd.payloadOffset, HEADER_BYTES);
  assert.equal(evd.payload.length, evd.bytes - HEADER_BYTES);
});

test('reads a second real 2K20 EVD envelope with a different metadata prefix', () => {
  const source = path.join(victoryRoot, '6101.evd');
  assert.ok(fs.existsSync(source), `Missing authoritative EVD fixture: ${source}`);
  const evd = readEvd(fs.readFileSync(source));
  assert.equal(evd.bytes, 18906);
  assert.equal(evd.motionId, 6101);
  assert.equal(evd.internalName, '6101_VIC_Steve_Austin_M_Face');
  assert.equal(evd.payloadOffset, HEADER_BYTES);
});

test('supports space-padded and null-terminated internal names', () => {
  const input = Buffer.alloc(HEADER_BYTES + 3, 0);
  input.writeUInt16LE(77, 0);
  input.write('TEST_EVENT', 2, 'ascii');
  input.writeUInt8(0xaa, HEADER_BYTES);
  const evd = readEvd(input);
  assert.equal(evd.motionId, 77);
  assert.equal(evd.internalName, 'TEST_EVENT');
  assert.deepEqual([...evd.payload], [0xaa, 0, 0]);
});

test('rejects an incomplete EVD envelope', () => {
  assert.throws(() => readEvd(Buffer.alloc(HEADER_BYTES - 1)), /span/);
});
