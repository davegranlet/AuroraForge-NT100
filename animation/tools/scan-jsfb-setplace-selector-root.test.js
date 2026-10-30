'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { inspect } = require('./scan-jsfb-setplace-selector-root');

// Independent layout derived from consumer ushort vtable indices 3 and 2.
// Each vtable begins with size/object-size words, so these are fields 1 and 0.
const b = Buffer.alloc(112);
b.writeUInt32LE(16, 0);
b.write('Test', 4);
b.writeUInt16LE(8, 8); b.writeUInt16LE(8, 10);
b.writeUInt16LE(4, 14);
b.writeInt32LE(8, 16); b.writeUInt32LE(20, 20);
b.writeUInt16LE(6, 32); b.writeUInt16LE(8, 34);
b.writeUInt16LE(4, 36);
b.writeInt32LE(8, 40); b.writeUInt32LE(12, 44);
b.writeUInt32LE(1, 56); b.writeUInt32LE(20, 60);
b.writeUInt16LE(14, 64); b.writeUInt16LE(24, 66);
b.writeUInt16LE(4, 68); b.writeUInt16LE(8, 70);
b.writeUInt16LE(16, 76);
b.writeInt32LE(16, 80); b.writeUInt8(4, 84);
b.writeInt32LE(37, 88); b.writeBigUInt64LE(0xFEDCBA9876543210n, 96);
const file = path.join(__dirname, '..', 'workflows', 'victory-6100-2k19', 'outputs', 'camera-runtime-snapshots-20261027', 'selector-scanner-regression.jsfb');
fs.writeFileSync(file, b);
try {
  const result = inspect(file);
  assert.equal(result.entryCount, 1);
  assert.deepEqual(result.category4Rows.map(({ category, selector, key }) => ({ category, selector, key })),
    [{ category: 4, selector: 37, key: '0xFEDCBA9876543210' }]);
  console.log('PASS: vtable header offset, selector and integer-safe key decoding');
} finally { fs.unlinkSync(file); }
