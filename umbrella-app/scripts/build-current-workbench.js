'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const { packager } = require('@electron/packager');
async function main() {
  require('./prepare-runtime-staging');
  const staging = path.join(root, 'build/runtime-staging');
  const pkgPath = path.join(staging, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.main = 'electron/workbench-main.js';
  pkg.version = '3.0.0-preview.2';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  const verify = cp.spawnSync(process.execPath, [path.join(root, 'scripts/verify-package.js')], { cwd: root, encoding: 'utf8' });
  const log = path.join(root, 'build/workbench-package-verification.txt');
  fs.writeFileSync(log, verify.stdout + verify.stderr);
  if (verify.status !== 0) throw new Error('Source package checks failed; see ' + log);
  const toolVerify = cp.spawnSync(process.execPath, [path.join(root, 'scripts/verify-tool-library.js')], { cwd: root, encoding: 'utf8' });
  fs.writeFileSync(path.join(root, 'build/workbench-tool-verification.txt'), toolVerify.stdout + toolVerify.stderr);
  if (toolVerify.status !== 0) throw new Error('Tool library checks failed');
  const temp = path.join(root, 'build/packager-tmp');
  fs.mkdirSync(temp, { recursive: true });
  // Staging is already curated. Preserve lockfiles inside the complete source
  // library; Packager's default ignore list drops them at every depth.
  const outputs = await packager({ dir: staging, name: 'Aurora Forge Workbench', platform: 'win32', arch: 'x64', out: path.join(root, 'dist/current-workbench'), tmpdir: temp, overwrite: true, ignore: () => false, asar: { unpackDir: 'app/tools' }, extraResource: [path.join(root, 'build/library/sl')], appVersion: pkg.version, executableName: 'AuroraForge', icon: path.join(root, 'app/assets/img/app-icon.ico') });
  for (const script of ['verify-current-workbench-artifact.js', 'verify-packaged-workbench.js']) {
    const checked = cp.spawnSync(process.execPath, [path.join(root, 'scripts', script)], { cwd: root, encoding: 'utf8' });
    fs.writeFileSync(path.join(root, 'build', script + '.txt'), checked.stdout + checked.stderr);
    if (checked.status !== 0) throw new Error(script + ' failed; see build/' + script + '.txt');
  }
  const sourceState = JSON.parse(fs.readFileSync(path.join(root, 'build/current-workbench-source.json'), 'utf8'));
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(sourceState.snapshot, 'source/SOURCE-SNAPSHOT.json'))).digest('hex').slice(0, 12);
  const zip = path.join(root, 'portable-release/current-workbench', 'AuroraForge-Workbench-' + pkg.version + '-' + sourceHash + '-Windows-x64.zip');
  const zipped = cp.spawnSync('powershell.exe', ['-NoProfile', '-File', path.join(root, 'scripts/create-workbench-zip.ps1'), '-AppFolder', outputs[0], '-ZipPath', zip], { cwd: root, encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(path.join(root, 'build/workbench-zip.txt'), zipped.stdout + zipped.stderr);
  if (zipped.status !== 0) throw new Error('ZIP creation failed; see build/workbench-zip.txt');
  console.log(JSON.stringify({ version: pkg.version, outputs, zip }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
