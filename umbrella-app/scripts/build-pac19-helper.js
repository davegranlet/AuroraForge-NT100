'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const project = path.join(root, 'tools', 'AuroraPac19Helper', 'AuroraPac19Helper.csproj');
const publish = path.join(root, 'build', 'pac19-helper-publish');
const destinationDir = path.join(root, 'app', 'tools', 'pac19-helper');
const destination = path.join(destinationDir, 'AuroraPac19Helper.exe');

fs.rmSync(publish, { recursive: true, force: true });
fs.mkdirSync(destinationDir, { recursive: true });
const result = cp.spawnSync('dotnet', ['publish', project, '--configuration', 'Release', '--runtime', 'win-x64', '--self-contained', 'true', '--output', publish], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const built = path.join(publish, 'AuroraPac19Helper.exe');
if (!fs.existsSync(built)) throw new Error('The WWE 2K19 PAC helper was not produced.');
fs.copyFileSync(built, destination);
fs.copyFileSync(path.join(root, 'tools', 'AuroraPac19Helper', 'THIRD-PARTY-NOTICES.md'), path.join(destinationDir, 'THIRD-PARTY-NOTICES.md'));
console.log(`Built ${path.relative(root, destination)}.`);
