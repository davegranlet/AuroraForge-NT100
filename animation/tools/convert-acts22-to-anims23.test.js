'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { convert } = require('./convert-acts22-to-anims23');

const source = 'D:/AuroraForge-Aug26/Extracted Files/2k22/Root/Animation/Victory/6100.acts';
const target = 'D:/AuroraForge-Aug26/Extracted Files/2k23/Root/Animation/Victory/6100.anims';

test('2K22 Victory 6100 refuses an unresolved 2K23 TBUF payload copy', () => {
  assert.ok(fs.existsSync(source), 'controlled 2K22 source fixture is available');
  assert.ok(fs.existsSync(target), 'controlled 2K23 target fixture is available');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-22-23-'));
  const output = path.join(directory, '6100.anims');
  assert.throws(() => convert(source, target, output), /unresolved TBUF payload layout at block 14; refusing payload copy/);
  assert.equal(fs.existsSync(output), false, 'the guard must not emit a mislabeled output');
});
