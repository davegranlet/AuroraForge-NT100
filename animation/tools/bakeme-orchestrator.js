'use strict';
// Applies repo-owned 2K25 editor tools to a copied full BakeMe tree and emits
// a per-file proof report. This does not bake a CAK; it prepares/audits the
// BakeMe input tree that Foundry/FTribTool can then package.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function listFiles(root, dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    return [path.relative(root, full).replace(/\\/g, '/')];
  }).sort();
}

function inventory(root) {
  const result = new Map();
  for (const relative of listFiles(root)) {
    const file = path.join(root, relative);
    const stat = fs.statSync(file);
    result.set(relative, { bytes: stat.size, sha256: sha256(file) });
  }
  return result;
}

function diffInventories(before, after) {
  const all = [...new Set([...before.keys(), ...after.keys()])].sort();
  return all.map((relative) => {
    const a = before.get(relative);
    const b = after.get(relative);
    if (!a) return { relative, status: 'added', after: b };
    if (!b) return { relative, status: 'removed', before: a };
    if (a.sha256 !== b.sha256 || a.bytes !== b.bytes) return { relative, status: 'modified', before: a, after: b };
    return null;
  }).filter(Boolean);
}

function copyTree(source, output) {
  if (!fs.statSync(source).isDirectory()) throw new Error(`sourceBakeMe is not a directory: ${source}`);
  if (fs.existsSync(output)) throw new Error(`outputBakeMe already exists; refusing to overwrite: ${output}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.cpSync(source, output, { recursive: true, preserveTimestamps: true });
}

function runTool(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`tool failed: node ${args.join(' ')}\n${result.stdout}\n${result.stderr}`.trim());
  }
  const text = `${result.stdout || ''}${result.stderr || ''}`.trim();
  return text ? JSON.parse(result.stdout) : null;
}

function replaceWithTool(relativePath, outputRoot, toolArgs) {
  const target = path.join(outputRoot, relativePath);
  if (!fs.existsSync(target)) throw new Error(`target file is missing: ${relativePath}`);
  const temp = `${target}.aurora-tmp`;
  try {
    const report = runTool(toolArgs(target, temp));
    fs.renameSync(temp, target);
    return report;
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

function appendArgs(values) {
  return Object.entries(values || {}).flatMap(([key, value]) => {
    if (value === undefined || value === null) return [];
    return [`--${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`, String(value)];
  });
}

function applyBakeMeConfig(config) {
  const sourceBakeMe = path.resolve(config.sourceBakeMe);
  const outputBakeMe = path.resolve(config.outputBakeMe);
  copyTree(sourceBakeMe, outputBakeMe);

  const before = inventory(outputBakeMe);
  const operations = [];

  for (const asset of config.assets || []) {
    if (!asset.source || !asset.relativePath) throw new Error('asset entries require source and relativePath');
    const target = path.join(outputBakeMe, asset.relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.resolve(asset.source), target);
    operations.push({ type: 'asset', relativePath: asset.relativePath, sha256: sha256(target) });
  }

  if (config.sdb) {
    const { relativePath, id, text } = config.sdb;
    const report = replaceWithTool(relativePath, outputBakeMe, (input, output) => [
      path.join('tools', 'append_2k25_sdb_string.js'),
      input,
      output,
      '--id',
      id,
      '--text',
      text,
    ]);
    operations.push({ type: 'sdb', relativePath, report });
  }

  if (config.victory) {
    const { relativePath, entryId, cloneId, ...rest } = config.victory;
    const report = replaceWithTool(relativePath, outputBakeMe, (input, output) => [
      path.join('tools', 'append_2k25_victory_entry.js'),
      input,
      output,
      '--entry-id',
      entryId,
      '--clone-id',
      cloneId,
      ...appendArgs(rest),
    ]);
    operations.push({ type: 'victory', relativePath, report });
  }

  if (config.entrance) {
    const { relativePath, entryId, ...rest } = config.entrance;
    const report = replaceWithTool(relativePath, outputBakeMe, (input, output) => [
      path.join('tools', 'append_2k25_entrance_entry.js'),
      input,
      output,
      '--entry-id',
      entryId,
      ...appendArgs(rest),
    ]);
    operations.push({ type: 'entrance', relativePath, report });
  }

  if (config.cutscene) {
    const { relativePath, templateId, newId, nameString } = config.cutscene;
    const target = path.join(outputBakeMe, relativePath);
    const source = fs.readFileSync(target);
    const { appendCutsceneEntry } = require('./clips-codec/append-cutscene-entry');
    const { findCutsceneEntry } = require('./clips-codec/find-cutscene-entry');
    const edited = appendCutsceneEntry(source, { templateId, newId, newNameStringId: nameString });
    fs.writeFileSync(target, edited);
    const entry = findCutsceneEntry(edited, newId);
    operations.push({
      type: 'cutscene',
      relativePath,
      report: {
        bytes: edited.length,
        newId,
        nameString,
        found: Boolean(entry),
        index: entry ? entry.index : null,
      },
    });
  }

  function applyBufferTool(relativePath, label, apply) {
    const target = path.join(outputBakeMe, relativePath);
    const source = fs.readFileSync(target);
    const edited = apply(source);
    fs.writeFileSync(target, edited);
    operations.push({ type: label, relativePath, report: { bytes: edited.length } });
  }

  if (config.teams) {
    const { relativePath, templateTeamId, newTeamId } = config.teams;
    const { appendTeamsEntry, findRecordByTeamId, locateRecords } = require('./append-2k25-teams-entry');
    applyBufferTool(relativePath, 'teams', (source) => appendTeamsEntry(source, { templateTeamId, newTeamId }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const found = findRecordByTeamId(edited, locateRecords(edited), newTeamId);
    operations.push({ type: 'teams-verify', relativePath, report: { found: Boolean(found), index: found ? found.index : null } });
  }

  if (config.charmapping) {
    const { relativePath, templateId, newId } = config.charmapping;
    const { appendCharacterMappingEntry, findById, locateRecords } = require('./append-2k25-character-mapping-entry');
    applyBufferTool(relativePath, 'charmapping', (source) => appendCharacterMappingEntry(source, { templateId, newId }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const found = findById(edited, locateRecords(edited), newId);
    operations.push({ type: 'charmapping-verify', relativePath, report: { found: Boolean(found), index: found ? found.index : null } });
  }

  if (config.cammove) {
    const { relativePath, templateMotionId, newId, vsize, osize } = config.cammove;
    const { appendCAMMoveEntry, locateRecords, readMotionId } = require('./append-2k25-cammove-entry');
    applyBufferTool(relativePath, 'cammove', (source) => appendCAMMoveEntry(source, { templateMotionId, newId, vsize, osize }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const vec = locateRecords(edited);
    const created = readMotionId(edited, vec.tables[vec.count - 1]);
    operations.push({ type: 'cammove-verify', relativePath, report: { found: Boolean(created) && created.motionId === (newId & 0xffff) } });
  }

  if (config.facetextures) {
    const { relativePath, templateId, newId } = config.facetextures;
    const { appendFaceTexturesEntry, findById, locateRecords } = require('./append-2k25-face-textures-entry');
    applyBufferTool(relativePath, 'facetextures', (source) => appendFaceTexturesEntry(source, { templateId, newId }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const found = findById(edited, locateRecords(edited), newId);
    operations.push({ type: 'facetextures-verify', relativePath, report: { found: Boolean(found), index: found ? found.index : null } });
  }

  if (config.charmoveset) {
    const { relativePath, wrestlerId, templateSdbId, newSdbId } = config.charmoveset;
    const { appendCharMoveSetSlot } = require('./append-2k25-charmoveset-slot');
    applyBufferTool(relativePath, 'charmoveset', (source) => appendCharMoveSetSlot(source, { wrestlerId, templateSdbId, newSdbId }));
  }

  if (config.charprofilepro) {
    const { relativePath, templateCharId, newCharId } = config.charprofilepro;
    const { appendCharProfileProEntry, findByCharId, locateRecords } = require('./append-2k25-charprofilepro-entry');
    applyBufferTool(relativePath, 'charprofilepro', (source) => appendCharProfileProEntry(source, { templateCharId, newCharId }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const found = findByCharId(edited, locateRecords(edited).vecInfo, newCharId);
    operations.push({ type: 'charprofilepro-verify', relativePath, report: { found: Boolean(found), index: found ? found.index : null } });
  }

  if (config.charprofiletable) {
    const { relativePath, templateCharId, newCharId } = config.charprofiletable;
    const { appendCharProfileTableEntry, findByCharId, locateRecords } = require('./append-2k25-charprofiletable-entry');
    applyBufferTool(relativePath, 'charprofiletable', (source) => appendCharProfileTableEntry(source, { templateCharId, newCharId }));
    const edited = fs.readFileSync(path.join(outputBakeMe, relativePath));
    const found = findByCharId(edited, locateRecords(edited).vecInfo, newCharId);
    operations.push({ type: 'charprofiletable-verify', relativePath, report: { found: Boolean(found), index: found ? found.index : null } });
  }

  if (config.hidemotion) {
    throw new Error('hidemotion is disabled: HideCtrlData.hidelink.jsfb is protected and must not be modified');
  }

  const after = inventory(outputBakeMe);
  const changedFiles = diffInventories(before, after);
  const proof = {
    sourceBakeMe,
    outputBakeMe,
    generatedAt: new Date().toISOString(),
    sourceFiles: before.size,
    outputFiles: after.size,
    operations,
    changedFiles,
  };
  const proofPath = path.join(outputBakeMe, 'aurora-bakeme-proof.json');
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n');
  return { ...proof, proofPath };
}

module.exports = { applyBakeMeConfig, diffInventories, inventory, listFiles };

if (require.main === module) {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('Usage: node tools/bakeme-orchestrator.js <config.json>');
    process.exit(2);
  }
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(JSON.stringify(applyBakeMeConfig(config), null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
