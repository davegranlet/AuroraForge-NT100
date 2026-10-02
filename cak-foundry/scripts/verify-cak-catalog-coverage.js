'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive } = require('../electron/cak-reader');

const gameFolder = path.resolve(process.argv[2] || '');
const catalogPath = path.resolve(process.argv[3] || '');
if (!fs.existsSync(gameFolder) || !fs.statSync(gameFolder).isDirectory()) throw new Error('Game folder was not found.');
if (!fs.existsSync(catalogPath) || !fs.statSync(catalogPath).isFile()) throw new Error('Catalog was not found.');
const dictionary = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const archives = fs.readdirSync(gameFolder)
  .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const results = [];
let files = 0;
let named = 0;
let unresolved = 0;
let metadataReferences = 0;
for (const name of archives) {
  const session = openArchive(path.join(gameFolder, name), dictionary);
  const payloads = session.files.filter((file) => file.extractable && file.expandedSize > 0);
  const resolved = payloads.filter((file) => file.nameResolved).length;
  const references = session.files.length - payloads.length;
  results.push({ archive: name, payloads: payloads.length, named: resolved, unresolved: payloads.length - resolved, metadataReferences: references });
  files += payloads.length;
  named += resolved;
  unresolved += payloads.length - resolved;
  metadataReferences += references;
}
console.log(JSON.stringify({ catalogEntries: Object.keys(dictionary).length, archives: archives.length, payloads: files, named, unresolved, metadataReferences, coveragePercent: files ? Number((named * 100 / files).toFixed(4)) : 0, results }, null, 2));
