'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyVictoryRegistration } = require('./verify_2k26_victory_registration');
const { verifyPairAssets } = require('./2k26-victory-pair-assets');

// This payload was rebased onto the preserved 1C7 entrance package and now
// contains the required motion-level Victory assembly as well as the native
// 2K26 Victory Csa row and pair-addressed assets.
const payload = path.resolve(__dirname, '../workflows/victory-6100-2k19/csa-key-path-corrected-20261023/rebased-v2/payload');
const files = {
  csa: path.join(payload, 'Cutscene/CsaDatabase.jsfb'),
  cdef: path.join(payload, 'Cutscene/CdefDatabase.jsfb'),
  adefs: path.join(payload, 'Animation/CaeAdvanced/1014003.adefs'),
};
const codecOptions = {
  workRoot: path.resolve(__dirname, '../workflows/victory-6100-2k19/native-6100-analysis/scratch'),
  oodlePath: 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll',
};

test('Victory entry 14003 resolves through pair-addressed CaeAdvanced assets and matching ADefs duration', { skip: !fs.existsSync(payload) }, () => {
  const result = verifyPairAssets(payload, 14003, codecOptions);
  assert.equal(result.registration.category, 'Victory');
  assert.equal(result.registration.variant, 'Single');
  assert.equal(result.registration.phasePair, 1014003);
  assert.equal(result.registration.csaId0, '5885647888236809228');
  assert.equal(result.paths.adefs, 'Animation/CaeAdvanced/1014003.adefs');
  assert.equal(result.paths.clips, 'Animation/CaeAdvanced/1014003.clips');
  assert.equal(result.registration.cdefSize, 2420);
  assert.equal(result.registration.adefsEndFrame, 2420);
  assert.equal(result.registration.definitionCount, 20);
  assert.equal(result.registration.eventCount, 80);
  assert.equal(result.clipsRecords, 16);
  assert.equal(result.pass, true);
});

test('registration verifier rejects a motion with no matching Victory Csa row', { skip: !Object.values(files).every(fs.existsSync) }, () => {
  assert.throws(() => verifyVictoryRegistration(
    fs.readFileSync(files.csa), fs.readFileSync(files.cdef), fs.readFileSync(files.adefs), 14004,
  ), /expected one Csa row/);
});
