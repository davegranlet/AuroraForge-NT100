const assert = require('assert');
const crypto = require('crypto');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bundle = path.join(root, 'installer', 'loader-bundle');
const manifestPath = path.join(bundle, 'manifest.json');
const helper = path.join(root, 'scripts', 'install-game-loaders.ps1');
const fixture = path.join(root, 'build', 'installer-verification');
const game = path.join(fixture, 'game');
const state = path.join(fixture, 'state');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function run(mode, extra = []) {
  const result = cp.spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', helper, '-Mode', mode, '-GameDirectory', game,
    '-StateDirectory', state, '-AllowGameRunning', ...extra
  ], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`${mode} failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`;
}

assert(fs.existsSync(manifestPath), 'Run npm run prepare:installer before verification.');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.schema, 'aurora-forge-installer-loader-bundle-v1');
assert.deepStrictEqual(manifest.files.map((item) => item.relativePath), [
  'dinput8.dll',
  'plugins/AuroraForge.CAKModLoader.ftrib',
  'plugins/AuroraForge.CustomMusicLoader.ftrib'
]);
for (const item of manifest.files) {
  const file = path.join(bundle, ...item.relativePath.split('/'));
  assert(fs.statSync(file).isFile());
  assert.strictEqual(fs.statSync(file).size, item.size);
  assert.strictEqual(sha256(file), item.sha256);
}

fs.rmSync(fixture, { recursive: true, force: true });
fs.mkdirSync(path.join(game, 'plugins'), { recursive: true });
fs.mkdirSync(path.join(game, 'mods'), { recursive: true });
fs.writeFileSync(path.join(game, 'WWE2K26_x64.exe'), 'offline installer fixture');
fs.writeFileSync(path.join(game, 'dinput8.dll'), 'previous loader');
fs.writeFileSync(path.join(game, 'plugins', 'AuroraForge.CAKModLoader.ftrib'), 'previous cak addon');
fs.writeFileSync(path.join(game, 'mods', 'manifest.json'), '{"owner":"preserve"}\n');
const oldDll = sha256(path.join(game, 'dinput8.dll'));
const oldCakAddon = sha256(path.join(game, 'plugins', 'AuroraForge.CAKModLoader.ftrib'));
const ownerManifest = fs.readFileSync(path.join(game, 'mods', 'manifest.json'), 'utf8');

run('Verify', ['-BundleDirectory', bundle]);
run('Install', ['-BundleDirectory', bundle]);
for (const item of manifest.files) {
  assert.strictEqual(sha256(path.join(game, ...item.relativePath.split('/'))), item.sha256);
}
assert.strictEqual(fs.readFileSync(path.join(game, 'mods', 'manifest.json'), 'utf8'), ownerManifest);
assert(fs.statSync(path.join(game, 'sound')).isDirectory());

const customMusic = path.join(game, 'plugins', 'AuroraForge.CustomMusicLoader.ftrib');
fs.writeFileSync(customMusic, 'user changed this after install');
const changedMusic = sha256(customMusic);
run('Uninstall');
assert.strictEqual(sha256(path.join(game, 'dinput8.dll')), oldDll);
assert.strictEqual(sha256(path.join(game, 'plugins', 'AuroraForge.CAKModLoader.ftrib')), oldCakAddon);
assert.strictEqual(sha256(customMusic), changedMusic, 'Uninstall must preserve user-modified installed files.');
assert.strictEqual(fs.readFileSync(path.join(game, 'mods', 'manifest.json'), 'utf8'), ownerManifest);

console.log('Installer verification passed: bundle hashes, transactional install, rollback, and owner-file preservation.');
