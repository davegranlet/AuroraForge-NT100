'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verifyCompanionPositionCurves } = require('./verify-victory-companion-position-curves');

const workflow = path.resolve(__dirname, '../workflows/victory-6100-2k19');
const clipsPath = path.join(workflow, 'victory-row-corrected-2k26-v3-group90-reordered/active-compare/right/Animation/CaeAdvanced/1014003.clips');
const clipNames = new Map([
  [3, '6100_00_r12'], [4, '6100_00_r15'], [5, '6100_00_r18'], [6, '6100_00_r21'],
  [9, '6100_00_r11'], [10, '6100_00_r14'], [11, '6100_00_r17'], [12, '6100_00_r20'],
]);
const pairs = [...clipNames].flatMap(([child, clipName]) => [0, 2].map(trackIndex => ({
  clipName,
  trackIndex,
  expectedPath: path.join(workflow, `source-pose-audit/${child < 9 ? 'corner' : 'side'}-${child}-full-span.clips.expected.json`),
})));
const fixturesPresent = fs.existsSync(clipsPath) && pairs.every(pair => fs.existsSync(pair.expectedPath));

test('staged 14003 package preserves all source-derived companion position curves', { skip: !fixturesPresent }, () => {
  const report = verifyCompanionPositionCurves({ clipsPath, pairs, tolerance: 0.001 });
  assert.equal(report.clipsSha256, '6C443F8B0092672AB3244783F3430F5E4671009023A7407C35E13A9AC27678D4');
  assert.equal(report.results.length, 16);
  for (const result of report.results) {
    assert.equal(result.frames, 2421);
    assert.ok(result.maxAbsoluteComponentError <= 0.001, `${result.clipName} max component error ${result.maxAbsoluteComponentError}`);
  }
});
