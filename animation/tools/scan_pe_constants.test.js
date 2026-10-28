'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { encodeU64, scanPeConstants } = require('./scan_pe_constants');

function peFixture(values) {
  const buffer = Buffer.alloc(0x400);
  buffer.write('MZ', 0, 'ascii');
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.write('PE\0\0', 0x80, 'binary');
  buffer.writeUInt16LE(0x8664, 0x84);
  buffer.writeUInt16LE(1, 0x86);
  buffer.writeUInt16LE(0xf0, 0x94);
  const optional = 0x98;
  buffer.writeUInt16LE(0x20b, optional);
  buffer.writeBigUInt64LE(0x140000000n, optional + 24);
  const section = optional + 0xf0;
  buffer.write('.text', section, 'ascii');
  buffer.writeUInt32LE(0x200, section + 8);
  buffer.writeUInt32LE(0x1000, section + 12);
  buffer.writeUInt32LE(0x200, section + 16);
  buffer.writeUInt32LE(0x200, section + 20);
  values.forEach((value, index) => encodeU64(value).copy(buffer, 0x220 + index * 16));
  return buffer;
}

test('encodeU64 writes exact unsigned little-endian values and rejects invalid input', () => {
  assert.equal(encodeU64('13953526755221441880').toString('hex'), '580de2a8a7e2a4c1');
  assert.throws(() => encodeU64('-1'), /invalid unsigned/);
  assert.throws(() => encodeU64('18446744073709551616'), /out of range/);
});

test('scanPeConstants reports exact constants with PE section and RVA', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-pe-u64-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'fixture.exe');
  fs.writeFileSync(file, peFixture(['13953526755221441880', '865438131710457754']));
  const result = scanPeConstants(file, ['13953526755221441880', '865438131710457754', '123']);
  assert.equal(result.hits.length, 2);
  assert.deepEqual(result.hits.map((hit) => [hit.value, hit.section, hit.rva]), [
    ['13953526755221441880', '.text', '0x1020'],
    ['865438131710457754', '.text', '0x1030'],
  ]);
});
