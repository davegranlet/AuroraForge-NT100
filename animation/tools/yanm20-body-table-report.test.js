'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildReport } = require('./yanm20-body-table-report');

function sourceFixture() {
  const b = Buffer.alloc(96);
  b.write('YANM');
  b.writeUInt32BE(88, 4);
  b.writeUInt16BE(2, 10);
  b.writeUInt16BE(0x2200, 16);
  b.writeUInt16BE(24, 18);
  b.writeUInt32BE(0x12345678, 20);
  b.writeUInt32BE(40, 24);
  b.writeUInt32BE(2, 28);
  b.writeUInt32BE(56, 32);
  b.writeUInt32BE(2, 36);
  b.writeInt16BE(-27, 48);
  b.writeUInt16BE(3, 54);
  b.writeUInt16BE(7, 62);
  b.writeUInt16BE(10, 78);
  return b;
}

function actsFixture() {
  const b = Buffer.alloc(96);
  b.write('YANM', 8);
  b.writeUInt32BE(80, 12);
  b.writeUInt16BE(2, 18);
  b.writeUInt16BE(0x2100, 24);
  b.writeUInt16BE(40, 26);
  b.writeUInt32BE(0x12345678, 28);
  b.writeUInt32BE(2800, 32);
  b.writeUInt32BE(42, 36);
  b.writeUInt32BE(4000, 40);
  b.writeUInt32BE(19, 44);
  b.writeFloatBE(0.25, 48);
  b.writeFloatBE(1.5, 52);
  b.writeFloatBE(-2.5, 56);
  b.writeFloatBE(10, 60);
  return b;
}

test('reports corrected 2K20 body table records against 2K19 source tracks', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yanm20-report-test-'));
  const source = path.join(temp, 'source.bin');
  const acts = path.join(temp, 'acts.bin');
  fs.writeFileSync(source, sourceFixture());
  fs.writeFileSync(acts, actsFixture());

  const report = buildReport({ source19: source, acts20: acts, section: 0, yanm: 8, table: 24, count: 1 });
  assert.equal(report.summary.hashMatches, 1);
  assert.equal(report.summary.type2100, 1);
  assert.equal(report.summary.headerSize40, 1);
  assert.equal(report.summary.commonAuxiliaryStreamB, 1);
  assert.equal(report.records[0].source.hash32, '0x12345678');
  assert.equal(report.records[0].target20.streamBRole, 'common-19-key-auxiliary');
});
