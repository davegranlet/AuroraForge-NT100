'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');

const source24 = 'D:/converter-files-usefull/drive-download-20260913T210407Z-1-001/Cutscene/ListData/EntranceMotionTableData.jsfb';
const target25 = 'C:/Games/2k25-extracts/Root/Cutscene/ListData/EntranceMotionTableData.jsfb';
const SHA256 = '2C7AF323AD54B00CB6294E9A7C472A0952D4B32AD0EEB5B862797362CAAF6955';

test('2K24 and 2K25 preserve the EntranceMotionTable registration anchor exactly', () => {
  assert.ok(fs.existsSync(source24), '2K24 table fixture is available');
  assert.ok(fs.existsSync(target25), '2K25 table fixture is available');
  const source = fs.readFileSync(source24);
  const target = fs.readFileSync(target25);
  assert.equal(source.length, 1204);
  assert.deepEqual(source, target);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex').toUpperCase(), SHA256);
  assert.equal(source.toString('ascii', 4, 8), 'Entr');
});
