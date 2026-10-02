'use strict';

// Makes one known-good mod CAK the only active CAK in a WWE 2K25 mods folder.
// This is intentionally not a baker/rebuilder. It preserves the exact archive
// bytes and fails closed if the expected file hash is not present.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_GAME_ROOT = 'C:/WWE 2K25 Saturday Nights Main Event';
const DEFAULT_CAK = 'tribute-bake-test-sept19.cak';
const DEFAULT_SHA256 = 'CA5E5F6C229F268CCFB12D2E612E433FF19121946AFA79372585DFD48279100F';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex').toUpperCase();
}

function uniqueDestination(dir, name) {
  const parsed = path.parse(name);
  let candidate = path.join(dir, name);
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${parsed.name}.disabled-${suffix}${parsed.ext}`);
    suffix += 1;
  }
  return candidate;
}

function moveIfExists(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.renameSync(source, destination);
  return true;
}

function stageKnownGoodCak(options = {}) {
  const gameRoot = path.resolve(options.gameRoot || DEFAULT_GAME_ROOT);
  const modsRoot = path.resolve(options.modsRoot || path.join(gameRoot, 'mods'));
  const cakName = options.cakName || DEFAULT_CAK;
  const expectedHash = String(options.expectedHash || DEFAULT_SHA256).toUpperCase();
  const sourcePath = options.sourcePath ? path.resolve(options.sourcePath) : '';
  const disabledRoot = path.join(modsRoot, '_disabled-reference-caks');
  const activePath = path.join(modsRoot, cakName);
  const disabledPath = path.join(disabledRoot, cakName);

  if (!fs.existsSync(modsRoot)) throw new Error(`mods folder does not exist: ${modsRoot}`);
  fs.mkdirSync(disabledRoot, { recursive: true });

  if (!fs.existsSync(activePath)) {
    if (fs.existsSync(disabledPath)) {
      fs.renameSync(disabledPath, activePath);
    } else if (sourcePath && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, activePath);
    } else {
      throw new Error(`known-good CAK is missing: ${activePath}`);
    }
  }

  const actualHash = sha256(activePath);
  if (actualHash !== expectedHash) {
    throw new Error(`known-good CAK hash mismatch for ${activePath}: expected ${expectedHash}, saw ${actualHash}`);
  }

  const moved = [];
  for (const entry of fs.readdirSync(modsRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (entry.name === cakName) continue;
    if (lower.endsWith('.cak')) {
      const source = path.join(modsRoot, entry.name);
      const destination = uniqueDestination(disabledRoot, entry.name);
      fs.renameSync(source, destination);
      moved.push({ from: source, to: destination });
    }
  }

  const manifestPath = path.join(modsRoot, 'manifest.json');
  const manifestMoved = moveIfExists(manifestPath, uniqueDestination(disabledRoot, 'manifest.json'));

  return {
    gameRoot,
    modsRoot,
    activeCak: activePath,
    sha256: actualHash,
    movedConflicts: moved,
    manifestDisabled: manifestMoved,
  };
}

module.exports = { stageKnownGoodCak };

if (require.main === module) {
  try {
    const result = stageKnownGoodCak({
      gameRoot: arg('--game-root') || DEFAULT_GAME_ROOT,
      modsRoot: arg('--mods-root') || '',
      cakName: arg('--cak') || DEFAULT_CAK,
      expectedHash: arg('--sha256') || DEFAULT_SHA256,
      sourcePath: arg('--source') || '',
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
