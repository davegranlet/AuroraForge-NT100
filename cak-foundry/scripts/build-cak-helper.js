'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const project = path.join(root, 'tools', 'AuroraCakHelper', 'AuroraCakHelper.csproj');
const publish = path.join(root, 'build', 'cak-helper-publish');
const destination = path.join(root, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');

fs.rmSync(publish, { recursive: true, force: true });
const result = cp.spawnSync('dotnet', ['publish', project, '--configuration', 'Release', '--runtime', 'win-x64', '--self-contained', 'true', '--output', publish], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const built = path.join(publish, 'AuroraCakHelper.exe');
if (!fs.existsSync(built)) throw new Error('The Aurora Forge CAK helper was not produced.');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(built, destination);
console.log(`Built ${path.relative(root, destination)} from the public Aurora Forge source project.`);
