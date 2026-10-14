'use strict';

// Automated WWE 2K19 animation intake.
//
// Given the user's WWE 2K19 game folder, this decodes the victory and/or
// entrance motion PACs under pac\evt into decoded YANM-bearing bodies the
// converter can consume. Decoding uses the existing AuroraPac19Helper.exe
// (PAC -> nested SHDC -> ZLIB/OODL bodies) and the game's own
// oo2core_6_win64.dll for OODL entries.
//
// Output layout (consumed by convert-2k19-library-to-2k25-entries.js):
//   <out>/victory/<id>.bin
//   <out>/entrance/<id>.bin
//   <out>/aurora-2k19-animation-intake.json

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// 2K19 pac\evt id ranges. Entrance events are low ids, victory events are the
// 6000-9999 block (matches notes/LOG-2K19-2K25-TRANSFER.md inventory scope).
const ENTRANCE_RANGE = [1, 5999];
const VICTORY_RANGE = [6000, 9999];

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function resolveHelper(explicit) {
  // Source tree: <prototype>/tools/ -> <flag>/app/tools/pac19-helper/
  // Packaged: app.asar.unpacked/app/tools/pac19-helper/, or as an extraResource.
  const candidates = [
    explicit,
    path.resolve(__dirname, '..', '..', 'app', 'tools', 'pac19-helper', 'AuroraPac19Helper.exe'),
    process.resourcesPath ? path.resolve(process.resourcesPath, 'app.asar.unpacked', 'app', 'tools', 'pac19-helper', 'AuroraPac19Helper.exe') : '',
    process.resourcesPath ? path.resolve(process.resourcesPath, 'pac19-helper', 'AuroraPac19Helper.exe') : '',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || '';
}

function callHelper(helper, request) {
  const requestPath = path.join(os.tmpdir(), `aurora-pac19-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(requestPath, JSON.stringify(request));
  try {
    const out = execFileSync(helper, [requestPath], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    return JSON.parse(out);
  } finally {
    fs.rmSync(requestPath, { force: true });
  }
}

function inspect(helper, archivePath, oodlePath) {
  const result = callHelper(helper, { action: 'inspect', archivePath, oodlePath, overwrite: true });
  return result.Entries || result.entries || [];
}

function extractAll(helper, archivePath, outputRoot, oodlePath) {
  const entries = inspect(helper, archivePath, oodlePath);
  const ids = entries.map((e) => e.Id ?? e.id);
  if (!ids.length) return [];
  const result = callHelper(helper, { action: 'extract', archivePath, outputRoot, oodlePath, overwrite: true, entryIds: ids });
  return result.Results || result.Entries || result.entries || [];
}

// Real WWE 2K19 pac\evt PACs are HSPC containers whose child payloads are
// Yukes-BPE compressed. The PAC helper deliberately does not decompress BPE, so
// the Python extractor performs that step first, then the helper decodes the
// resulting SHDC/nested-PAC containers into ZLIB/OODL bodies.
function runPython(pythonExe, args) {
  execFileSync(pythonExe, [path.join(__dirname, 'extract_2k19_pac.py'), ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function unpackBpe(pacFile, workDir, pythonExe) {
  fs.mkdirSync(workDir, { recursive: true });
  runPython(pythonExe, [pacFile, workDir]);
  const manifest = JSON.parse(fs.readFileSync(path.join(workDir, 'manifest.json'), 'utf8'));
  const containers = [];
  const leaves = [];
  for (const entry of manifest.entries || []) {
    const stem = `${String(entry.index).padStart(2, '0')}_${entry.name}`;
    const unpacked = entry.unpacked_file ? path.join(workDir, entry.unpacked_file) : '';
    if (unpacked && fs.existsSync(unpacked)) {
      if (/\.(shdc|pac)$/i.test(unpacked)) containers.push(unpacked);
      else leaves.push(unpacked);
      continue;
    }
    const stored = path.join(workDir, `${stem}.stored.bin`);
    if (fs.existsSync(stored)) leaves.push(stored);
  }
  return { containers, leaves };
}

// Recursively decode helper-supported containers (SHDC / nested PAC) to leaves.
function decodePacTree(helper, archivePath, outputRoot, oodlePath, depth = 0) {
  if (depth > 4) return [];
  fs.mkdirSync(outputRoot, { recursive: true });
  const extracted = extractAll(helper, archivePath, outputRoot, oodlePath);
  const leaves = [];
  for (const entry of extracted) {
    const full = path.join(outputRoot, entry.File || entry.file || entry.Relative || '');
    if (/\.(pac|shdc)$/i.test(full) && fs.existsSync(full)) leaves.push(...decodePacTree(helper, full, outputRoot, oodlePath, depth + 1));
    else leaves.push(full);
  }
  return leaves;
}

function isUsableLeaf(file) {
  return fs.existsSync(file) && !/\.(pac|shdc)$/i.test(file) && !/\.stored\.bin$/i.test(file) && !/\.0fop$/i.test(file);
}

function pickBody(files) {
  const scored = files.map((file) => {
    const name = path.basename(file).toLowerCase();
    let score = 0;
    if (/entry_0_\(zlib\)/.test(name)) score += 30;
    if (/entry_0_\(oodl\)/.test(name)) score += 30;
    if (/entry_0_/.test(name)) score += 10;
    if (/zlib\)/.test(name) || /oodl\)/.test(name)) score += 5;
    if (/entry_1_/.test(name)) score -= 25;
    score += Math.min(fs.statSync(file).size / 1e6, 5);
    return { file, score };
  }).sort((a, b) => b.score - a.score);
  return scored.length ? scored[0].file : '';
}

function inScope(id, scope) {
  if (scope === 'everything') return true;
  if (scope === 'entrance') return id >= ENTRANCE_RANGE[0] && id <= ENTRANCE_RANGE[1];
  if (scope === 'victory') return id >= VICTORY_RANGE[0] && id <= VICTORY_RANGE[1];
  return (id >= ENTRANCE_RANGE[0] && id <= ENTRANCE_RANGE[1]) || (id >= VICTORY_RANGE[0] && id <= VICTORY_RANGE[1]);
}

function extractAnimations(options) {
  const gameRoot = path.resolve(options.game || '');
  const outRoot = path.resolve(options.out || '');
  const scope = String(options.scope || 'all');
  const helper = resolveHelper(options.helper);
  const pythonExe = options.python || 'python';
  if (!fs.existsSync(gameRoot) || !fs.statSync(gameRoot).isDirectory()) throw new Error(`WWE 2K19 game folder not found: ${gameRoot}`);
  if (!helper) throw new Error('AuroraPac19Helper.exe was not found. It is bundled with the app.');
  try { execFileSync(pythonExe, ['--version'], { encoding: 'utf8' }); }
  catch (_error) { throw new Error('Python 3 is required to decode WWE 2K19 BPE animation containers. Install Python 3 and ensure "python" is on PATH.'); }
  const evtDir = path.join(gameRoot, 'pac', 'evt');
  if (!fs.existsSync(evtDir)) throw new Error(`This folder has no pac\\evt animation directory: ${evtDir}`);
  const oodlePath = options.oodle || path.join(gameRoot, 'oo2core_6_win64.dll');
  if (!fs.existsSync(oodlePath)) throw new Error('WWE 2K19 oo2core_6_win64.dll was not found in the game folder.');

  const onlyIds = String(options.ids || '').split(',').map((v) => v.trim()).filter(Boolean).map((v) => Number(v)).filter((v) => Number.isInteger(v));
  const pacs = fs.readdirSync(evtDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pac'))
    .map((e) => ({ id: Number(path.basename(e.name, '.pac')), file: path.join(evtDir, e.name) }))
    .filter((e) => Number.isInteger(e.id) && (onlyIds.length ? onlyIds.includes(e.id) : inScope(e.id, scope)))
    .sort((a, b) => a.id - b.id);

  const victoryDir = path.join(outRoot, 'victory');
  const entranceDir = path.join(outRoot, 'entrance');
  fs.mkdirSync(victoryDir, { recursive: true });
  fs.mkdirSync(entranceDir, { recursive: true });

  const results = [];
  const failures = [];
  process.stderr.write(`[aurora-progress] extract 0 ${pacs.length}\n`);
  let processed = 0;
  for (const pac of pacs) {
    processed++;
    try {
      const workDir = path.join(outRoot, '_work', String(pac.id));
      const unpack = unpackBpe(pac.file, workDir, pythonExe);
      const leaves = [...unpack.leaves];
      for (const container of unpack.containers) {
        leaves.push(...decodePacTree(helper, container, path.join(workDir, 'children'), oodlePath));
      }
      const body = pickBody(leaves.filter(isUsableLeaf));
      if (!body) { failures.push({ id: pac.id, reason: 'no decoded body' }); continue; }
      const kind = pac.id >= VICTORY_RANGE[0] ? 'victory' : 'entrance';
      const target = path.join(kind === 'victory' ? victoryDir : entranceDir, `${pac.id}.bin`);
      fs.copyFileSync(body, target);
      results.push({ id: pac.id, kind, source: pac.file, body: target, bytes: fs.statSync(target).size });
    } catch (error) {
      failures.push({ id: pac.id, reason: error.message });
    } finally {
      if (processed % 10 === 0 || processed === pacs.length) {
        process.stderr.write(`[aurora-progress] extract ${processed} ${pacs.length}\n`);
      }
    }
  }

  const manifest = {
    schema: 'aurora-forge-2k19-animation-intake/v1',
    generatedAt: new Date().toISOString(),
    gameRoot,
    outputRoot: outRoot,
    scope,
    counted: pacs.length,
    decoded: results.length,
    failed: failures.length,
    victory: results.filter((r) => r.kind === 'victory').length,
    entrance: results.filter((r) => r.kind === 'entrance').length,
    results,
    failures,
  };
  fs.writeFileSync(path.join(outRoot, 'aurora-2k19-animation-intake.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function usage() {
  return [
    'Usage:',
    '  node tools/extract-2k19-animations.js --game <WWE 2K19 folder> --out <decoded folder>',
    '       [--scope all|victory|entrance] [--oodle <oo2core_6_win64.dll>] [--helper <AuroraPac19Helper.exe>]',
    '',
    'Decodes pac\\evt victory/entrance motions into <out>/victory and <out>/entrance.',
  ].join('\n');
}

if (require.main === module) {
  try {
    const manifest = extractAnimations({
      game: arg(process.argv, '--game'),
      out: arg(process.argv, '--out'),
      scope: arg(process.argv, '--scope', 'all'),
      ids: arg(process.argv, '--ids', undefined),
      oodle: arg(process.argv, '--oodle', undefined),
      helper: arg(process.argv, '--helper', undefined),
    });
    console.log(JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error(`2K19 animation extraction failed: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

module.exports = { extractAnimations, inScope, pickBody };
