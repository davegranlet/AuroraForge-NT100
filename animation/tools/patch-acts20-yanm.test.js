'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { parse } = require('./amym-container');
const { patch } = require('./patch-acts20-yanm');
const { decodeSection } = require('./yanm20-reader');

const acts20 = 'D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory/6100.acts';
const yanm20 = 'D:/AuroraForge-Aug26/_work/tutorial-check-6100.yanm20.bin';

test('patches an AMYM-wrapped 2K20 ACTS by updating the entry size table', { skip: !fs.existsSync(acts20) || !fs.existsSync(yanm20) }, () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-acts-patch-')), '6100.acts');
  const result = patch(acts20, yanm20, out, 37212);
  assert.equal(result.container, 'AMYM');
  const rebuilt = fs.readFileSync(out);
  const container = parse(rebuilt);
  const entry = container.entries[14];
  assert.equal(entry.offset + 192, 37212);
  assert.equal(entry.payload.toString('ascii', 192, 196), 'YANM');
  assert.equal(entry.bytes, 392176);
  const decoded = decodeSection(rebuilt.subarray(37212));
  assert.equal(decoded.records.filter((record) => record.type === 0x2100).length, 62);
});
