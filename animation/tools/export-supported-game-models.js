'use strict';

// Export model-related files from a user-selected extracted game/root folder.
// This intentionally does not scan installed drives, unpack CAKs, or convert
// model formats. It copies known model/skeleton/material/texture-adjacent assets
// into a user-chosen folder while preserving relative paths.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SUPPORTED_GAMES = new Set(['2k19', '2k20', '2k22', '2k23', '2k24', '2k25', '2k26']);
const MODEL_EXTENSIONS = new Set([
  '.yobj', '.jboy', '.wdf', '.mcd', '.mtls', '.hkt', '.hkx', '.skel', '.mesh', '.mdl',
  '.tex', '.dds', '.mskinfo', '.jsfb', '.prp', '.bngt', '.gbf', '.sdb'
]);
const MODEL_PATH_HINTS = [
  'model', 'models', 'character', 'characters', 'chara', 'superstar', 'skeleton', 'skeletons',
  'material', 'materials', 'texture', 'textures', 'hair', 'face', 'body', 'attire', 'belt', 'prop', 'arena'
];

function sha256(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex').toUpperCase();
}

function normalizeGame(value) {
  const game = String(value || '').toLowerCase().replace(/\s+/g, '');
  if (!SUPPORTED_GAMES.has(game)) throw new Error(`unsupported game: ${value}`);
  return game;
}

function isModelCandidate(relative) {
  const lower = relative.replace(/\\/g, '/').toLowerCase();
  const ext = path.extname(lower);
  if (!MODEL_EXTENSIONS.has(ext)) return false;
  if (['.tex', '.dds', '.jsfb', '.sdb'].includes(ext)) {
    return MODEL_PATH_HINTS.some(hint => lower.includes(hint));
  }
  return true;
}

function walk(root, current = root, output = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, full, output);
    else if (entry.isFile()) output.push(path.relative(root, full).replace(/\\/g, '/'));
  }
  return output;
}

function exportModels(options) {
  const game = normalizeGame(options.game);
  const sourceRoot = path.resolve(options.sourceRoot || '');
  const outputRoot = path.resolve(options.outputRoot || '');
  if (!fs.existsSync(sourceRoot) || !fs.statSync(sourceRoot).isDirectory()) throw new Error(`sourceRoot is not a directory: ${sourceRoot}`);
  if (fs.existsSync(outputRoot) && !fs.statSync(outputRoot).isDirectory()) throw new Error(`outputRoot exists but is not a directory: ${outputRoot}`);
  fs.mkdirSync(outputRoot, { recursive: true });

  const copied = [];
  const skipped = [];
  for (const relative of walk(sourceRoot)) {
    if (!isModelCandidate(relative)) {
      skipped.push(relative);
      continue;
    }
    const src = path.join(sourceRoot, ...relative.split('/'));
    const dst = path.join(outputRoot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    const stat = fs.statSync(dst);
    copied.push({ relative, bytes: stat.size, sha256: sha256(dst) });
  }

  const manifest = {
    schema: 'aurora-forge-model-export/v1',
    generatedAt: new Date().toISOString(),
    game,
    sourceRoot,
    outputRoot,
    copiedCount: copied.length,
    skippedCount: skipped.length,
    copied,
    limits: [
      'Copies model-related files from an already extracted/user-selected folder; it does not unpack CAK/PAC archives.',
      'Preserves relative paths and bytes; it does not convert formats.',
      'Supported game selection controls labeling/filtering only; source folder contents remain user responsibility.',
    ],
  };
  fs.writeFileSync(path.join(outputRoot, 'aurora-model-export-manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

if (require.main === module) {
  try {
    const result = exportModels({
      game: arg(process.argv, '--game'),
      sourceRoot: arg(process.argv, '--source-root'),
      outputRoot: arg(process.argv, '--output-root'),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`model export failed: ${error.message}\n\nUsage: node tools/export-supported-game-models.js --game <2k19|2k20|2k22|2k23|2k24|2k25|2k26> --source-root <folder> --output-root <folder>`);
    process.exitCode = 1;
  }
}

module.exports = { exportModels, isModelCandidate, normalizeGame };
