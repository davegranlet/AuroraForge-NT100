'use strict';

// End-user replacement package builder:
// 1. import decoded 2K19 motion into one record of a selected 2K25 .clips file;
// 2. stage that replacement at a WWE 2K25 virtual path in a minimal BakeMe tree;
// 3. bake and reopen-verify a separate mod .cak with Aurora CAK Foundry.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildReplacement } = require('./build-2k19-to-2k25-replace-clips');

const DEFAULT_FOUNDRY = path.resolve(__dirname, '..', '..', 'Aurora-CAK-Foundry');

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function normalizeVirtualPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) throw new Error('virtual path must be a relative WWE 2K25 asset path');
  if (!normalized.toLowerCase().endsWith('.clips')) throw new Error('virtual path must point to a .clips asset');
  return normalized;
}

function runFoundryBake(foundryRoot, bakeMeRoot, outputCak, extra = {}) {
  const script = path.join(foundryRoot, 'scripts', 'bake-v93-cli.js');
  if (!fs.existsSync(script)) throw new Error(`Foundry bake CLI is missing: ${script}`);
  const args = [script, '--source', bakeMeRoot, '--output', outputCak];
  if (extra.tool) args.push('--tool', extra.tool);
  if (extra.oodle) args.push('--oodle', extra.oodle);
  const result = spawnSync(process.execPath, args, {
    cwd: foundryRoot,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`Foundry bake failed:\n${result.stdout || ''}\n${result.stderr || ''}`.trim());
  }
  return JSON.parse(result.stdout);
}

function buildReplaceCak(options) {
  const outputCak = path.resolve(options.outputCak || '');
  const workRoot = path.resolve(options.workRoot || path.join(path.dirname(outputCak), `${path.basename(outputCak, '.cak')}-BakeMe`));
  const virtualPath = normalizeVirtualPath(options.virtualPath);
  const foundryRoot = path.resolve(options.foundryRoot || DEFAULT_FOUNDRY);
  if (!outputCak.toLowerCase().endsWith('.cak')) throw new Error('outputCak must end in .cak');
  if (fs.existsSync(outputCak)) throw new Error(`refusing to overwrite existing CAK: ${outputCak}`);
  if (fs.existsSync(workRoot)) throw new Error(`refusing to overwrite existing BakeMe folder: ${workRoot}`);

  const stagedClips = path.join(workRoot, ...virtualPath.split('/'));
  fs.mkdirSync(path.dirname(stagedClips), { recursive: true });
  const replace = buildReplacement({
    source19: options.source19,
    template25: options.template25,
    recordIndex: options.recordIndex ?? 'auto',
    output: stagedClips,
    legsStock: options.legsStock,
    gainPos: options.gainPos,
    gainRot: options.gainRot,
  });
  const manifest = {
    schema: 'aurora-forge-2k19-to-2k25-replace-cak/v1',
    generatedAt: new Date().toISOString(),
    virtualPath,
    workRoot,
    outputCak,
    replacement: replace,
    limits: [
      'This CAK is an overwrite/replace mod for an existing WWE 2K25 .clips asset path.',
      'It does not create a new menu/selectable entry.',
      'Final animation alignment and in-game behavior must still be tested with the loader.',
    ],
  };
  fs.writeFileSync(path.join(workRoot, 'aurora-replace-cak-proof.json'), JSON.stringify(manifest, null, 2));
  const bake = runFoundryBake(foundryRoot, workRoot, outputCak, { tool: options.tool, oodle: options.oodle });
  return { ...manifest, cak: bake };
}

function usage() {
  return [
    'Usage:',
    '  node tools/build-2k19-to-2k25-replace-cak.js --source19 <decoded-2k19.bin> --template25 <target-2k25.clips> --record <index> --virtual-path <Animation/.../file.clips> --out-cak <modded.cak> [--work-root <BakeMe>] [--foundry <Aurora-CAK-Foundry>]',
    '',
    'Creates a separate mod .cak for Aurora 2K25 loader overwrite testing.',
  ].join('\n');
}

if (require.main === module) {
  try {
    const result = buildReplaceCak({
      source19: arg(process.argv, '--source19'),
      template25: arg(process.argv, '--template25'),
      recordIndex: arg(process.argv, '--record', 'auto'),
      virtualPath: arg(process.argv, '--virtual-path'),
      outputCak: arg(process.argv, '--out-cak'),
      workRoot: arg(process.argv, '--work-root', undefined),
      foundryRoot: arg(process.argv, '--foundry', DEFAULT_FOUNDRY),
      tool: arg(process.argv, '--tool', undefined),
      oodle: arg(process.argv, '--oodle', undefined),
      legsStock: process.argv.includes('--legs-stock'),
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`2K25 replace CAK build failed: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  }
}

module.exports = { buildReplaceCak, normalizeVirtualPath };
