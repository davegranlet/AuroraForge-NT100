'use strict';

// Headless FDIR bake using the same backends as the desktop app.
// Native FTribTool handles FDIR 9.3 (WWE 2K25); the JS repackager handles FDIR 9.9 (WWE 2K26).
// Usage: node scripts/bake-v93-cli.js --source <folder> --output <file> [--game 2k25|2k26] [--version 9.3|9.9] [--engine auto|js|native]
const fs = require('fs');
const path = require('path');
const { buildCak, verifyCak } = require('../electron/cak-v93-backend');
const { bakeSettings } = require('../electron/game-versions');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const source = path.resolve(arg('--source'));
const output = path.resolve(arg('--output'));
const gameArg = (arg('--game') || '').trim();
let version = (arg('--version') || '').trim();
let engineArg = (arg('--engine') || '').trim().toLowerCase();
if (!version && gameArg) {
  const settings = bakeSettings(gameArg);
  if (!settings) throw new Error(`--game ${gameArg} has no CAK bake profile (bake targets: 2k25 -> 9.3/native, 2k26 -> 9.9/js).`);
  version = settings.fdirVersion;
  if (!engineArg) engineArg = settings.engine;
}
if (!version) version = '9.3';
if (!engineArg) engineArg = 'auto';
const tool = path.resolve(arg('--tool') || path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'FTribTool.exe'));
const oodle = arg('--oodle') ? path.resolve(arg('--oodle')) : path.join(__dirname, '..', 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');
const helper = arg('--helper') ? path.resolve(arg('--helper')) : path.join(__dirname, '..', 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');

if (!source || !output || source === path.resolve('.') || !fs.existsSync(source)) {
  throw new Error('Usage: node scripts/bake-v93-cli.js --source <folder> --output <file> [--game 2k25|2k26] [--version 9.3|9.9] [--engine auto|js|native] [--tool <FTribTool>] [--oodle <oo2core_9_win64.dll>] [--helper <AuroraCakHelper.exe>]');
}
fs.mkdirSync(path.dirname(output), { recursive: true });

const engine = engineArg === 'auto' ? (version.startsWith('9.9') ? 'js' : 'native') : engineArg;
if (engine === 'js') {
  const repackager = require('../electron/archive-repackager');
  const result = repackager.buildCak(source, output, {
    oodlePath: fs.existsSync(oodle) ? oodle : undefined,
    helperPath: fs.existsSync(helper) ? helper : undefined,
  });
  console.log(JSON.stringify({ output, source, engine: 'js', version: '9.9', ...result }, null, 2));
} else {
  if (!fs.existsSync(tool)) throw new Error(`FDIR 9.3 backend not found: ${tool}. Run npm run build:v93 or pass --tool.`);
  buildCak(source, output, tool, oodle);
  const verification = verifyCak(output, source, tool, oodle);
  console.log(JSON.stringify({ output, source, engine: 'native', version: '9.3', ...verification }, null, 2));
}
