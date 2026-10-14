'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { convert } = require('./convert-yanm19-to-yanm20');
const { decodeSection } = require('./yanm20-reader');

const source = 'D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/analysis/victory-6100/decoded-shdc/0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin';
const reference = 'D:/games/2k20-extracts/animation-bridge/decoded/6100.acts.decoded.bin';

test('Victory 6100 converts from 2K19 to a readable 2K20 YANM section', () => {
  assert.ok(fs.existsSync(source), `missing authoritative 2K19 source: ${source}`);
  assert.ok(fs.existsSync(reference), `missing authoritative 2K20 reference: ${reference}`);
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-19-20-')), 'victory-6100.yanm20.bin');
  const result = convert(source, reference, output, 0, 37212);
  assert.equal(result.tracks, 62);
  assert.equal(result.bytes, 174976);
  const decoded = decodeSection(fs.readFileSync(output));
  const tracks = decoded.records.filter(record => record.type === 0x2100);
  assert.equal(decoded.records.length, 63);
  assert.equal(tracks.length, 62);
  assert.ok(tracks.every(record => record.streamA.length > 0 && record.streamB.length > 0));
});
