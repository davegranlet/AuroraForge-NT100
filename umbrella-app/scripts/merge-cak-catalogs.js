'use strict';

const fs = require('fs');
const path = require('path');

const olderCatalog = path.resolve(process.argv[2] || '');
const currentCatalog = path.resolve(process.argv[3] || '');
const output = path.resolve(process.argv[4] || '');

for (const file of [olderCatalog, currentCatalog]) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error('Catalog file was not found: ' + file);
}
if (!output) throw new Error('Choose an output catalog path.');

const older = JSON.parse(fs.readFileSync(olderCatalog, 'utf8'));
const current = JSON.parse(fs.readFileSync(currentCatalog, 'utf8'));
let conflicts = 0;
for (const [hash, value] of Object.entries(current)) {
  if (older[hash] && older[hash] !== value) conflicts += 1;
}

// Exact WWE 2K26 extracted paths are authoritative when the same hash exists
// in both generations. Older confirmed paths remain useful for hashes that are
// not present in the current extraction.
const merged = { ...older, ...current };
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ older: Object.keys(older).length, current: Object.keys(current).length, conflicts, merged: Object.keys(sorted).length, output }, null, 2));
