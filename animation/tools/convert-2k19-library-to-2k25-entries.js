'use strict';

// Batch builder: convert a whole folder of decoded WWE 2K19 motion bodies into
// NEW selectable WWE 2K25 entries, one per animation, and bake one loader-ready
// CAK.
//
// For every motion it assigns a new id (default 14000, 14001, ...), encodes the
// motion into Animation/Victory/<id>.clips using the solved 14000 skeleton as
// the structural base, and clones the solved 14000 registration into that new
// id: Victory list, Entrance list, the Cutscene picker row, and the SDB name.
//
// It reuses the proven Tribute 14000 registration skeleton, so the new entries
// look like entry 14000, just with the user's motion and a new id.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildReplacement } = require('./build-2k19-to-2k25-replace-clips');
const { appendCutsceneEntryForGame } = require('./clips-codec/append-cutscene-entry-for-game');
const { findEntranceEntry } = require('./find-2k25-entrance-entry');
const { locateEntranceVectors } = require('./locate-entrance-vectors');
const { readSdbRecords } = require('./sdb-read');

const DEFAULT_FOUNDRY = path.resolve(__dirname, '..', '..', 'Aurora-CAK-Foundry');
const DEFAULT_ID = 14000;

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function runTool(input, output, scriptArgs) {
  const result = spawnSync(process.execPath, scriptArgs, { cwd: __dirname, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(`tool failed: node ${scriptArgs.join(' ')}\n${result.stdout || ''}\n${result.stderr || ''}`.trim());
  fs.renameSync(output, input);
  return result.stdout ? JSON.parse(result.stdout) : null;
}

function replaceWithCli(relative, tool, extraArgs, report) {
  const input = path.resolve(relative);
  const output = `${input}.aurora-tmp`;
  try {
    runTool(input, output, [path.join(__dirname, tool), input, output, ...extraArgs]);
  } finally {
    if (fs.existsSync(output)) fs.rmSync(output, { force: true });
  }
  if (report) report.push({ file: path.basename(input), tool });
}

function listMotions(folderLabel, folder) {
  if (!folder) return [];
  const root = path.resolve(folder);
  if (!fs.existsSync(root)) throw new Error(`${folderLabel} folder not found: ${root}`);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  const motions = [];
  if (subdirs.length) {
    for (const dir of subdirs.sort((a, b) => a.name.localeCompare(b.name))) {
      const files = fs.readdirSync(path.join(root, dir.name), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.join(root, dir.name, e.name));
      if (!files.length) continue;
      const largest = files.map((f) => ({ f, size: fs.statSync(f).size })).sort((a, b) => b.size - a.size)[0].f;
      motions.push({ label: dir.name, file: largest });
    }
  } else {
    for (const file of entries.filter((e) => e.isFile()).map((e) => path.join(root, e.name)).sort()) {
      motions.push({ label: path.basename(file, path.extname(file)), file });
    }
  }
  return motions;
}

function detectBaseId(skeletonRoot) {
  const dir = path.join(skeletonRoot, 'Animation', 'Victory');
  const clips = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.clips'));
  if (!clips.length) throw new Error('skeleton has no Animation/Victory/*.clips');
  const ids = clips.map((n) => Number(path.basename(n, '.clips'))).filter((n) => Number.isInteger(n));
  if (!ids.length) throw new Error('skeleton clips filename is not a numeric id');
  return Math.min(...ids);
}

function nextSdbId(engSdbPath) {
  const records = readSdbRecords(fs.readFileSync(engSdbPath));
  const max = records.reduce((acc, r) => Math.max(acc, r.id >>> 0), 0);
  return (max + 1) >>> 0;
}

function resolveGame(foundryRoot, gameId) {
  try {
    const registry = require(path.join(foundryRoot, 'electron', 'game-versions.js'));
    const game = registry.byId(gameId);
    if (game && game.cak) return game.id;
    if (game) throw new Error(`${game.label} is not a CAK bake target yet (bake targets: 2k25, 2k26).`);
  } catch (error) {
    if (error && error.code !== 'MODULE_NOT_FOUND') throw error;
  }
  return gameId;
}

function runFoundryBake(foundryRoot, bakeMeRoot, outputCak, gameId) {
  const script = path.join(foundryRoot, 'scripts', 'bake-v93-cli.js');
  if (!fs.existsSync(script)) throw new Error(`Foundry bake CLI is missing: ${script}`);
  const tool = path.join(foundryRoot, 'app', 'tools', 'cak-v93', 'FTribTool.exe');
  const oodle = path.join(foundryRoot, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');
  const args = [script, '--source', bakeMeRoot, '--output', outputCak, '--game', String(gameId || '2k26')];
  if (fs.existsSync(tool)) args.push('--tool', tool);
  if (fs.existsSync(oodle)) args.push('--oodle', oodle);
  const result = spawnSync(process.execPath, args, { cwd: foundryRoot, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(`Foundry bake failed:\n${result.stdout || ''}\n${result.stderr || ''}`.trim());
  return JSON.parse(result.stdout);
}

function buildLibrary(options) {
  const skeletonRoot = path.resolve(options.skeleton || '');
  const outputCak = path.resolve(options.outputCak || '');
  const startId = Number(options.startId ?? DEFAULT_ID);
  const recordIndex = options.recordIndex ?? 'auto';
  const foundryRoot = path.resolve(options.foundryRoot || DEFAULT_FOUNDRY);
  const namePrefix = String(options.namePrefix || 'AURORA');
  const gameId = resolveGame(foundryRoot, String(options.game || '2k26'));
  if (!Number.isInteger(startId) || startId < 14000) throw new Error('start id must be an integer >= 14000');
  if (!outputCak.toLowerCase().endsWith('.cak')) throw new Error('out-cak must end in .cak');
  if (fs.existsSync(outputCak)) throw new Error(`refusing to overwrite existing CAK: ${outputCak}`);

  const baseClips = path.join(skeletonRoot, 'Animation', 'Victory');
  if (!fs.existsSync(baseClips)) throw new Error(`skeleton Animation/Victory not found: ${baseClips}. Choose your WWE 2K25/2K26 game folder in the app so the registration skeleton is rebuilt from your own game files.`);
  const baseId = detectBaseId(skeletonRoot);

  const victoryMotions = listMotions('victory', options.victoryFolder);
  const entranceMotions = listMotions('entrance', options.entranceFolder);
  const motions = [
    ...victoryMotions.map((m) => ({ ...m, kind: 'victory' })),
    ...entranceMotions.map((m) => ({ ...m, kind: 'entrance' })),
  ];
  if (!motions.length) throw new Error('no motions found: pass --victory <folder> and/or --entrance <folder>');

  const workRoot = path.resolve(options.workRoot || path.join(path.dirname(outputCak), `${path.basename(outputCak, '.cak')}-BakeMe`));
  if (fs.existsSync(workRoot)) throw new Error(`refusing to overwrite existing BakeMe folder: ${workRoot}`);
  fs.cpSync(skeletonRoot, workRoot, { recursive: true, preserveTimestamps: true });

  const victoryPath = path.join(workRoot, 'Entrances', 'VictoryListData.jsfb');
  const entrancePath = path.join(workRoot, 'Entrances', 'EntranceListData.jsfb');
  const cutscenePath = path.join(workRoot, 'Cutscene', 'CutsceneNoRegistry.jsfb');
  const engSdbPath = path.join(workRoot, 'Sdb', 'ENG.sdb');

  const baseEntrance = findEntranceEntry(fs.readFileSync(entrancePath), baseId);
  if (!baseEntrance) throw new Error(`skeleton EntranceListData has no entry ${baseId} to clone`);
  const baseRecord = baseEntrance.record;

  const baseTemplateClips = path.join(workRoot, 'Animation', 'Victory', `${baseId}.clips`);
  const baseAdefs = path.join(workRoot, 'Animation', 'Victory', `${baseId}.adefs`);
  const existingEntranceIds = locateEntranceVectors(fs.readFileSync(entrancePath)).flat().map((r) => r.id);
  const existingClipIds = fs.readdirSync(path.join(workRoot, 'Animation', 'Victory'))
    .filter((n) => n.toLowerCase().endsWith('.clips'))
    .map((n) => Number(path.basename(n, '.clips')))
    .filter((n) => Number.isInteger(n));
  const maxExisting = Math.max(baseId, ...existingEntranceIds, ...existingClipIds);
  const firstId = Math.max(startId, maxExisting + 1);

  let sdbId = nextSdbId(engSdbPath);
  const results = [];
  const skipped = [];
  const ops = [];
  motions.forEach((motion, index) => {
    try {
    const id = firstId + index;
    const nameString = sdbId + index;
    const clipsOut = path.join(workRoot, 'Animation', 'Victory', `${id}.clips`);
    if (fs.existsSync(clipsOut)) throw new Error(`Animation/Victory/${id}.clips already exists`);

    const tempClips = `${clipsOut}.aurora-import.tmp.clips`;
    const replacement = buildReplacement({ source19: motion.file, template25: baseTemplateClips, recordIndex, output: tempClips });
    fs.renameSync(tempClips, clipsOut);
    const adefsOut = path.join(workRoot, 'Animation', 'Victory', `${id}.adefs`);
    if (fs.existsSync(baseAdefs)) fs.copyFileSync(baseAdefs, adefsOut);

    const label = `${namePrefix} ${id}`;
    replaceWithCli(engSdbPath, 'append_2k25_sdb_string.js', ['--id', String(nameString), '--text', label], ops);
    replaceWithCli(victoryPath, 'append_2k25_victory_clone_graph.js', ['--entry-id', String(id), '--clone-id', String(baseId), '--name-string', String(nameString), '--some-id', String(id), '--face', String(id)], ops);
    replaceWithCli(entrancePath, 'append_2k25_entrance_scalar_rows.js', [
      '--entry-id', String(id),
      '--name-string', String(nameString),
    ], ops);

    const cutsceneResult = appendCutsceneEntryForGame(fs.readFileSync(cutscenePath), {
      templateId: baseId,
      newId: id,
      newNameStringId: nameString,
      gameVersion: gameId,
    });
    fs.writeFileSync(cutscenePath, cutsceneResult.output);

    results.push({ id, nameString, label, kind: motion.kind, source: motion.file, clips: path.relative(workRoot, clipsOut).replace(/\\/g, '/'), groupsReEncoded: replacement.groupsReEncoded, cutsceneF7: cutsceneResult.f7Repair });
    } catch (error) {
      skipped.push({ source: motion.file, reason: String(error && error.message || error) });
    }
    process.stderr.write(`[aurora-progress] convert ${index + 1} ${motions.length}\n`);
  });
  fs.rmSync(baseTemplateClips, { force: true });
  if (fs.existsSync(baseAdefs)) fs.rmSync(baseAdefs, { force: true });
  if (!results.length) {
    fs.rmSync(workRoot, { recursive: true, force: true });
    throw new Error(`no motions could be converted (first failure: ${skipped[0] ? skipped[0].reason : 'unknown'})`);
  }
  const assignedStartId = firstId;

  const manifest = {
    schema: 'aurora-forge-2k19-library-to-2k25-entries/v1',
    generatedAt: new Date().toISOString(),
    game: gameId,
    skeletonRoot,
    workRoot,
    outputCak,
    baseId,
    requestedStartId: startId,
    assignedStartId,
    count: results.length,
    entries: results,
    skipped,
    operations: ops,
    limits: [
      'Each motion is registered as a NEW entry cloned from the solved 14000 registration.',
      'Entries are added to both the Victory and Entrance lists plus the Cutscene picker row.',
      'Skeleton/root alignment (motion flying or folding) is the next beta.',
      'In-game visibility must be confirmed with the loader.',
    ],
  };
  fs.writeFileSync(path.join(workRoot, 'aurora-library-proof.json'), JSON.stringify(manifest, null, 2));
  process.stderr.write('[aurora-progress] bake 0 1\n');
  let bake;
  try {
    bake = runFoundryBake(foundryRoot, workRoot, outputCak, gameId);
  } catch (error) {
    fs.rmSync(workRoot, { recursive: true, force: true });
    if (fs.existsSync(outputCak)) fs.rmSync(outputCak, { force: true });
    throw error;
  }
  process.stderr.write('[aurora-progress] bake 1 1\n');
  return { ...manifest, cak: bake };
}

function usage() {
  return [
    'Usage:',
    '  node tools/convert-2k19-library-to-2k25-entries.js \\',
    '       --skeleton <known-good 14000 BakeMe root> \\',
    '       --victory <folder of decoded 2K19 victory motions> \\',
    '       [--entrance <folder of decoded 2K19 entrance motions>] \\',
    '       --out-cak <library.cak> [--start-id 14000] [--record <index|auto>] [--name-prefix AURORA] [--game 2k25|2k26]',
    '',
    'Each folder may contain one file per animation, or one subfolder per animation',
    '(the largest file in each subfolder is used as the motion body).',
  ].join('\n');
}

if (require.main === module) {
  try {
    const result = buildLibrary({
      skeleton: arg(process.argv, '--skeleton'),
      victoryFolder: arg(process.argv, '--victory', ''),
      entranceFolder: arg(process.argv, '--entrance', ''),
      startId: arg(process.argv, '--start-id', String(DEFAULT_ID)),
      recordIndex: arg(process.argv, '--record', 'auto'),
      namePrefix: arg(process.argv, '--name-prefix', 'AURORA'),
      game: arg(process.argv, '--game', '2k26'),
      outputCak: arg(process.argv, '--out-cak'),
      workRoot: arg(process.argv, '--work-root', undefined),
      foundryRoot: arg(process.argv, '--foundry', DEFAULT_FOUNDRY),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    const requestedGame = String(arg(process.argv, '--game', '2k26')).toUpperCase();
    console.error(`${requestedGame} library build failed: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

module.exports = { buildLibrary, listMotions, detectBaseId };
