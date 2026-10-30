'use strict';
const fs = require('fs');
const path = require('path');
const asar = require(require.resolve('@electron/asar', { paths: [require.resolve('@electron/packager')] }));
const install = path.resolve(process.argv[2] || '.');
const app = path.resolve(__dirname, '../app');
const unpacked = path.join(install, 'resources/app.asar.unpacked/app/tools');
const runtimeNames = ['cak-v93', 'cak-helper', 'pac19-helper', 'texconv', 'wwe2k25-loader'];
let count = 0;
function copy(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || /HideCtrlData/i.test(entry.name)) continue;
    const source = path.join(from, entry.name), target = path.join(to, entry.name);
    if (entry.isDirectory()) copy(source, target);
    else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); count++; }
  }
}
if (!fs.existsSync(path.join(install, 'resources/app.asar'))) throw new Error('Select an unpacked Aurora Forge Workbench release folder');
for (const name of runtimeNames) {
  const from = path.join(unpacked, name);
  if (fs.existsSync(from)) copy(from, path.join(app, 'tools', name));
}
const archive = path.join(install, 'resources/app.asar');
for (const entry of asar.listPackage(archive)) {
  const relative = entry.replace(/^[/\\]/, '').replaceAll('\\', '/');
  if (!relative.startsWith('app/skeletons/') || /HideCtrlData/i.test(relative)) continue;
  const nativeEntry = relative.split('/').join(path.sep);
  const stat = asar.statFile(archive, nativeEntry);
  if (!stat.size) continue;
  const target = path.resolve(app, relative.slice(4));
  if (!target.startsWith(app + path.sep)) throw new Error('Archive path escape');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, asar.extractFile(archive, nativeEntry)); count++;
}
console.log('Restored ' + count + ' runtime files from the selected release.');
