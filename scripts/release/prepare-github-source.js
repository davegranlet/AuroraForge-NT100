#!/usr/bin/env node
'use strict';
// Prepares a clean checkout from a reviewed source snapshot. Does not push.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const snapshot = path.resolve(process.argv[2] || '');
const allowed = path.join(root, '.local/source-release') + path.sep;
if (!snapshot.startsWith(allowed)) throw new Error('Select a source snapshot inside this repository');
const manifest = JSON.parse(fs.readFileSync(path.join(snapshot, 'manifest.private.json'), 'utf8'));
if (manifest.errors.length || manifest.holds.length || manifest.dependencyGaps.length) throw new Error('Snapshot has unresolved errors, secret holds or imports');
const checkout = path.join(root, '.local/publication/AuroraForge-NT100');
function git(args) {
  const result = cp.spawnSync('git', args, { cwd: checkout, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || 'git failed');
  return result.stdout.trim();
}
const refreshing = fs.existsSync(checkout);
if (refreshing && !process.argv.includes('--refresh')) throw new Error('Publication checkout already exists; inspect it before preparing again');
fs.mkdirSync(path.dirname(checkout), { recursive: true });
if (!refreshing) {
const clone = cp.spawnSync('git', ['clone', '--depth', '1', 'https://github.com/davegranlet/AuroraForge-NT100.git', checkout], { cwd: root, encoding: 'utf8', windowsHide: true });
if (clone.status !== 0) throw new Error(clone.stderr || 'Clone failed');
}
if (fs.realpathSync(checkout) !== checkout) throw new Error('Unexpected checkout target');
if (git(['remote', 'get-url', 'origin']) !== 'https://github.com/davegranlet/AuroraForge-NT100.git') throw new Error('Unexpected publication remote');
git(['rm', '-r', '-f', '--', '.']);
for (const file of manifest.included) {
  const source = path.join(snapshot, 'source', file.path);
  const bytes = fs.readFileSync(source);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Source snapshot changed: ' + file.path);
  const target = path.resolve(checkout, file.path);
  if (!target.startsWith(checkout + path.sep)) throw new Error('Snapshot path escape');
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
}
fs.copyFileSync(path.join(snapshot, 'source/SOURCE-SNAPSHOT.json'), path.join(checkout, 'SOURCE-SNAPSHOT.json'));
const approvedPaths = [...manifest.included.map(file => file.path), 'SOURCE-SNAPSHOT.json'];
for (let index = 0; index < approvedPaths.length; index += 50) git(['add', '-f', '--', ...approvedPaths.slice(index, index + 50)]);
console.log(JSON.stringify({ checkout, files: manifest.included.length, status: git(['diff', '--cached', '--stat']) }, null, 2));
