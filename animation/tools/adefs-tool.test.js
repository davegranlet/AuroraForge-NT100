'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { encode } = require('./adefs-container');
const { compare, inspect, printableTokens, run } = require('./adefs-tool');

test('reads and compares bounded ADEF envelopes without offering a writer', () => {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-adefs-tool-'));
  try {
    const left = path.join(work, 'left.adefs'); const right = path.join(work, 'right.adefs');
    fs.writeFileSync(left, encode(Buffer.from('clip_name\0crowd_sound\0', 'ascii')));
    fs.writeFileSync(right, encode(Buffer.from('clip_name\0crowd_s0und\0', 'ascii')));
    const report = inspect(left);
    assert.equal(report.version, 6);
    assert.equal(report.expandedBytes, 22);
    assert.ok(report.printableTokens.includes('clip_name'));
    assert.equal(compare(left, right).payload.changedBytes, 1);
    assert.throws(() => run(['write']), /Usage/);
    assert.deepEqual(printableTokens(Buffer.from('one\0two\0', 'ascii')), []);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
});
