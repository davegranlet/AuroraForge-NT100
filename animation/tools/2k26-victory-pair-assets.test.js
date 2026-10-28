'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildPairAssets, verifyPairAssets } = require('./2k26-victory-pair-assets');
const { decode: decodeAdefs } = require('./adefs-file');
const { parsePayload } = require('./adefs-payload');
const { parse: parseClips, clipNameId } = require('./clips-layout');

const workflow = path.resolve(__dirname, '../workflows/victory-6100-2k19');
const converted = path.join(workflow, 'victory-registry-links-v2', 'payload');
// Use the corrected native-path-key registration fixture. The older fixture
// predates the measured 64-bit Victory Csa key and is intentionally rejected.
const registration = path.join(workflow, 'csa-key-path-corrected-20261023', 'rebased-v2', 'payload');
const stock = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root';
const oodle = 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll';

test('builds the actual 6100-derived Victory pair in the engine-resolved CaeAdvanced paths', { skip: !fs.existsSync(path.join(stock, 'Cutscene/CaeAdvanced/1006100.jsfb')) }, () => {
  const pairId = 1014003;
  const sourcePair = fs.readFileSync(path.join(stock, 'Cutscene/CaeAdvanced/1006100.jsfb'));
  assert.equal(sourcePair.readUInt32LE(56), 1006100);
  const scratch = path.join(workflow, `pair-assets-test-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    fs.mkdirSync(path.join(scratch, 'Cutscene'), { recursive: true });
    fs.mkdirSync(path.join(scratch, 'Animation', 'Victory'), { recursive: true });
    // Registration uses the current native-layout Victory Csa row. Source clip
    // inputs remain the pre-pair converted assets used by the pair builder.
    fs.copyFileSync(path.join(registration, 'Cutscene/CsaDatabase.jsfb'), path.join(scratch, 'Cutscene/CsaDatabase.jsfb'));
    fs.copyFileSync(path.join(registration, 'Cutscene/CdefDatabase.jsfb'), path.join(scratch, 'Cutscene/CdefDatabase.jsfb'));
    fs.copyFileSync(path.join(converted, 'Animation/Victory/14003.adefs'), path.join(scratch, 'Animation/Victory/14003.adefs'));
    fs.copyFileSync(path.join(converted, 'Animation/Victory/14003.clips'), path.join(scratch, 'Animation/Victory/14003.clips'));
    const codecOptions = { workRoot: path.join(scratch, 'scratch'), oodlePath: oodle };
    const result = buildPairAssets({ payloadRoot: scratch, stockRoot: stock, motionId: 14003, sourceMotionId: 6100, codecOptions });
    assert.equal(result.pairId, pairId);
    assert.equal(result.paths.assembly, 'Cutscene/CutsceneAssembly/14003.jsfb');
    assert.equal(result.assemblyBytes, 273);
    const assembly = fs.readFileSync(path.join(scratch, result.paths.assembly));
    assert.ok(assembly.includes(Buffer.from('Cutscene/CaeAdvanced/1014003.xcdef')));
    assert.ok(assembly.includes(Buffer.from('14003_VIC_SINGLE_The_Rock_M_Face')));
    assert.equal(result.paths.pairTable, 'Cutscene/CaeAdvanced/1014003.jsfb');
    assert.equal(result.paths.adefs, 'Animation/CaeAdvanced/1014003.adefs');
    assert.equal(result.paths.clips, 'Animation/CaeAdvanced/1014003.clips');
    assert.equal(result.registration.phasePair, pairId);
    assert.equal(result.registration.cdefSize, 2420);
    assert.equal(result.registration.adefsEndFrame, 2420);
    assert.equal(result.clipsRecords, 16);
    assert.equal(result.adefsClipNames, 16);
    assert.equal(result.clipNamesResolved, 16);
    const adefsPayload = parsePayload(decodeAdefs(fs.readFileSync(path.join(scratch, result.paths.adefs)), codecOptions).payload);
    const names = [...new Set(adefsPayload.definitions.flatMap(definition => definition.states.map(state => state.node['3196319741']).filter(Boolean)))];
    assert.ok(names.length > 0 && names.every(name => name.startsWith('14003_')));
    const rebasedClips = parseClips(fs.readFileSync(path.join(scratch, result.paths.clips)), { includeRaw: false });
    assert.ok(names.every(name => rebasedClips.records.some(record => record.id === clipNameId(name))));
    assert.equal(result.rebasedAdefsStrings > 0, true);
    assert.equal(result.rekeyedClipRecords, result.selectedClipRecords);
    assert.equal(result.registration.definitionCount, 20);
    assert.equal(result.registration.eventCount, 80);
    assert.equal(result.eventScaffoldCodec, 'oodle');
    assert.equal(result.retimedEventCount, 80);
    assert.equal(result.duplicateResolution.length, 1);
    assert.deepEqual(result.duplicateResolution[0].droppedRecordIndices, [2]);
    assert.equal(result.pass, true);
    assert.equal(fs.existsSync(path.join(scratch, 'Animation/Victory/14003.adefs')), false);
    assert.equal(fs.existsSync(path.join(scratch, 'Animation/Victory/14003.clips')), false);
    fs.rmSync(path.join(scratch, result.paths.assembly));
    assert.throws(() => verifyPairAssets(scratch, 14003, codecOptions), /missing pair-addressed Victory asset/);
  } finally {
    const safeRoot = path.resolve(workflow);
    const target = path.resolve(scratch);
    if (!target.startsWith(safeRoot + path.sep) || path.basename(target).indexOf('pair-assets-test-') !== 0) throw new Error(`refusing to clean unexpected test path ${target}`);
    fs.rmSync(target, { recursive: true, force: true });
  }
});
