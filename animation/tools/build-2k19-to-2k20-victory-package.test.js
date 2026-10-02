'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildPackage } = require('./build-2k19-to-2k20-victory-package');
const { decodeSection } = require('./yanm20-reader');

const source19 = 'D:/AuroraForge-Aug26/WWE2K19-to-2K26-Entrance-Prototype/analysis/victory-6100/decoded-shdc/0_1_06100_entry_1_(BPE)_entry_0_(ZLIB).bin';
const fop19 = 'D:/AuroraForge-Aug26/_work/2k19-victory-6100-event/00_0CE8FE35827FD8DE.unpacked.0fop';
const referenceActs20 = 'D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory/6100.acts';
const referenceEvd20 = 'D:/AuroraForge-Aug26/Extracted Files/2k20/Root/Animation/Victory/6100.evd';

test('builds converted 2K20 ACTS and EVD package for Victory 6100', { skip: ![source19, fop19, referenceActs20, referenceEvd20].every(fs.existsSync) }, () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-2k20-package-'));
  const result = buildPackage({ source19, fop19, referenceActs20, referenceEvd20, outputRoot, id: '6100' });
  assert.equal(result.ok, true);
  assert.equal(result.motion.bytes, 174976);
  assert.equal(result.acts.bytes, fs.statSync(path.join(outputRoot, 'Root', 'Animation', 'Victory', '6100.acts')).size);
  assert.equal(result.evd.eventBodies, 24);
  const acts = fs.readFileSync(path.join(outputRoot, 'Root', 'Animation', 'Victory', '6100.acts'));
  const decoded = decodeSection(acts.subarray(37212));
  const tracks = decoded.records.filter((record) => record.type === 0x2100);
  assert.equal(tracks.length, 62);
  assert.equal(tracks.every((record) => record.streamA.length && record.streamB.length), true);
});
