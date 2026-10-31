const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const appFolder = path.join(root, 'dist', 'AuroraForge NT100-linux-x64');
const releaseDir = path.join(root, 'portable-release');
const archiveName = 'AuroraForge-NT100-2.1.5-Linux-x64.tar.gz';
const archivePath = path.join(releaseDir, archiveName);

function run(command, args) {
  let executable = command;
  let commandArgs = args;
  if (process.platform === 'win32' && /\.cmd$/i.test(command)) {
    executable = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    commandArgs = ['/d', '/c', 'call', command, ...args];
  }
  const result = cp.spawnSync(executable, commandArgs, { cwd: root, encoding: 'utf8', shell: false, windowsHide: true, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

run(process.execPath, ['scripts/prepare-runtime-staging.js']);
const packager = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-packager.cmd' : 'electron-packager');
run(packager, ['build/runtime-staging', 'AuroraForge NT100', '--platform=linux', '--arch=x64', '--out=dist', '--overwrite', '--asar.unpackDir=app/tools', '--icon=app/assets/img/app-icon-256.png', '--app-version=2.1.5', '--build-version=2.1.5', '--extra-resource=build/library/sl']);

const readme = [
  'AuroraForge NT100 2.1.5 (Beta 4) - Native Linux x64', '',
  'Run:', '  ./AuroraForge\\ NT100', '',
  'If your file manager removed the executable permission:', '  chmod +x "AuroraForge NT100"', '',
  'VPS/headless hosts without a GPU: the app starts in software rendering automatically.',
  'Set AURORA_FORGE_GPU=1 to force hardware acceleration back on (desktop Linux with a GPU).', '',
  'AuroraForge NT100 is a WWE 2K26 prompt generator and workflow-preparation workspace.',
  'It builds prompts and handoff packs for the compatible AI tool you choose.', '',
  'Linux-native capabilities include prompt builders, prompt review/export, projects, setup, references, validation guidance, and CAK catalog browsing/search.',
  'Windows-only pieces are allowed as user-provided helpers, but they are not bundled as Linux-native binaries. That includes DirectXTex texconv.exe, AuroraCakHelper.exe, AuroraPac19Helper.exe, WWE/Oodle DLLs, dinput8.dll loaders, and Windows-only converter EXEs.',
  'When one of those helpers is missing or cannot run on Linux, AuroraForge NT100 should keep the rest of the app available and show the helper as unavailable instead of failing the app.',
  'Full game injection/loading remains a Windows game workflow. Use the Linux app for planning, project work, catalog/search/reference tasks, and helper-backed workflows when you provide a compatible runtime such as Wine/Proton.',
  'No prompt is sent to an AI provider automatically.'
].join('\n');
fs.writeFileSync(path.join(appFolder, 'README_LINUX.txt'), readme + '\n', 'utf8');
fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(archivePath)) fs.rmSync(archivePath, { force: true });

if (process.platform === 'win32') {
  run('python', ['scripts/create-linux-archive.py', appFolder, archivePath]);
} else {
  run('tar', ['-czf', archivePath, '-C', appFolder, '.']);
}
const hash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
fs.writeFileSync(archivePath + '.sha256.txt', `${hash}  ${archiveName}\n`, 'ascii');
console.log(`Linux archive created: ${archivePath}`);
console.log(`SHA-256: ${hash}`);
