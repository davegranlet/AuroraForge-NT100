'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.join(__dirname, '..');
const project = path.join(root, 'third_party', 'Nenkai-Bakery', 'CakeTool', 'CakeTool.csproj');
const publish = path.join(root, 'build', 'cak-v93-publish');
const destination = path.join(root, 'app', 'tools', 'cak-v93');
const localSdk = path.join(root, '..', '_toolchains', 'dotnet9', 'dotnet.exe');
const dotnet = fs.existsSync(localSdk) ? localSdk : 'dotnet';

fs.rmSync(publish, { recursive: true, force: true });
const result = cp.spawnSync(dotnet, ['publish', project, '--configuration', 'Release', '--runtime', 'win-x64', '--self-contained', 'true', '--no-restore', '--output', publish], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
for (const entry of fs.readdirSync(publish, { withFileTypes: true })) {
  if (entry.isFile() && !/^oo2core_9_win64\.dll$/i.test(entry.name)) fs.copyFileSync(path.join(publish, entry.name), path.join(destination, entry.name));
}
// AURORA: publish native helper dirs too (crn2 texture decoder; oodle stays
// game-sourced per 9/16 convention and is restored separately).
for (const sub of ['Libraries']) {
  const from = path.join(publish, sub);
  if (fs.existsSync(from)) fs.cpSync(from, path.join(destination, sub), { recursive: true });
}
fs.copyFileSync(path.join(root, 'third_party', 'Nenkai-Bakery', 'LICENSE.txt'), path.join(destination, 'NENKAI-BAKERY-MIT-LICENSE.txt'));
fs.copyFileSync(path.join(root, 'third_party', 'Nenkai-Bakery', 'LICENSES', 'Crunch2', 'license.txt'), path.join(destination, 'CRUNCH2-LICENSE.txt'));
fs.copyFileSync(path.join(root, 'third_party', 'Nenkai-Bakery', 'AURORA-INTEGRATION-NOTICE.md'), path.join(destination, 'AURORA-INTEGRATION-NOTICE.md'));
console.log(`Built ${path.relative(root, destination)} without Oodle or game files.`);
