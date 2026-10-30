'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build } = require('./clips-layout');
const { auditSourceCompanionAdefsCoverage } = require('./audit-source-companion-adefs-coverage');

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value)}\n`);
}

function fixture(t) {
  const base = path.resolve(__dirname, '../workflows/victory-6100-2k19/.coverage-test');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'case-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const files = Object.fromEntries(['crosswalk', 'placement', 'commandMap', 'clips', 'adefs'].map(name => [name, path.join(dir, `${name}.${name.endsWith('Map') ? 'json' : 'bin'}`)]));
  const recordId = 0xA57FCBAB77BC9BD5n;
  const clip = Buffer.alloc(0xA0);
  clip.writeBigUInt64LE(recordId, 0);
  fs.writeFileSync(files.clips, build([clip]));
  fs.writeFileSync(files.adefs, Buffer.from('candidate fixture'));
  return { files, recordId: `0x${recordId.toString(16).toUpperCase().padStart(16, '0')}` };
}

test('maps source companion states to existing candidate clips and both rope lifecycle commands', t => {
  const { files, recordId } = fixture(t);
  writeJson(files.crosswalk, { rows: [{ sourceDirectoryIndex: 13, measuredSourceBodyFamily: 'direct-vector', sourceObjects: [{ sourceObjectIndex: 13, sourceObjectId: 25013, targetDefinitions: [{ name: '6100_13_0_0_0', clipName: '6100_00_r12', clipRecordId: recordId, clipResolved: true }] }] }] });
  writeJson(files.placement, { entries: [{ sourceDirectoryIndex: 13, sourcePlacementKeyframes: [{ frame: 0 }], candidateADefs182183Events: [{ eventCode: 182, triggers: [100] }, { eventCode: 183, triggers: [0, 1000] }] }] });
  writeJson(files.commandMap, { commands: [{ command: 'rope_start', states: ['6100_13_0_0_0'] }, { command: 'rope_stop', states: ['6100_13_0_0_0'] }] });
  const result = auditSourceCompanionAdefsCoverage({ crosswalkPath: files.crosswalk, placementPath: files.placement, commandMapPath: files.commandMap, clipsPath: files.clips, adefsPath: files.adefs });
  assert.equal(result.sourceStateCount, 1);
  assert.equal(result.allCrosswalkClipsResolved, true);
  assert.equal(result.allTargetClipRecordsPresent, true);
  assert.equal(result.allStatesHaveRopeStart, true);
  assert.equal(result.allStatesHaveRopeStop, true);
  assert.deepEqual(result.rows[0].sourcePlacementFrames, [0]);
});

test('fails the coverage gates when a mapped rope state lacks its candidate clip or stop command', t => {
  const { files, recordId } = fixture(t);
  writeJson(files.crosswalk, { rows: [{ sourceDirectoryIndex: 13, sourceObjects: [{ sourceObjectIndex: 13, targetDefinitions: [{ name: '6100_13_0_0_0', clipName: '6100_00_r12', clipRecordId: recordId, clipResolved: false }] }] }] });
  writeJson(files.placement, { entries: [{ sourceDirectoryIndex: 13 }] });
  writeJson(files.commandMap, { commands: [{ command: 'rope_start', states: ['6100_13_0_0_0'] }, { command: 'rope_stop', states: [] }] });
  const result = auditSourceCompanionAdefsCoverage({ crosswalkPath: files.crosswalk, placementPath: files.placement, commandMapPath: files.commandMap, clipsPath: files.clips, adefsPath: files.adefs });
  assert.equal(result.allCrosswalkClipsResolved, false);
  assert.equal(result.allTargetClipRecordsPresent, true);
  assert.equal(result.allStatesHaveRopeStart, true);
  assert.equal(result.allStatesHaveRopeStop, false);
});

test('rejects a requested range with no mapped source companion objects', t => {
  const { files } = fixture(t);
  writeJson(files.crosswalk, { rows: [] });
  writeJson(files.placement, { entries: [] });
  writeJson(files.commandMap, { commands: [{ command: 'rope_start', states: [] }, { command: 'rope_stop', states: [] }] });
  assert.throws(() => auditSourceCompanionAdefsCoverage({ crosswalkPath: files.crosswalk, placementPath: files.placement, commandMapPath: files.commandMap, clipsPath: files.clips, adefsPath: files.adefs }), /no source companion objects/);
});
