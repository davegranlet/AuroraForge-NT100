'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, fnv1a64 } = require('../electron/cak-reader');

const csvPath = path.resolve(process.argv[2]);
const gameFolder = path.resolve(process.argv[3]);
const fileHashes = new Set();
const folderHashes = new Set();
for (const name of fs.readdirSync(gameFolder).filter((value) => /^bakedfile\d+\.cak$/i.test(value))) {
  const archive = openArchive(path.join(gameFolder, name), {});
  archive.files.forEach((item) => fileHashes.add(item.hash));
  archive.folders.forEach((item) => folderHashes.add(item.hash));
}
const stats = new Map();
const extStats = new Map();
for (const line of fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const match = /^(.*),([0-9a-fA-F]{16})$/.exec(line);
  if (!match) continue;
  const value = match[1].replace(/\\/g, '/');
  const exact = fnv1a64(value);
  const lower = fnv1a64(value.toLowerCase());
  const file = fileHashes.has(exact) || fileHashes.has(lower);
  const folder = folderHashes.has(exact) || folderHashes.has(lower);
  const top = value.split('/')[0] || '(root)';
  const ext = path.posix.extname(value).toLowerCase() || '(none)';
  for (const [map, key] of [[stats, top], [extStats, ext]]) {
    if (!map.has(key)) map.set(key, { rows: 0, file: 0, folder: 0, unmatched: 0 });
    const row = map.get(key);
    row.rows += 1;
    row.file += file ? 1 : 0;
    row.folder += folder ? 1 : 0;
    row.unmatched += !file && !folder ? 1 : 0;
  }
}
const sort = (map) => [...map].map(([name, value]) => ({ name, ...value, matchedPercent: Number(((value.rows - value.unmatched) * 100 / value.rows).toFixed(2)) })).sort((a, b) => b.rows - a.rows);
console.log(JSON.stringify({ top: sort(stats), extensions: sort(extStats).slice(0, 100) }, null, 2));
