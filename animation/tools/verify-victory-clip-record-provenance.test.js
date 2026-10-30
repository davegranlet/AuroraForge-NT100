'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyVictoryClipRecordProvenance } = require('./verify-victory-clip-record-provenance');

const workflow = path.resolve(__dirname, '../workflows/victory-6100-2k19');
const sourcePath = path.join(workflow, 'source-pose-audit/14003-full-package.clips');
const targetPath = path.join(workflow, 'victory-assembly-fix-20261023/payload/Animation/CaeAdvanced/1014003.clips');
const fixturesPresent = fs.existsSync(sourcePath) && fs.existsSync(targetPath);

test('staged Victory package accounts for all source clip records after dropping the duplicate-ID helper', { skip: !fixturesPresent }, () => {
  const report = verifyVictoryClipRecordProvenance({
    sourcePath,
    targetPath,
    dropSourceIndices: [2],
    allowedChangedRecordIds: ['0xA57FCBAB77BC9BD5'],
  });
  assert.equal(report.pass, true);
  assert.equal(report.matchedRecords, 16);
  assert.equal(report.byteIdenticalRecords, 15);
  assert.equal(report.explicitlyDroppedRecords, 1);
  assert.deepEqual(report.changedRecords, ['0xA57FCBAB77BC9BD5']);
  const duplicateFace = report.rows.find(row => row.sourceIndex === 16);
  assert.equal(duplicateFace.targetTracks, 8);
  assert.equal(duplicateFace.byteIdentical, true);
});

test('record provenance refuses to silently choose among duplicate source IDs', { skip: !fixturesPresent }, () => {
  assert.throws(() => verifyVictoryClipRecordProvenance({ sourcePath, targetPath, allowedChangedRecordIds: ['0xA57FCBAB77BC9BD5'] }), /source duplicate record IDs require explicit drop indices/);
});
