const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const staging = path.join(root, 'build', 'runtime-staging');
if (process.env.AURORA_SKIP_TOOL_SYNC !== '1') {
  try {
    require('./sync-current-tools');
  } catch (error) {
    console.warn('WARN: current-tool sync failed, continuing with the existing receipt: ' + error.message);
  }
}
require('./prepare-tool-library');

function remove(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

const GENERATED_DIRS = new Set(['obj', 'bin', 'node_modules', 'target', '.vs', '__pycache__']);

function copyDir(src, dest, skip) {
  if (!fs.existsSync(src)) throw new Error(`Missing source directory: ${src}`);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || /^HideCtrlData\.hidelink\.jsfb$/i.test(entry.name)) continue;
    if (entry.isDirectory() && GENERATED_DIRS.has(entry.name)) continue;
    // The tool library is shipped as an extra resource (resources/sl) instead
    // of inside app.asar.unpacked so its short paths stay short on disk.
    if (path.resolve(src) === path.join(root, 'app', 'tools') && entry.name === 'sl') continue;
    // Free release: the retired standalone converter preview carries its own
    // Patreon gate, so it is not shipped. The in-app converter is canonical.
    if (path.resolve(src) === path.join(root, 'app', 'tools') && entry.name === 'animation-converter') continue;
    if (skip && skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to, skip);
    else fs.copyFileSync(from, to);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertNoProtectedAssets(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) assertNoProtectedAssets(full);
    else if (/^HideCtrlData\.hidelink\.jsfb$/i.test(entry.name)) {
      throw new Error(`Protected asset must not be staged: ${full}`);
    }
  }
}

remove(staging);
const library = path.join(root, 'build', 'library', 'sl');
remove(path.dirname(library));
fs.mkdirSync(staging, { recursive: true });

copyDir(path.join(root, 'app'), path.join(staging, 'app'));
copyDir(path.join(root, 'electron'), path.join(staging, 'electron'));
copyDir(path.join(root, 'app', 'tools', 'sl'), library);
copyDir(path.join(root, '..', 'animation', 'tools'), path.join(staging, 'app', 'tools', 'entry-studio', 'tools'), new Set(['__pycache__', 'ghidra', 'append-hide-ctrl-entry.js', 'append-hide-ctrl-entry.test.js']));

const foundrySource = [
  path.join(root, '..', 'cak-foundry'),
  path.join(root, '..', '..', 'cak-foundry')
].find((candidate) => fs.existsSync(path.join(candidate, 'scripts', 'bake-v93-cli.js')));
if (!foundrySource) throw new Error('CAK Foundry source was not found for the in-app converter bake');
const converterFoundry = path.join(staging, 'app', 'tools', 'converter-foundry');
fs.mkdirSync(path.join(converterFoundry, 'electron'), { recursive: true });
fs.mkdirSync(path.join(converterFoundry, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(foundrySource, 'electron', 'game-versions.js'), path.join(converterFoundry, 'electron', 'game-versions.js'));
fs.copyFileSync(path.join(foundrySource, 'scripts', 'bake-v93-cli.js'), path.join(converterFoundry, 'scripts', 'bake-v93-cli.js'));

const pkg = readJson(path.join(root, 'package.json'));
const runtimePackage = {
  name: pkg.name,
  productName: 'AuroraForge NT100',
  version: pkg.version,
  description: 'Portable runtime for AuroraForge NT100.',
  main: 'electron/main.js',
  private: true,
  license: pkg.license || 'UNLICENSED'
};

fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify(runtimePackage, null, 2) + '\n');

const runtimeReadme = [
  'AuroraForge NT100',
  'Portable runtime staging folder.',
  '',
  'Generated automatically for packaging the portable Windows or Linux app.'
].join('\n');

fs.writeFileSync(path.join(staging, 'README_RUNTIME_STAGING.txt'), runtimeReadme + '\n');

assertNoProtectedAssets(staging);

console.log('Runtime staging prepared: ' + staging);
