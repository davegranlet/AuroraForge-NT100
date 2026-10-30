'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = process.env.AURORA_TRIBUTE_FIXTURE_ROOT;
const requireCorpus = () => {
  if (!root) throw new Error('Set AURORA_TRIBUTE_FIXTURE_ROOT to the current Tribute BakeMe corpus');
  return path.resolve(root);
};

test('current Tribute 1.7.0 corpus exercises canonical roster and motion appenders', (t) => {
  if (!root) {
    t.skip('Set AURORA_TRIBUTE_FIXTURE_ROOT to the current Tribute BakeMe corpus');
    return;
  }
  const corpus = requireCorpus();
  const mapTool = require('./append-2k25-character-mapping-entry');
  const profileTool = require('./append-2k25-charprofiletable-entry');
  const camTool = require('./append-2k25-cammove-entry');
  const moveTool = require('./append-2k25-charmoveset-slot');

  const map = fs.readFileSync(path.join(corpus, 'Characters', 'CharacterMapping.jsfb'));
  const mapBefore = mapTool.locateRecords(map);
  const mapOut = mapTool.appendCharacterMappingEntry(map, { templateId: 120, newId: 14000 });
  assert.equal(mapTool.locateRecords(mapOut).count, mapBefore.count + 1);
  assert.ok(mapTool.findById(mapOut, mapTool.locateRecords(mapOut), 14000));

  const profile = fs.readFileSync(path.join(corpus, 'Roster', 'CharProfileTable.jsfb'));
  const profileBefore = profileTool.locateRecords(profile);
  const profileTemplate = profileTool.pickTemplate(profile);
  assert.ok(profileTemplate);
  const profileOut = profileTool.appendCharProfileTableEntry(profile, {
    templateCharId: profileTemplate.templateCharId,
    newCharId: 14000,
  });
  assert.equal(profileTool.locateRecords(profileOut).vecInfo.count, profileBefore.vecInfo.count + 1);

  const cam = fs.readFileSync(path.join(corpus, 'MoveData', 'CAMMoveData.jsfb'));
  const camBefore = camTool.locateRecords(cam);
  const camOut = camTool.appendCAMMoveEntry(cam, {
    templateMotionId: 41525,
    newId: 14000,
    vsize: 116,
    osize: 76,
  });
  assert.equal(camTool.locateRecords(camOut).count, camBefore.count + 1);

  const moveset = fs.readFileSync(path.join(corpus, 'Roster', 'CharMoveSetDataTable.jsfb'));
  const movesetBefore = moveTool.locateTopVector(moveset);
  const movesetTemplate = moveTool.pickTemplate(moveset, Array.from({ length: 65536 }, (_, i) => i));
  assert.ok(movesetTemplate);
  const movesetOut = moveTool.appendCharMoveSetSlot(moveset, {
    wrestlerId: movesetTemplate.wrestlerId,
    templateSdbId: movesetTemplate.templateSdbId,
    newSdbId: (movesetTemplate.templateSdbId + 1) >>> 0,
  });
  assert.equal(moveTool.locateTopVector(movesetOut).vecInfo.count, movesetBefore.vecInfo.count);
});
