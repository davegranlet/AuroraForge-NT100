#!/usr/bin/env node
'use strict';

// Aurora Forge — converter core: one 2K19 animation -> one fully-registered
// 2K25 (SNME) entry inside a BakeMe tree.
//
// Pipeline per call:
//   1. detect kind (10 sections = entrance, 2 = victory) via export-yanm-ir
//   2. build 2K25 clips assets:
//        entrance: 29-record mono (852 template, body recs 22/24/10/26/27 from
//                  sections 0/2/4/6/8) + adefs clone + 5 CaeAdvanced phase files
//        victory:  17-record file (record 15 replaced) + adefs clone
//   3. stage registration into a BakeMe tree (no copy; tree must contain the
//      stock SNME files):
//        - SDB name id (last+1 negative space) + text
//        - entrance row: byte-preserving clone of sec8 row 1 + in-place f4/f5 edit
//        - victory row: proven victory entry writer
//        - cutscene entry (template 6100)
//        - 8 extended writers (teams, charmapping, cammove, facetextures,
//          charmoveset, charprofilepro, charprofiletable, hidemotion)
//   4. returns a descriptor with every change (proof)
//
// CLI:
//   node tools/convert-2k19-animation-to-2k25-entry.js \
//     --source19 <decoded.bin> --tree <BakeMe tree root> --id <entryId> \
//     --name "AURORA 16086" [--kind entrance|victory|auto] [--extraction C:\Games\2k25-extraction]
//
// Library:
//   const { convertAnimationToEntry, buildEntryAssets, stageRegistration } = require(...)

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');
const DEFAULT_EXTRACTION = 'C:\\Games\\2k25-extraction';

function die(message) { console.error(message); process.exit(2); }
function log(step, detail) { console.error(`[convert] ${step}: ${detail}`); }

function runTool(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout || ''}${result.stderr || ''}`.trim());
  return result.stdout ? JSON.parse(result.stdout) : null;
}

// ---------- kind detection ----------

function detectKind(source19) {
  const { exportIr } = require('./export-yanm-ir');
  const ir = exportIr(source19);
  const sections = ir.sections.length;
  if (sections >= 10) return 'entrance';
  if (sections >= 2) return 'victory';
  throw new Error(`cannot detect kind: ${sections} section(s)`);
}

// ---------- clips assets ----------

function buildEntranceAssets({ source19, entryId, extraction, outputRoot }) {
  const { parseFile, build } = require('./clips-layout');
  const { buildImportedClips } = require('./clips-codec/build-imported-clips');
  const baseName = '852';
  const templateMono = path.join(extraction, 'Animation', 'Entrance', `${baseName}.clips`);
  const templateAdefs = path.join(extraction, 'Animation', 'Entrance', `${baseName}.adefs`);
  const outClips = path.join(outputRoot, 'Animation', 'Entrance', `${entryId}.clips`);
  const outAdefs = path.join(outputRoot, 'Animation', 'Entrance', `${entryId}.adefs`);
  fs.mkdirSync(path.dirname(outClips), { recursive: true });

  // Mono: replace body records 22/24/10/26/27 from sections 0/2/4/6/8 (chained).
  const bodyMap = [
    { recordIndex: 22, sectionIndex: 0 },
    { recordIndex: 24, sectionIndex: 2 },
    { recordIndex: 10, sectionIndex: 4 },
    { recordIndex: 26, sectionIndex: 6 },
    { recordIndex: 27, sectionIndex: 8 },
  ];
  const os = require('node:os');
  let currentTemplate = templateMono;
  for (const [i, { recordIndex, sectionIndex }] of bodyMap.entries()) {
    const { exportIr } = require('./export-yanm-ir');
    const tempIr = path.join(os.tmpdir(), `aurora-entry-ir-${process.pid}-${i}.json`);
    fs.writeFileSync(tempIr, JSON.stringify(exportIr(source19, sectionIndex)));
    const outPath = i < bodyMap.length - 1 ? path.join(os.tmpdir(), `aurora-entry-step-${process.pid}-${i}.clips`) : outClips;
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    buildImportedClips({ sourceIrPath: tempIr, templatePath: currentTemplate, recordIndex, outputPath: outPath, sectionIndex: 0, legsStock: false });
    fs.unlinkSync(tempIr);
    if (i < bodyMap.length - 1) currentTemplate = outPath;
  }
  for (let i = 0; i < bodyMap.length - 1; i++) {
    const temp = path.join(os.tmpdir(), `aurora-entry-step-${process.pid}-${i}.clips`);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
  fs.copyFileSync(templateAdefs, outAdefs);

  // Phase files: 1000852..1400852 templates, body record replaced from mono recs 22/24/10/26/27.
  const mono = parseFile(outClips, { includeRaw: false });
  const monoRaw = fs.readFileSync(outClips);
  const phases = [
    { phase: '1000852', out: `1000${entryId}`, bodyMonoIndex: 22, bodyRecIndex: 4 },
    { phase: '1100852', out: `1100${entryId}`, bodyMonoIndex: 24, bodyRecIndex: 4 },
    { phase: '1200852', out: `1200${entryId}`, bodyMonoIndex: 10, bodyRecIndex: 4 },
    { phase: '1300852', out: `1300${entryId}`, bodyMonoIndex: 26, bodyRecIndex: 0 },
    { phase: '1400852', out: `1400${entryId}`, bodyMonoIndex: 27, bodyRecIndex: 0 },
  ];
  const phaseDir = path.join(outputRoot, 'Animation', 'CaeAdvanced');
  fs.mkdirSync(phaseDir, { recursive: true });
  for (const phase of phases) {
    const tplPath = path.join(extraction, 'Animation', 'CaeAdvanced', `${phase.phase}.clips`);
    const tplRaw = fs.readFileSync(tplPath);
    const tpl = parseFile(tplPath, { includeRaw: false });
    const bodyRec = mono.records[phase.bodyMonoIndex];
    const bodyPayload = monoRaw.subarray(bodyRec.offset, bodyRec.offset + bodyRec.length);
    const payloads = tpl.records.map((r, i) => (i === phase.bodyRecIndex ? bodyPayload : tplRaw.subarray(r.offset, r.offset + r.length)));
    fs.writeFileSync(path.join(phaseDir, `${phase.out}.clips`), build(payloads));
    fs.copyFileSync(path.join(extraction, 'Animation', 'CaeAdvanced', `${phase.phase}.adefs`), path.join(phaseDir, `${phase.out}.adefs`));
  }
  return { kind: 'entrance', clips: outClips, adefs: outAdefs, phases: phases.map((p) => path.join(phaseDir, `${p.out}.clips`)) };
}

function buildVictoryAssets({ source19, entryId, extraction, outputRoot }) {
  const { buildReplacement } = require('./build-2k19-to-2k25-replace-clips');
  const baseName = '6100';
  const templateClips = path.join(extraction, 'Animation', 'Victory', `${baseName}.clips`);
  const templateAdefs = path.join(extraction, 'Animation', 'Victory', `${baseName}.adefs`);
  const outClips = path.join(outputRoot, 'Animation', 'Victory', `${entryId}.clips`);
  const outAdefs = path.join(outputRoot, 'Animation', 'Victory', `${entryId}.adefs`);
  fs.mkdirSync(path.dirname(outClips), { recursive: true });
  buildReplacement({ source19, template25: templateClips, recordIndex: 15, output: outClips });
  fs.copyFileSync(templateAdefs, outAdefs);
  return { kind: 'victory', clips: outClips, adefs: outAdefs, phases: [] };
}

// ---------- registration staging ----------

function nextNameId(treeRoot) {
  const { readSdbRecords } = require('./sdb-read');
  const records = readSdbRecords(fs.readFileSync(path.join(treeRoot, 'Sdb', 'ENG.sdb')));
  return (records[records.length - 1].id + 1) >>> 0;
}

function stageSdbName(treeRoot, text) {
  const { readSdbRecords } = require('./sdb-read');
  const sdbPath = path.join(treeRoot, 'Sdb', 'ENG.sdb');
  const records = readSdbRecords(fs.readFileSync(sdbPath));
  const existing = records.find((r) => r.text === text);
  if (existing) return { id: existing.id >>> 0, signedId: existing.id | 0, created: false };
  const next = (records[records.length - 1].id + 1) >>> 0;
  const signed = next > 0x7fffffff ? next - 0x100000000 : next;
  runTool([path.join('tools', 'append_2k25_sdb_string.js'), sdbPath, sdbPath, '--id', String(signed), '--text', text], 'sdb append');
  return { id: next, signedId: signed, created: true };
}

function stageEntranceRow(treeRoot, { entryId, nameId, motionId }) {
  const entrancePath = path.join(treeRoot, 'Entrances', 'EntranceListData.jsfb');
  const { findEntranceEntry } = require('./find-2k25-entrance-entry');
  const existing = findEntranceEntry(fs.readFileSync(entrancePath), entryId);
  if (existing) return { created: false, section: existing.section, index: existing.index };
  const temporary = `${entrancePath}.aurora-clone.tmp`;
  runTool([
    path.join('tools', 'append_2k25_entrance_clone_graph.js'), entrancePath, temporary,
    '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(nameId),
  ], 'entrance clone');
  const { editEntranceEntry } = require('./edit-2k25-entrance-entry');
  editEntranceEntry({ inputPath: temporary, outputPath: entrancePath, entryId, setters: { field4: motionId, field5: motionId } });
  fs.unlinkSync(temporary);
  return { created: true };
}

function stageVictoryRow(treeRoot, { entryId, nameId, motionId }) {
  const victoryPath = path.join(treeRoot, 'Entrances', 'VictoryListData.jsfb');
  const result = runTool([
    path.join('tools', 'append_2k25_victory_clone_graph.js'), victoryPath, victoryPath,
    '--entry-id', String(entryId), '--clone-id', '100', '--name-string', String(nameId),
    '--some-id', String(motionId), '--face', String(motionId),
  ], 'victory append');
  return result;
}

function stageCutsceneRow(treeRoot, { entryId, nameId }) {
  const { appendCutsceneEntry } = require('./clips-codec/append-cutscene-entry');
  const cutscenePath = path.join(treeRoot, 'Cutscene', 'CutsceneNoRegistry.jsfb');
  const edited = appendCutsceneEntry(fs.readFileSync(cutscenePath), { templateId: 6100, newId: entryId, newNameStringId: nameId });
  fs.writeFileSync(cutscenePath, edited);
  return { bytes: edited.length };
}

// Extended writer blocks (all in-process; each clones a same-shape stock row).
function stageExtended(treeRoot, { entryId, nameId }) {
  const blocks = {};
  const { appendTeamsEntry } = require('./append-2k25-teams-entry');
  let p = path.join(treeRoot, 'Stable', 'TeamsTable.jsfb');
  fs.writeFileSync(p, appendTeamsEntry(fs.readFileSync(p), { templateTeamId: 100, newTeamId: entryId }));
  blocks.teams = true;

  const { appendCharacterMappingEntry } = require('./append-2k25-character-mapping-entry');
  p = path.join(treeRoot, 'Characters', 'CharacterMapping.jsfb');
  fs.writeFileSync(p, appendCharacterMappingEntry(fs.readFileSync(p), { templateId: 120, newId: entryId }));
  blocks.charmapping = true;

  const { appendCAMMoveEntry } = require('./append-2k25-cammove-entry');
  p = path.join(treeRoot, 'MoveData', 'CAMMoveData.jsfb');
  fs.writeFileSync(p, appendCAMMoveEntry(fs.readFileSync(p), { templateMotionId: 41525, newId: entryId, vsize: 116, osize: 80 }));
  blocks.cammove = true;

  const { appendFaceTexturesEntry } = require('./append-2k25-face-textures-entry');
  p = path.join(treeRoot, 'Roster', 'FaceTextures.jsfb');
  fs.writeFileSync(p, appendFaceTexturesEntry(fs.readFileSync(p), { templateId: 100, newId: entryId }));
  blocks.facetextures = true;

  const { appendCharMoveSetSlot } = require('./append-2k25-charmoveset-slot');
  p = path.join(treeRoot, 'Roster', 'CharMoveSetDataTable.jsfb');
  fs.writeFileSync(p, appendCharMoveSetSlot(fs.readFileSync(p), { wrestlerId: 1, templateSdbId: 4294957756, newSdbId: nameId }));
  blocks.charmoveset = true;

  const { appendCharProfileProEntry } = require('./append-2k25-charprofilepro-entry');
  p = path.join(treeRoot, 'Roster', 'CharProfilePro.jsfb');
  fs.writeFileSync(p, appendCharProfileProEntry(fs.readFileSync(p), { templateCharId: 101, newCharId: entryId }));
  blocks.charprofilepro = true;

  const { appendCharProfileTableEntry } = require('./append-2k25-charprofiletable-entry');
  p = path.join(treeRoot, 'Roster', 'CharProfileTable.jsfb');
  fs.writeFileSync(p, appendCharProfileTableEntry(fs.readFileSync(p), { templateCharId: 65533, newCharId: entryId }));
  blocks.charprofiletable = true;

  const { appendHideMotionEntry } = require('./append-hide-ctrl-entry');
  p = path.join(treeRoot, 'Hide', 'HideCtrlData.hidelink.jsfb');
  fs.writeFileSync(p, appendHideMotionEntry(fs.readFileSync(p), { section: 0, templateIndex: 0, newMotionId: entryId }));
  blocks.hidemotion = true;

  return blocks;
}

function stageRegistration(treeRoot, { entryId, name, nameId, motionId, kind, mode }) {
  const full = mode !== 'minimal';
  const proof = { entryId, name, treeRoot, mode: full ? 'full' : 'minimal', steps: {} };
  proof.steps.sdb = stageSdbName(treeRoot, name);
  const actualNameId = proof.steps.sdb.id;
  if (kind === 'entrance') {
    proof.steps.entranceRow = stageEntranceRow(treeRoot, { entryId, nameId: actualNameId, motionId });
  }
  if (full) {
    proof.steps.victoryRow = stageVictoryRow(treeRoot, { entryId, nameId: actualNameId, motionId });
  }
  proof.steps.cutscene = stageCutsceneRow(treeRoot, { entryId, nameId: actualNameId });
  if (full) {
    proof.steps.extended = stageExtended(treeRoot, { entryId, nameId: actualNameId });
  }
  proof.nameId = actualNameId;
  return proof;
}

const FTRIB = process.env.AURORA_FTRIB || 'C:\\AuroraForge-Aug26\\AuroraForge_WWE_PC-Game_Modding_Tool\\Aurora-CAK-Foundry\\app\\tools\\cak-v93\\FTribTool.exe';
const GAME_ROOT = process.env.AURORA_GAME_ROOT || 'C:\\WWE 2K25 Saturday Nights Main Event';

// Minimal tree: ONLY the registration files the entry flow writes.
// (Dire appears in EntranceListData + VictoryListData + SDB; SDB comes from
//  bakedfile03 = mount-order winner.) Never ship Hide/roster/cutscene stock copies.
function stageStockTree(treeRoot, extraction) {
  const files = [
    ['Entrances', 'EntranceListData.jsfb'],
    ['Entrances', 'VictoryListData.jsfb'],
  ];
  for (const [dir, file] of files) {
    const target = path.join(treeRoot, dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(extraction, dir, file), target);
  }
  return files.length;
}

// ENG.sdb must come from bakedfile03 (the mount-order winner), never the
// shadowed bakedfile01 copy. Extracted once and cached.
function ensureSdbWinner(treeRoot, cacheRoot) {
  const target = path.join(treeRoot, 'Sdb', 'ENG.sdb');
  if (fs.existsSync(target)) return target;
  const cache = path.join(cacheRoot || path.dirname(treeRoot), 'sources', 'ENG.sdb');
  if (!fs.existsSync(cache)) {
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    const { spawnSync } = require('node:child_process');
    const stage = `${cache}.stage`;
    fs.rmSync(stage, { recursive: true, force: true });
    const out = spawnSync(FTRIB, ['unpack-file', '-i', path.join(GAME_ROOT, 'bakedfile03.cak'), '-f', 'Sdb/ENG.sdb', '-o', stage], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
    const extracted = path.join(stage, 'Sdb', 'ENG.sdb');
    if (!fs.existsSync(extracted)) throw new Error(`bakedfile03 ENG.sdb extraction failed: ${out.stdout || ''}${out.stderr || ''}`);
    fs.copyFileSync(extracted, cache);
    fs.rmSync(stage, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(cache, target);
  return target;
}

function convertAnimationToEntry(options) {
  const source19 = path.resolve(options.source19 || '');
  if (!fs.existsSync(source19)) die(`source19 does not exist: ${source19}`);
  const extraction = path.resolve(options.extraction || DEFAULT_EXTRACTION);
  const treeRoot = path.resolve(options.tree || '');
  if (!treeRoot) die('tree is required');
  const entryId = Number(options.entryId);
  if (!Number.isSafeInteger(entryId) || entryId <= 0 || entryId > 0xffff) die('entryId must be 1..65535');
  const kind = options.kind && options.kind !== 'auto' ? options.kind : detectKind(source19);
  const name = options.name || `AURORA ${entryId}`;

  log('kind', kind);
  if (options.fresh !== false) {
    fs.mkdirSync(treeRoot, { recursive: true });
    stageStockTree(treeRoot, extraction);
    ensureSdbWinner(treeRoot, options.workRoot || path.dirname(treeRoot));
  }

  const assets = kind === 'entrance'
    ? buildEntranceAssets({ source19, entryId, extraction, outputRoot: treeRoot })
    : buildVictoryAssets({ source19, entryId, extraction, outputRoot: treeRoot });
  log('assets', assets.clips);

  const registration = stageRegistration(treeRoot, { entryId, name, nameId: null, motionId: entryId, kind, mode: options.mode || 'full' });
  log('registration', JSON.stringify(registration.steps));

  const descriptor = {
    schema: 'aurora-forge-convert-entry/v1',
    source19,
    entryId,
    name,
    nameId: registration.nameId,
    kind,
    treeRoot,
    assets,
    registration,
  };
  fs.writeFileSync(path.join(treeRoot, `${entryId}-entry-descriptor.json`), JSON.stringify(descriptor, null, 2));
  return descriptor;
}

if (require.main === module) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : fallback;
  };
  try {
    const result = convertAnimationToEntry({
      source19: arg('--source19'),
      tree: arg('--tree'),
      entryId: arg('--id'),
      name: arg('--name'),
      kind: arg('--kind', 'auto'),
      mode: arg('--mode', 'full'),
      extraction: arg('--extraction'),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`convert failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { convertAnimationToEntry, buildEntranceAssets, buildVictoryAssets, stageRegistration, stageStockTree, ensureSdbWinner, detectKind };
