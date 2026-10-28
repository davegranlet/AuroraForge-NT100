'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyVictoryBodyTrackFidelity } = require('./verify-victory-body-track-fidelity');

const workflow = path.resolve(__dirname, '../workflows/victory-6100-2k19');
const sourcePath = path.join(workflow, 'source-pose-audit/14003-full-package.clips');
const targetPath = path.join(workflow, 'victory-assembly-fix-20261023/payload/Animation/CaeAdvanced/1014003.clips');
const fixturesPresent = fs.existsSync(sourcePath) && fs.existsSync(targetPath);

test('staged Victory body preserves every source-derived body curve by track identifier', { skip: !fixturesPresent }, () => {
  const report = verifyVictoryBodyTrackFidelity({ sourcePath, targetPath, recordId: '0xA57FCBAB77BC9BD5', tolerance: 0 });
  assert.equal(report.pass, true);
  assert.equal(report.frames, 2421);
  assert.equal(report.fps, 60);
  assert.equal(report.matchedSourceTracks, 64);
  assert.equal(report.target.trackCount, 73);
  assert.equal(report.targetOnlyTrackIds.length, 9);
  assert.ok(report.targetOnlyTrackChecks.every(track => track.allZero));
  assert.equal(report.maxAbsoluteError, 0);
  assert.equal(report.maxEuclideanError, 0);
});
