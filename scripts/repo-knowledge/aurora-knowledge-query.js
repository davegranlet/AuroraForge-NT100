'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const ROOT = path.resolve(args.length > 1 ? args[0] : REPO_ROOT);
const QUERY = String(args.length > 1 ? args[1] : (args[0] || '')).toLowerCase();
const DB = path.join(ROOT, '.local', 'repo-knowledge', 'aurora-file-audit.jsonl');

if (path.normalize(ROOT).toLowerCase() !== path.normalize(REPO_ROOT).toLowerCase()) {
  throw new Error(`Refusing to query outside the canonical repository: ${ROOT}`);
}

if (!QUERY) {
  console.error('Usage: node scripts/repo-knowledge/aurora-knowledge-query.js <file-or-term>');
  process.exit(2);
}
if (!fs.existsSync(DB)) {
  console.error(`Missing audit database: ${DB}`);
  process.exit(1);
}

const rows = fs.readFileSync(DB, 'utf8').split(/\r?\n/).filter(Boolean);
const hits = [];
for (const line of rows) {
  const rec = JSON.parse(line);
  const hay = `${rec.relPath}\n${rec.name}\n${rec.category}\n${rec.purpose}\n${(rec.tags || []).join(' ')}\n${(rec.relatedProjects || []).join(' ')}`.toLowerCase();
  if (hay.includes(QUERY)) hits.push(rec);
}

hits.sort((a, b) => {
  const an = a.name.toLowerCase() === QUERY ? 0 : a.name.toLowerCase().includes(QUERY) ? 1 : 2;
  const bn = b.name.toLowerCase() === QUERY ? 0 : b.name.toLowerCase().includes(QUERY) ? 1 : 2;
  return an - bn || b.mtime.localeCompare(a.mtime);
});

console.log(JSON.stringify({ query: QUERY, count: hits.length, hits: hits.slice(0, 100) }, null, 2));
