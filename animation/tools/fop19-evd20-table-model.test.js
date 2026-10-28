'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { compareFop19Evd20Index } = require('./fop19-evd20-table-model');

const pairs = [
  ...['6100', '6101', '6102'].map(id => [id, require('./resolve-2k19-extract-path').resolve2k19ExtractPath(`_work/${id}/${({6100:'00_0CE8FE35827FD8DE',6101:'00_0232F66D779E61F2',6102:'00_80CEF2F0274B4343'})[id]}.unpacked.0fop`)]),
];
const evdRoot = 'D:\\forge-files\\Extracted Files\\2k20\\Root\\Animation\\Victory';

for (const [id, fopPath] of pairs) {
  test(`derives the populated ${id} EVD index from its 2K19 0FOP index`, () => {
    const evdPath = `${evdRoot}\\${id}.evd`;
    assert.ok(fs.existsSync(fopPath), `Missing 0FOP fixture: ${fopPath}`);
    assert.ok(fs.existsSync(evdPath), `Missing EVD fixture: ${evdPath}`);
    const report = compareFop19Evd20Index(fs.readFileSync(fopPath), fs.readFileSync(evdPath));
    assert.equal(report.fopMotionId, Number(id));
    assert.ok(report.populatedEntries > 0);
    assert.equal(report.valid, true);
    assert.ok(report.comparisons.every((entry) => entry.markerMatches && entry.pointerMatches));
  });
}

test('records the controlled nonuniform table fields instead of treating them as raw copies', () => {
  const report6101 = compareFop19Evd20Index(
    fs.readFileSync(pairs[1][1]),
    fs.readFileSync(`${evdRoot}\\6101.evd`),
  );
  assert.deepEqual(report6101.comparisons.filter((entry) => entry.tailDifferenceOffsets.length).map((entry) => entry.index), [11, 19]);
  assert.equal(report6101.comparisons.find((entry) => entry.index === 22).eventIdEncoding, 'raw-preserved');

  const report6102 = compareFop19Evd20Index(
    fs.readFileSync(pairs[2][1]),
    fs.readFileSync(`${evdRoot}\\6102.evd`),
  );
  assert.equal(report6102.comparisons.find((entry) => entry.index === 17).eventIdEncoding, 'raw-preserved');
});
