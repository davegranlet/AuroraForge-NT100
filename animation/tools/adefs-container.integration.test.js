'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { decode } = require('./adefs-container');

const fixtures = [
  ['2K24', 'D:/converter-files-usefull/drive-download-20260913T210407Z-1-001/Animation/Victory/6100.adefs', 31043],
  ['2K25', 'C:/Games/2k25-extracts/Root/Animation/Victory/6100.adefs', 31169],
];

test('decodes real 2K24 and 2K25 Victory 6100 ADEF v6 envelopes', () => {
  const payloads = new Map();
  for (const [version, file, expectedExpandedBytes] of fixtures) {
    assert.ok(fs.existsSync(file), `${version} controlled ADEF fixture is available`);
    const decoded = decode(fs.readFileSync(file));
    assert.equal(decoded.version, 6);
    assert.equal(decoded.expandedBytes, expectedExpandedBytes);
    assert.ok(decoded.payload.includes(Buffer.from('Play_sfx_crowds_match_oneshots')));
    payloads.set(version, decoded.payload);
  }
  assert.notDeepEqual(payloads.get('2K24'), payloads.get('2K25'), 'cross-version payloads are distinct and must not be copied');
});
