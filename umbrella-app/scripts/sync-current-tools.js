'use strict';
// Refresh generated app copies from canonical source before packaging.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repo = path.resolve(__dirname, '../..');
const records = [];
function copy(source, target) {
  const bytes = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) fs.writeFileSync(target, bytes);
  records.push({ source: path.relative(repo, source).replaceAll(path.sep, '/'), destination: path.relative(repo, target).replaceAll(path.sep, '/'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
function walk(relative) {
  const directory = path.join(repo, 'animation/tools', relative);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (!/^(bin|obj|node_modules|__pycache__|ghidra)$/.test(entry.name)) walk(rel);
    } else if (/\.(js|cjs|mjs|py|json)$/.test(entry.name) && !/hide-ctrl|hidectrldata|patreon/i.test(rel)) {
      copy(path.join(directory, entry.name), path.join(repo, 'umbrella-app/app/tools/entry-studio/tools', rel));
    }
  }
}
walk('');
for (const name of ['cak-reader.js', 'cak-v93-backend.js', 'archive-repackager.js', 'cak-v99-key.js']) {
  copy(path.join(repo, 'cak-foundry/electron', name), path.join(repo, 'umbrella-app/electron', name));
}
const receipt = path.join(repo, 'umbrella-app/app/data/current-tool-sources.json');
fs.writeFileSync(receipt, JSON.stringify({ schemaVersion: 1, records }, null, 2) + '\n');
console.log('Synchronized ' + records.length + ' current tool files');
