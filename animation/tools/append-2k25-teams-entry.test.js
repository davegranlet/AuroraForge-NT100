'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { appendTeamsEntry, locateRecords, findRecordByTeamId } = require('./append-2k25-teams-entry');

const ORACLE = path.join(
  process.env.AURORA_TRIBUTE_FIXTURE_ROOT || path.join(__dirname, '..', 'analysis', 'this-is-the-test-cak', 'extracted-root'),
  'Stable', 'TeamsTable.jsfb',
);

test('teams appender clones a typical row and mints a new team id', () => {
  const before = fs.readFileSync(ORACLE);
  const beforeVec = locateRecords(before);
  assert.strictEqual(beforeVec.count, 50);

  const edited = appendTeamsEntry(before, { templateTeamId: 100, newTeamId: 14000 });
  const afterVec = locateRecords(edited);
  assert.strictEqual(afterVec.count, 51);
  assert.strictEqual(edited.length, before.length + 4 + 180);

  const created = findRecordByTeamId(edited, afterVec, 14000);
  assert.ok(created, 'new team row must parse');
  assert.strictEqual(created.index, 50);
  // Detail id word mirrors the new id; class bytes untouched.
  const createdDetailAt = created.detail;
  assert.strictEqual(edited.readUInt16LE(createdDetailAt + 6), 14000);
  assert.strictEqual(edited.readUInt32LE(createdDetailAt + 28), 4);

  // Every old typical row is untouched (anomalous rows 0-2 are covered by
  // the appender's own raw-byte validator).
  const { tableAt } = require('./jsfb-append-lib');
  for (let i = 0; i < 50; i++) {
    const table = beforeVec.tables[i];
    const resolved = tableAt(before, table);
    if (!resolved || resolved.osize !== 12) continue;
    const id = before.readUInt16LE(table + 6);
    const survivor = findRecordByTeamId(edited, afterVec, id);
    assert.ok(survivor, `old team ${id} must survive`);
    assert.strictEqual(survivor.teamId, id);
  }
});

test('teams appender refuses duplicates and unknown templates', () => {
  const before = fs.readFileSync(ORACLE);
  assert.throws(() => appendTeamsEntry(before, { templateTeamId: 100, newTeamId: 100 }), /already exists/);
  assert.throws(() => appendTeamsEntry(before, { templateTeamId: 9999, newTeamId: 14001 }), /not found/);
});

test('teams appender CLI writes the file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'teams-'));
  const output = path.join(dir, 'TeamsTable.jsfb');
  const { spawnSync } = require('node:child_process');
  const run = spawnSync(process.execPath, [
    path.join(__dirname, 'append-2k25-teams-entry.js'),
    ORACLE, output, '--template-team-id', '99', '--new-team-id', '14001',
  ], { encoding: 'utf8' });
  assert.strictEqual(run.status, 0, run.stderr);
  const edited = fs.readFileSync(output);
  const vec = locateRecords(edited);
  assert.strictEqual(vec.count, 51);
  assert.ok(findRecordByTeamId(edited, vec, 14001));
});
