const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' ? 'cmd.exe' : undefined }).trim(); }
  catch (error) { return ''; }
}

function ok(label, value) { console.log('OK  ' + label + (value ? ': ' + value : '')); }
function warn(label, value) { console.log('WARN ' + label + (value ? ': ' + value : '')); }

const root = path.join(__dirname, '..');
const nodeVersion = process.version;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmVersion = run(npmCmd + ' -v');
const npmRegistry = run(npmCmd + ' config get registry');

ok('Node detected', nodeVersion);
ok('npm detected', npmVersion || 'unknown');
ok('npm registry', npmRegistry || 'unknown');
if (npmRegistry && npmRegistry !== 'https://registry.npmjs.org/') warn('npm registry should be public npm for this builder', npmRegistry);

const major = Number(String(nodeVersion).replace(/^v/, '').split('.')[0]);
if (major < 20) warn('Node version', 'Node 20+ LTS is recommended for current Electron tooling.');
else ok('Node version is suitable');

if (fs.existsSync(path.join(root, 'package-lock.json'))) ok('package-lock exists', 'repeatable npm ci enabled');
else warn('package-lock missing');

if (fs.existsSync(path.join(root, 'node_modules'))) {
  ok('node_modules exists', 'build dependencies appear installed');
} else {
  warn('node_modules missing', 'this is normal before the first portable build');
}

console.log('\nPortable build steps:');
console.log('1. Run BUILD_TRUE_PORTABLE_WINDOWS.bat');
console.log('2. Open portable-release/');
console.log('3. Use Aurora-Forge-1.5.1-Portable-Windows.zip as the normal app release');
console.log('\nNormal app users should run the EXE from the final portable ZIP, not npm.');
