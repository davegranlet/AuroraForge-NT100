'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, buildNameCandidates } = require('../electron/cak-reader');

const root = path.join(__dirname, '..');
const game26 = path.resolve(process.argv[2] || 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26');
const extracts25 = path.resolve(process.argv[3] || 'C:\\Games\\wwe-2k25-extracts\\Root');
const output = path.resolve(process.argv[4] || path.join(root, 'app', 'data', 'cak-known-paths.json'));

if (!fs.existsSync(game26) || !fs.statSync(game26).isDirectory()) throw new Error('WWE 2K26 game folder was not found: ' + game26);
if (!fs.existsSync(extracts25) || !fs.statSync(extracts25).isDirectory()) throw new Error('WWE 2K25 extracted Root folder was not found: ' + extracts25);

const archivePaths = fs.readdirSync(game26)
  .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
  .map((name) => path.join(game26, name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!archivePaths.length) throw new Error('No WWE 2K26 bakedfile*.cak archives were found.');

let dictionary = {};
try { dictionary = JSON.parse(fs.readFileSync(output, 'utf8')); } catch (_error) {}
const targetHashes = new Set();
const archiveStats = [];
for (const archivePath of archivePaths) {
  const archive = openArchive(archivePath, dictionary);
  for (const file of archive.files) if (file.hash) targetHashes.add(file.hash);
  for (const folder of archive.folders) if (folder.hash) targetHashes.add(folder.hash);
  archiveStats.push({ name: path.basename(archivePath), files: archive.files.length, folders: archive.folders.length });
}

const before = Object.keys(dictionary).length;
const matches = buildNameCandidates(extracts25, targetHashes);
for (const [hash, candidate] of Object.entries(matches)) {
  if (!dictionary[hash]) dictionary[hash] = candidate.replace(/^root\//i, '');
}
dictionary = Object.fromEntries(Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(dictionary, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  output,
  archives: archiveStats.length,
  targetHashes: targetHashes.size,
  before,
  matchedFromOlderExtraction: Object.keys(matches).length,
  added: Object.keys(dictionary).length - before,
  total: Object.keys(dictionary).length,
  archiveStats
}, null, 2));
