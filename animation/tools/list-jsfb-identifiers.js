'use strict';

// Inventory JSFB container identifiers under a game extraction. Reads files
// only and reports paths, byte lengths, and the four-byte container tag.
const fs = require('node:fs');
const path = require('node:path');

function walk(root, rows = []) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) walk(full, rows);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.jsfb')) {
      const fd = fs.openSync(full, 'r');
      try {
        const header = Buffer.alloc(8);
        const n = fs.readSync(fd, header, 0, header.length, 0);
        if (n === 8) rows.push({ path: full, bytes: fs.statSync(full).size, identifier: header.toString('ascii', 4, 8) });
      } finally { fs.closeSync(fd); }
    }
  }
  return rows;
}

const root = process.argv[2];
if (!root) {
  console.error('Usage: node list-jsfb-identifiers.js <extraction-root> [out.json] [identifier]');
  process.exit(2);
}
const resolved = path.resolve(root);
if (!fs.statSync(resolved).isDirectory()) throw new Error(`not a directory: ${resolved}`);
const rows = walk(resolved);
const wanted = process.argv[4];
const filtered = wanted ? rows.filter(row => row.identifier === wanted) : rows;
const report = {
  schema: 'aurora-forge/jsfb-identifiers/v1',
  root: resolved,
  fileCount: rows.length,
  identifiers: Object.fromEntries([...rows.reduce((map, row) => map.set(row.identifier, (map.get(row.identifier) || 0) + 1), new Map())].sort((a, b) => a[0].localeCompare(b[0]))),
  filteredCount: filtered.length,
  files: filtered,
};
const output = process.argv[3];
if (output) fs.writeFileSync(path.resolve(output), `${JSON.stringify(report, null, 2)}\n`);
else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.stderr.write(`Indexed ${rows.length} JSFB files; ${filtered.length} match ${wanted || 'all identifiers'}\n`);
