'use strict';

// Read-only audit for the Tribute editor fixture corpus. It does not rewrite or
// normalize JSFB files; it only reports whether the supplied corpus is the one
// expected by the acceptance fixtures.
const fs = require('node:fs');
const path = require('node:path');
const profiles = {
  legacy: [832, 821, 14375, 713],
  'tribute-1.7.0': [931, 1044, 15208, 795],
};
const profile = process.argv[3] || process.env.AURORA_TRIBUTE_FIXTURE_PROFILE || 'legacy';
if (!profiles[profile]) throw new Error(`Unknown Tribute fixture profile: ${profile}`);
const targets = [
  ['CharacterMapping.jsfb', 'Characters/CharacterMapping.jsfb', './append-2k25-character-mapping-entry', 'locateRecords', profiles[profile][0]],
  ['CharProfileTable.jsfb', 'Roster/CharProfileTable.jsfb', './append-2k25-charprofiletable-entry', 'locateRecords', profiles[profile][1]],
  ['CAMMoveData.jsfb', 'MoveData/CAMMoveData.jsfb', './append-2k25-cammove-entry', 'locateRecords', profiles[profile][2]],
  ['CharMoveSetDataTable.jsfb', 'Roster/CharMoveSetDataTable.jsfb', './append-2k25-charmoveset-slot', 'locateTopVector', profiles[profile][3]],
];
const root = path.resolve(process.argv[2] || process.env.AURORA_TRIBUTE_FIXTURE_ROOT || path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root'));
const results = targets.map(([name, relative, moduleName, counter, expected]) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return { name, relative, file, exists: false, expected, status: 'missing' };
  const parser = require(moduleName);
  const located = parser[counter](fs.readFileSync(file));
  const count = located.count ?? located.vecInfo?.count;
  return { name, relative, file, exists: true, count, expected, status: count === expected ? 'match' : 'mismatch' };
});
const report = { schema: 'aurora-forge-tribute-fixture-audit/v1', root, profile, match: results.every(item => item.status === 'match'), results };
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.match ? 0 : 1;
