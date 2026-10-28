'use strict';

// Rebuild the pair-addressed files of an existing 2K26 Victory payload from
// its converted clip container. This reuses Aurora's tested pair/ADefs builder
// so ADefs motion-name identities and .clips lookup IDs are rebased together.
// The source tree is never modified; only four pair assets may differ.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { buildPairAssets, pairIdFor } = require('./2k26-victory-pair-assets');
const { parse: parseClips } = require('./clips-layout');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function walk(root) {
  const result = new Map();
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in a payload tree: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result.set(path.relative(root, full).replace(/\\/g, '/').toLowerCase(), sha256(full));
    }
  }
  visit(root);
  return result;
}

function requiredFile(root, relative) {
  const file = path.join(root, ...relative.split('/'));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Required Victory payload file is missing: ${file}`);
  return file;
}

function rebuildVictoryPair({ inputRoot, outputRoot, stockRoot, motionId, sourceMotionId = 6100, workRoot, oodlePath }) {
  for (const [name, value] of Object.entries({ inputRoot, outputRoot, stockRoot, workRoot, oodlePath })) {
    if (!value) throw new Error(`${name} is required`);
  }
  if (!Number.isInteger(motionId) || motionId < 1000 || motionId > 99999) throw new Error('motionId must be from 1000 through 99999');
  if (!Number.isInteger(sourceMotionId) || sourceMotionId < 1000 || sourceMotionId > 99999) throw new Error('sourceMotionId must be from 1000 through 99999');
  inputRoot = path.resolve(inputRoot);
  outputRoot = path.resolve(outputRoot);
  stockRoot = path.resolve(stockRoot);
  workRoot = path.resolve(workRoot);
  oodlePath = path.resolve(oodlePath);
  if (fs.existsSync(outputRoot)) throw new Error(`Refusing to overwrite output tree: ${outputRoot}`);
  if (!fs.statSync(inputRoot).isDirectory() || !fs.statSync(stockRoot).isDirectory()) throw new Error('inputRoot and stockRoot must be existing directories');
  if (!fs.existsSync(oodlePath)) throw new Error(`Oodle library is missing: ${oodlePath}`);

  const pairId = pairIdFor(motionId);
  const pairAdefsRel = `Animation/CaeAdvanced/${pairId}.adefs`;
  const pairClipsRel = `Animation/CaeAdvanced/${pairId}.clips`;
  const pairTablePath = `Cutscene/CaeAdvanced/${pairId}.jsfb`;
  const assemblyPath = `Cutscene/CutsceneAssembly/${motionId}.jsfb`;
  const inputAdefs = requiredFile(inputRoot, pairAdefsRel);
  const inputClips = requiredFile(inputRoot, pairClipsRel);
  for (const file of [pairTablePath, assemblyPath, 'Cutscene/CsaDatabase.jsfb', 'Cutscene/CdefDatabase.jsfb']) requiredFile(inputRoot, file);
  const inputFiles = walk(inputRoot);
  const workingAdefs = fs.readFileSync(inputAdefs);
  const workingClips = fs.readFileSync(inputClips);
  const inputClipLayout = parseClips(workingClips, { includeRaw: false });
  const inputRawDir = path.join(inputRoot, 'Animation', 'Victory');
  if (fs.existsSync(inputRawDir)) throw new Error(`Input already contains Animation/Victory; refusing ambiguous source: ${inputRawDir}`);

  fs.mkdirSync(path.dirname(outputRoot), { recursive: true });
  fs.cpSync(inputRoot, outputRoot, { recursive: true, errorOnExist: true, force: false });
  const outputAdefs = path.join(outputRoot, ...pairAdefsRel.split('/'));
  const outputClips = path.join(outputRoot, ...pairClipsRel.split('/'));
  const outputPairTable = path.join(outputRoot, ...pairTablePath.split('/'));
  const outputAssembly = path.join(outputRoot, ...assemblyPath.split('/'));
  for (const file of [outputAdefs, outputClips, outputPairTable, outputAssembly]) fs.unlinkSync(file);
  const outputRawDir = path.join(outputRoot, 'Animation', 'Victory');
  fs.mkdirSync(outputRawDir, { recursive: true });
  fs.writeFileSync(path.join(outputRawDir, `${motionId}.adefs`), workingAdefs, { flag: 'wx' });
  fs.writeFileSync(path.join(outputRawDir, `${motionId}.clips`), workingClips, { flag: 'wx' });

  let pairReport;
  try {
    pairReport = buildPairAssets({
      payloadRoot: outputRoot,
      stockRoot,
      motionId,
      sourceMotionId,
      codecOptions: { workRoot, oodlePath },
    });
  } catch (error) {
    throw new Error(`Aurora Victory pair rebuild failed; inspect preserved candidate tree ${outputRoot}: ${error.message}`);
  }

  const outputFiles = walk(outputRoot);
  const added = [...outputFiles.keys()].filter(key => !inputFiles.has(key)).sort();
  const removed = [...inputFiles.keys()].filter(key => !outputFiles.has(key)).sort();
  const changed = [...inputFiles.keys()].filter(key => outputFiles.has(key) && inputFiles.get(key) !== outputFiles.get(key)).sort();
  const expected = [pairAdefsRel.toLowerCase(), pairClipsRel.toLowerCase()].sort();
  if (added.length || removed.length || JSON.stringify(changed) !== JSON.stringify(expected)) {
    throw new Error(`Victory pair rebuild changed an unexpected payload set: ${JSON.stringify({ added, removed, changed, expected })}`);
  }
  for (const relative of [pairTablePath, assemblyPath]) requiredFile(outputRoot, relative);
  const outputClipBytes = fs.readFileSync(requiredFile(outputRoot, pairClipsRel));
  const outputClipLayout = parseClips(outputClipBytes, { includeRaw: false });
  const signature = record => JSON.stringify({
    tracks: record.trackIdentifiers,
    group38Count: record.sections.find(section => section.name === 'group38')?.count,
    frameValue: record.frameValue,
    fps: record.fps,
  });
  const sourceBySignature = new Map();
  for (const record of inputClipLayout.records) {
    const key = signature(record);
    const records = sourceBySignature.get(key) || [];
    records.push(record);
    sourceBySignature.set(key, records);
  }
  if (inputClipLayout.count !== outputClipLayout.count) throw new Error('Rebuilt .clips record count changed');
  for (const rebuilt of outputClipLayout.records) {
    const outputPayload = outputClipBytes.subarray(rebuilt.offset, rebuilt.offset + rebuilt.length);
    const candidates = sourceBySignature.get(signature(rebuilt)) || [];
    const matchIndex = candidates.findIndex(source => {
      const sourcePayload = workingClips.subarray(source.offset, source.offset + source.length);
      return sourcePayload.length === outputPayload.length && sourcePayload.subarray(8).equals(outputPayload.subarray(8));
    });
    if (matchIndex < 0) throw new Error(`Rebuilt clip payload ${rebuilt.index} has no byte-exact input match outside its name key`);
    const [source] = candidates.splice(matchIndex, 1);
    if (source.id === rebuilt.id) throw new Error(`Clip identity for ${rebuilt.index} was not rebased to motion ${motionId}`);
  }
  if ([...sourceBySignature.values()].some(records => records.length)) throw new Error('One or more input clip records were not selected into the rebuilt container');
  if (fs.existsSync(outputRawDir) && fs.readdirSync(outputRawDir).length) throw new Error('temporary Animation/Victory inputs were not removed by the pair builder');

  const report = {
    schema: 'aurora-forge/2k26-victory-pair-rebuild/v1',
    inputRoot,
    outputRoot,
    motionId,
    sourceMotionId,
    pairId,
    sourcePairAssets: { adefs: inputFiles.get(pairAdefsRel.toLowerCase()), clips: inputFiles.get(pairClipsRel.toLowerCase()) },
    changed,
    added,
    removed,
    pair: pairReport,
    clipCurvesAndStructurePreserved: true,
    clipRecords: inputClipLayout.count,
    pass: true,
  };
  return report;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? '' : process.argv[index + 1];
}

if (require.main === module) {
  try {
    const report = rebuildVictoryPair({
      inputRoot: arg('--input'), outputRoot: arg('--out'), stockRoot: arg('--stock'),
      motionId: Number(arg('--motion-id')), sourceMotionId: Number(arg('--source-motion-id') || 6100),
      workRoot: arg('--work'), oodlePath: arg('--oodle'),
    });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`2K26 Victory pair rebuild failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { rebuildVictoryPair };
