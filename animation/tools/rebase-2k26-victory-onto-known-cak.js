'use strict';

// Rebase one additive 2K26 Victory entry onto an explicitly hash-pinned
// existing CAK extraction. The existing package's payloads are copied first;
// only the Victory-specific assets and four registration tables may change.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { readVictoryList } = require('./victory-list');
const { readSdbRecords, findSdbRecord } = require('./sdb-read');
const { appendCutsceneEntryForGame } = require('./clips-codec/append-cutscene-entry-for-game');
const { findCutsceneEntry } = require('./clips-codec/find-cutscene-entry');
const { locateCutsceneVector } = require('./clips-codec/locate-cutscene-vector');
const { readHeader, tableAt, fieldByIndex, followChain, readVector } = require('./jsfb-append-lib');
const { append2k26VictoryEntry } = require('./append_2k26_victory_entry');
const { csaIdForMotion } = require('./csa-2k26-id');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? '' : process.argv[index + 1];
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function walkFiles(root) {
  const rows = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed in a payload tree: ${full}`);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) rows.push({ path: path.relative(root, full).replace(/\\/g, '/'), full, sha256: sha256(full) });
    }
  }
  visit(root);
  return rows;
}

function fileAt(root, relative) {
  return path.join(root, ...relative.split('/'));
}

function verifySourceExtraction({ cakPath, expectedHash, extractedRoot, comparisonPath, side }) {
  if (sha256(cakPath) !== expectedHash.toUpperCase()) throw new Error(`Pinned CAK hash mismatch: ${cakPath}`);
  const comparison = JSON.parse(fs.readFileSync(comparisonPath, 'utf8'));
  if (path.resolve(comparison[side]) !== path.resolve(cakPath)) throw new Error(`Comparison ${side} CAK path does not match the requested source.`);
  const rows = walkFiles(extractedRoot);
  const expected = new Map(comparison.entries.filter((entry) => entry[side === 'left' ? 'leftSha256' : 'rightSha256'])
    .map((entry) => [entry.path.toLowerCase(), entry[side === 'left' ? 'leftSha256' : 'rightSha256']]));
  if (expected.size !== rows.length) throw new Error(`${side} extraction contains ${rows.length} files but comparison pins ${expected.size}.`);
  for (const row of rows) {
    const pinned = expected.get(row.path.toLowerCase());
    if (!pinned || pinned !== row.sha256) throw new Error(`${side} extracted payload hash mismatch: ${row.path}`);
  }
  return { sha256: expectedHash.toUpperCase(), files: rows.length, bytes: rows.reduce((sum, row) => sum + fs.statSync(row.full).size, 0) };
}

function readContRows(buffer, fields) {
  const { root } = readHeader(buffer, 'Cont');
  const vector = followChain(buffer, root, [0]);
  const info = readVector(buffer, vector);
  return info.tables.map((table, index) => {
    if (table === null) return { index, table: null };
    const row = { index, table };
    for (const [name, fieldIndex] of Object.entries(fields)) {
      const field = fieldByIndex(tableAt(buffer, table), fieldIndex);
      if (!field) { row[name] = null; continue; }
      if (name === 'pairs') {
        const at = field.at + buffer.readUInt32LE(field.at);
        const count = buffer.readUInt32LE(at);
        row[name] = Array.from({ length: count }, (_, item) => buffer.readUInt32LE(at + 4 + item * 4));
      } else row[name] = buffer.readUInt32LE(field.at) >>> 0;
    }
    return row;
  });
}

function runNode(script, args, cwd) {
  const result = cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(script)} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function run(options = {}) {
  const repo = path.resolve(__dirname, '..', '..');
  const required = ['baseCak', 'baseHash', 'baseExtracted', 'victoryCak', 'victoryHash', 'victoryPayload', 'comparison', 'nativeVictoryList', 'output', 'nameId', 'name'];
  for (const key of required) if (!options[key]) throw new Error(`Missing --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  const output = path.resolve(options.output);
  if (fs.existsSync(output)) throw new Error(`Output already exists; refusing overwrite: ${output}`);
  const motionId = Number(options.motionId || 14003);
  const entryId = Number(options.entryId || motionId);
  const pairId = Number(options.pairId || 1000000 + motionId);
  const nameId = Number(options.nameId);
  if (!Number.isSafeInteger(entryId) || entryId < 0 || entryId > 0xffff || !Number.isSafeInteger(motionId) || !Number.isSafeInteger(pairId) || !Number.isSafeInteger(nameId)) throw new Error('Entry, motion, pair or SDB name ID is invalid.');
  const baseProof = verifySourceExtraction({ cakPath: path.resolve(options.baseCak), expectedHash: options.baseHash, extractedRoot: path.resolve(options.baseExtracted), comparisonPath: path.resolve(options.comparison), side: 'left' });
  const victoryProof = verifySourceExtraction({ cakPath: path.resolve(options.victoryCak), expectedHash: options.victoryHash, extractedRoot: path.join(path.dirname(path.resolve(options.comparison)), 'right'), comparisonPath: path.resolve(options.comparison), side: 'right' });
  const nativePath = path.resolve(options.nativeVictoryList);
  const native = readVictoryList(fs.readFileSync(nativePath));
  const sourcePayload = path.resolve(options.victoryPayload);
  const sourceListPath = fileAt(sourcePayload, 'Entrances/VictoryListData.jsfb');
  const sourceList = readVictoryList(fs.readFileSync(sourceListPath));
  if (sourceList.recordCount !== native.recordCount + 1) throw new Error(`Expected one appended VictoryList row (${native.recordCount + 1}), found ${sourceList.recordCount}.`);
  const nativePrefix = sourceList.records.slice(0, native.recordCount).map((row) => row.fields);
  if (JSON.stringify(nativePrefix) !== JSON.stringify(native.records.map((row) => row.fields))) throw new Error('VictoryListData does not preserve the native skeleton rows byte-semantically.');
  const sourceEntryId = Number(options.sourceEntryId || motionId);
  const victoryRow = sourceList.records.find((row) => row.fields[0]?.bytes && Buffer.from(row.fields[0].bytes, 'hex').readUInt16LE(0) === sourceEntryId);
  if (!victoryRow || victoryRow.index !== sourceList.recordCount - 1) throw new Error(`VictoryList source row ${sourceEntryId} is missing or not appended last.`);
  const rowNameId = Buffer.from(victoryRow.fields[1].bytes, 'hex').readUInt32LE(0) >>> 0;
  const rowMotionIds = [4, 5].map((index) => Buffer.from(victoryRow.fields[index].bytes, 'hex').readUInt32LE(0) >>> 0);
  if (rowNameId !== nameId || rowMotionIds.some((id) => id !== motionId)) throw new Error(`VictoryList row fields do not match requested motion/name: ${JSON.stringify({ sourceEntryId, rowNameId, rowMotionIds, nameId, motionId })}`);
  const sourceSdbName = findSdbRecord(fs.readFileSync(fileAt(sourcePayload, 'Sdb/ENG.sdb')), nameId);
  if (!sourceSdbName || sourceSdbName.text !== options.name) throw new Error(`Source Victory name ID ${nameId} does not resolve to ${options.name}.`);

  const pairAssets = [
    `Animation/CaeAdvanced/${pairId}.adefs`,
    `Animation/CaeAdvanced/${pairId}.clips`,
    `Cutscene/CaeAdvanced/${pairId}.jsfb`,
    `Cutscene/CutsceneAssembly/${motionId}.jsfb`
  ];
  const expectedChanged = new Set([
    'cutscene/cutscenenoregistry.jsfb', 'cutscene/csadatabase.jsfb', 'cutscene/cdefdatabase.jsfb', 'sdb/eng.sdb'
  ]);
  if (pairId !== 1000000 + motionId) throw new Error('Victory pair id does not follow the validated phase-100 motion-id convention.');
  for (const relative of pairAssets) if (!fs.existsSync(fileAt(sourcePayload, relative))) throw new Error(`Victory source payload is missing ${relative}`);

  fs.mkdirSync(output, { recursive: false });
  const tree = path.join(output, 'payload');
  fs.cpSync(path.resolve(options.baseExtracted), tree, { recursive: true, errorOnExist: true, force: false });
  for (const relative of pairAssets) {
    const dst = fileAt(tree, relative);
    if (fs.existsSync(dst)) throw new Error(`Refusing to overwrite known-good payload path with a Victory asset: ${relative}`);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(fileAt(sourcePayload, relative), dst, fs.constants.COPYFILE_EXCL);
  }

  const victoryListPath = fileAt(tree, 'Entrances/VictoryListData.jsfb');
  if (fs.existsSync(victoryListPath)) throw new Error('known-playback baseline already has VictoryListData; refusing to replace an existing native member');
  const victoryListProof = append2k26VictoryEntry({
    input: nativePath,
    output: victoryListPath,
    entryId,
    nameString: nameId,
    motionId,
  });

  const baseSdbPath = fileAt(tree, 'Sdb/ENG.sdb');
  if (findSdbRecord(fs.readFileSync(baseSdbPath), nameId)) throw new Error(`SDB name ID ${nameId} already exists in the known-playback baseline.`);
  const work = path.join(output, '_work');
  fs.mkdirSync(work);
  const sdbOut = path.join(work, 'ENG.sdb');
  runNode(path.join(__dirname, 'append_2k26_sdb_string.js'), [baseSdbPath, sdbOut, '--id', String(nameId), '--text', options.name], repo);
  fs.copyFileSync(sdbOut, baseSdbPath);

  const registryPath = fileAt(tree, 'Cutscene/CutsceneNoRegistry.jsfb');
  const existingRegistryEntry = findCutsceneEntry(fs.readFileSync(registryPath), motionId);
  if (existingRegistryEntry) throw new Error(`CutsceneNoRegistry already contains motion ${motionId}.`);
  const registryResult = appendCutsceneEntryForGame(fs.readFileSync(registryPath), { templateId: 6100, newId: motionId, newNameStringId: nameId, gameVersion: '2k26' });
  fs.writeFileSync(registryPath, registryResult.output);
  const appendedRegistryEntry = findCutsceneEntry(fs.readFileSync(registryPath), motionId);
  if (!appendedRegistryEntry || appendedRegistryEntry.index !== locateCutsceneVector(fs.readFileSync(registryPath)).count - 1) throw new Error('CutsceneNoRegistry row did not append at the final slot.');

  const csaPath = fileAt(tree, 'Cutscene/CsaDatabase.jsfb');
  const cdefPath = fileAt(tree, 'Cutscene/CdefDatabase.jsfb');
  const csaRows = readContRows(fs.readFileSync(csaPath), { motionId: 1 });
  const cdefRows = readContRows(fs.readFileSync(cdefPath), { pairId: 0 });
  if (csaRows.some((row) => row.motionId === motionId)) throw new Error(`CsaDatabase already contains motion ${motionId}.`);
  if (cdefRows.some((row) => row.pairId === pairId)) throw new Error(`CdefDatabase already contains pair ${pairId}.`);
  const csaEntries = path.join(work, 'csa-entries.json');
  const cdefEntries = path.join(work, 'cdef-entries.json');
  const csaId0 = csaIdForMotion(motionId).toString();
  if (options.csaId0 && String(options.csaId0) !== csaId0) throw new Error(`Provided Victory Csa key ${options.csaId0} does not match the native assembly-path key ${csaId0}`);
  fs.writeFileSync(csaEntries, JSON.stringify([{ motionId, category: 'Victory', variant: 'Single', pairs: [pairId], id0: csaId0 }], null, 2), { flag: 'wx' });
  fs.writeFileSync(cdefEntries, JSON.stringify([{ pairId, size: 2420 }], null, 2), { flag: 'wx' });
  const csaNext = path.join(work, 'CsaDatabase.jsfb');
  const cdefNext = path.join(work, 'CdefDatabase.jsfb');
  runNode(path.join(__dirname, 'append_2k26_csa_entry.js'), [csaPath, csaNext, '--entries', csaEntries], repo);
  runNode(path.join(__dirname, 'append_2k26_cdef_entry.js'), [cdefPath, cdefNext, '--entries', cdefEntries], repo);
  fs.copyFileSync(csaNext, csaPath);
  fs.copyFileSync(cdefNext, cdefPath);

  const before = new Map(walkFiles(path.resolve(options.baseExtracted)).map((row) => [row.path.toLowerCase(), row.sha256]));
  const after = new Map(walkFiles(tree).map((row) => [row.path.toLowerCase(), row.sha256]));
  const added = [...after.keys()].filter((key) => !before.has(key)).sort();
  const removed = [...before.keys()].filter((key) => !after.has(key)).sort();
  const changed = [...before.keys()].filter((key) => after.has(key) && before.get(key) !== after.get(key)).sort();
  const allowedAdded = new Set([...pairAssets, 'Entrances/VictoryListData.jsfb'].map((name) => name.toLowerCase()));
  if (added.length !== allowedAdded.size || added.some((key) => !allowedAdded.has(key)) || removed.length) throw new Error(`Unexpected merged path set: ${JSON.stringify({ added, removed })}`);
  if (changed.length !== expectedChanged.size || changed.some((key) => !expectedChanged.has(key))) throw new Error(`Unexpected modifications to baseline members: ${JSON.stringify(changed)}`);
  for (const relative of ['Entrances/EntranceListData.jsfb', 'Cutscene/CutsceneAssembly/14002.jsfb', ...[101, 111, 121, 131, 141].map((phase) => `Animation/CaeAdvanced/${phase}4002.clips`)]) {
    const key = relative.toLowerCase();
    if (!before.has(key) || before.get(key) !== after.get(key)) throw new Error(`Known-playback Entrance payload changed during Victory rebase: ${relative}`);
  }
  const report = {
    schema: 'aurora-forge/2k26-victory-rebase/v1',
    base: { path: path.resolve(options.baseCak), sha256: baseProof.sha256, extractedFiles: baseProof.files },
    victorySource: { path: path.resolve(options.victoryCak), sha256: victoryProof.sha256, payloadRoot: sourcePayload, entryId, sourceEntryId, motionId, pairId, nameId, csaId0, name: options.name },
    preservedNativeVictoryRows: native.recordCount,
    appendedVictoryListRecord: victoryRow.index,
    preservedBaseMembers: before.size - changed.length,
    added,
    changed,
    unchangedEntranceGuards: true,
    pairAssets,
    victoryList: victoryListProof,
    output: tree
  };
  fs.writeFileSync(path.join(output, 'REBASE-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run({
      baseCak: arg('--base-cak'), baseHash: arg('--base-sha256'), baseExtracted: arg('--base-extracted'),
      victoryCak: arg('--victory-cak'), victoryHash: arg('--victory-sha256'), victoryPayload: arg('--victory-payload'),
      comparison: arg('--comparison'), nativeVictoryList: arg('--native-victory-list'), output: arg('--out'),
      entryId: arg('--entry-id'), sourceEntryId: arg('--source-entry-id'), motionId: arg('--motion-id'), pairId: arg('--pair-id'), nameId: arg('--name-id'), name: arg('--name'), csaId0: arg('--csa-id0')
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { readContRows, run, verifySourceExtraction, walkFiles };
