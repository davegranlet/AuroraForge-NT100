'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTarget, scanExecutableReferences } = require('./scan_pe_address_references');

function makePe() {
  const out = Buffer.alloc(0x1000);
  out.writeUInt16LE(0x5a4d, 0);
  out.writeUInt32LE(0x80, 0x3c);
  out.write('PE\0\0', 0x80, 'binary');
  out.writeUInt16LE(0x8664, 0x84);
  out.writeUInt16LE(2, 0x86);
  out.writeUInt16LE(0xf0, 0x94);
  out.writeUInt16LE(0x20b, 0x98);
  out.writeBigUInt64LE(0x140000000n, 0x98 + 24);
  const sections = 0x98 + 0xf0;
  out.write('.text', sections, 'ascii');
  out.writeUInt32LE(0x200, sections + 8);
  out.writeUInt32LE(0x1000, sections + 12);
  out.writeUInt32LE(0x200, sections + 16);
  out.writeUInt32LE(0x400, sections + 20);
  out.writeUInt32LE(0x60000020, sections + 36);
  const data = sections + 40;
  out.write('.rdata', data, 'ascii');
  out.writeUInt32LE(0x200, data + 8);
  out.writeUInt32LE(0x2000, data + 12);
  out.writeUInt32LE(0x200, data + 16);
  out.writeUInt32LE(0x600, data + 20);
  out.writeUInt32LE(0x40000040, data + 36);
  const targetRva = 0x2000;
  const displacementOffset = 0x420;
  const displacement = targetRva - (0x1000 + (displacementOffset - 0x400) + 4);
  out.writeInt32LE(displacement, displacementOffset);
  out.writeInt32LE(-36, 0x620); // A valid RIP-relative displacement in non-executable .rdata must be ignored.
  return out;
}

test('accepts target VA and RVA forms without precision loss', () => {
  assert.deepEqual(parseTarget('0x140002000', 0x140000000n), { input: '0x140002000', va: 0x140002000n, rva: 0x2000n });
  assert.deepEqual(parseTarget('0x2000', 0x140000000n), { input: '0x2000', va: 0x140002000n, rva: 0x2000n });
  assert.throws(() => parseTarget('0xnot-an-address', 0n), /invalid target address/);
});

test('finds candidate RIP-relative operands in executable sections only', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-pe-ref-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'sample.exe');
  fs.writeFileSync(file, makePe());
  const report = scanExecutableReferences(file, ['0x140002000']);
  assert.deepEqual(report.scannedExecutableSections.map((section) => section.name), ['.text']);
  assert.equal(report.hits.length, 1);
  assert.equal(report.hits[0].displacementFileOffset, '0x420');
  assert.equal(report.hits[0].targetRva, '0x2000');
});
