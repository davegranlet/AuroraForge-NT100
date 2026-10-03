const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const staging = path.join(root, 'build', 'runtime-staging');
const markerPath = path.join(staging, 'owner-build.json');
let appName = 'AuroraForge NT100 Owner';
let packDir = path.join(root, 'dist', `${appName}-win32-x64`);
for (let n = 2; fs.existsSync(packDir); n++) {
  try { fs.rmSync(packDir, { recursive: true, force: true }); }
  catch (_error) {
    appName = `AuroraForge NT100 Owner ${n}`;
    packDir = path.join(root, 'dist', `${appName}-win32-x64`);
  }
}
const releaseDir = path.join(root, 'portable-release', 'Owner-Build');
const zipName = 'AuroraForge-NT100-Owner-2.0.f-Windows-x64.zip';
const zipPath = path.join(releaseDir, zipName);

function run(command, args, label) {
  let executable = command;
  let commandArgs = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(command)) {
    executable = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    commandArgs = ['/d', '/c', 'call', command, ...args];
  }
  console.log(`> ${label || [command, ...args].join(' ')}`);
  const result = cp.spawnSync(executable, commandArgs, { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label || command} exited with code ${result.status}`);
}

run(process.execPath, ['scripts/prepare-runtime-staging.js']);

const marker = {
  format: 'aurora-owner-build',
  product: 'AuroraForge NT100',
  release: '2.0.f',
  releaseTitle: 'Beta3',
  owner: true,
  generatedAt: new Date().toISOString(),
  note: 'Owner build: verification always returns logged in. This marker lives inside app.asar and must never ship in a public build.',
};

let packaged = false;
try {
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n', 'utf8');
  const packager = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-packager.cmd' : 'electron-packager');
  run(packager, ['build/runtime-staging', appName, '--platform=win32', '--arch=x64', '--out=dist', '--overwrite', '--asar.unpackDir=app/tools', '--icon=app/assets/img/app-icon.ico', '--app-version=2.0', '--build-version=2.0'], 'electron-packager (owner)');
  packaged = true;
} finally {
  fs.rmSync(markerPath, { force: true });
}
if (!packaged) throw new Error('Owner packaging failed; staging marker removed.');

const asarPath = path.join(packDir, 'resources', 'app.asar');
if (!fs.existsSync(asarPath)) throw new Error(`owner asar missing: ${asarPath}`);
let listed = '';
try {
  listed = cp.execFileSync(process.execPath, ['-e', 'console.log(require("@electron/asar").listPackage(process.argv[1]).join("\\n"))', asarPath], { cwd: root, encoding: 'utf8' });
} catch (error) {
  listed = '';
}
if (listed && !listed.includes('owner-build.json')) throw new Error('owner marker is NOT inside the packaged asar');
console.log(listed ? 'verified: owner-build.json is inside app.asar' : 'warning: could not list asar; marker presence unverified');

fs.mkdirSync(releaseDir, { recursive: true });
fs.rmSync(zipPath, { force: true });
run('tar', ['-a', '-c', '-f', zipPath, '-C', packDir, '.'], 'zip owner build');
if (!fs.existsSync(zipPath)) throw new Error(`owner zip was not created: ${zipPath}`);
console.log(`Owner build ready: ${packDir}`);
console.log(`Owner zip: ${zipPath}`);
