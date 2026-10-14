const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const staging = path.join(root, 'build', 'runtime-staging');

function remove(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest, skip) {
  if (!fs.existsSync(src)) throw new Error(`Missing source directory: ${src}`);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
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

remove(staging);
fs.mkdirSync(staging, { recursive: true });

copyDir(path.join(root, 'app'), path.join(staging, 'app'));
copyDir(path.join(root, 'electron'), path.join(staging, 'electron'));
copyDir(path.join(root, '..', 'animation', 'tools'), path.join(staging, 'app', 'tools', 'entry-studio', 'tools'), new Set(['__pycache__', 'ghidra']));

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

console.log('Runtime staging prepared: ' + staging);
