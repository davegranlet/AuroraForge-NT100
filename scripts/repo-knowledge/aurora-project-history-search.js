'use strict';

// Search Aurora Forge's prior notes, test reports, receipts, logs, and source
// directly before proposing or repeating an investigation. This is an
// Aurora-owned, read-only tool; it never invokes external search programs.
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const IGNORED_DIRS = new Set(['.git', '.tools', 'node_modules', 'third_party', 'obj', 'bin']);
const TEXT_EXTS = new Set([
  '.md', '.txt', '.json', '.jsonl', '.csv', '.tsv', '.log', '.out', '.err',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.c', '.cc', '.cpp', '.h',
  '.hpp', '.cs', '.py', '.ps1', '.java', '.xml', '.yml', '.yaml', '.ini',
  '.html', '.css', '.toml', '.sh', '.bat', '.cmd'
]);
const HISTORY_EXTS = new Set(['.md', '.txt', '.json', '.jsonl', '.csv', '.tsv', '.log', '.out', '.err', '.xml', '.yml', '.yaml', '.ini']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function usage() {
  console.error('Usage: node scripts/repo-knowledge/aurora-project-history-search.js <query> [--limit N] [--area path-fragment]');
  console.error('Searches prior project history. All query terms must occur in a file; exact phrase matches rank first.');
  process.exit(2);
}

const argv = process.argv.slice(2);
const query = argv.find(x => !x.startsWith('--'));
if (!query || !query.trim()) usage();

let limit = 20;
let area = '';
let allText = false;
let includeLocal = true;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--limit') {
    const n = Number(argv[++i]);
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error('--limit must be an integer from 1 to 100');
    limit = n;
  } else if (argv[i] === '--area') {
    area = String(argv[++i] || '').replace(/\\/g, '/').toLowerCase();
  } else if (argv[i] === '--all') {
    allText = true;
  } else if (argv[i] === '--canonical-only') {
    includeLocal = false;
  }
}

const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [])];
if (!terms.length) usage();
const exact = query.toLowerCase().trim();
const hits = [];
let filesScanned = 0;
let filesSkippedLarge = 0;
let readErrors = 0;

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { readErrors++; return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name.toLowerCase())) continue;
      const fullLower = path.resolve(full).toLowerCase();
      if (!includeLocal && fullLower === path.join(REPO_ROOT, '.local').toLowerCase()) continue;
      if (fullLower === path.join(REPO_ROOT, '.local', 'repo-knowledge').toLowerCase()) continue;
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!entry.isFile() || !(allText ? TEXT_EXTS.has(ext) : HISTORY_EXTS.has(ext))) continue;
    const relPath = path.relative(REPO_ROOT, full).replace(/\\/g, '/');
    if (area && !relPath.toLowerCase().includes(area)) continue;
    let st;
    try { st = fs.statSync(full); } catch { readErrors++; continue; }
    if (st.size > MAX_FILE_BYTES) { filesSkippedLarge++; continue; }
    let text;
    try { text = fs.readFileSync(full, 'utf8'); } catch { readErrors++; continue; }
    filesScanned++;
    const lower = text.toLowerCase();
    const docTerms = new Set(lower.match(/[\p{L}\p{N}_]+/gu) || []);
    if (terms.some(term => !docTerms.has(term))) continue;

    const exactPos = lower.indexOf(exact);
    let score = 10 + terms.length * 2;
    if (exactPos >= 0) score += 100;
    if (relPath.toLowerCase().includes('project-test-history')) score += 16;
    if (/continuation|handoff|result|report|staging|restore|test/i.test(path.basename(relPath))) score += 8;
    if (relPath.startsWith('umbrella-app/app/tools/sl/')) score -= 6;

    const lines = text.split(/\r?\n/);
    const matchingLines = [];
    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const lineLower = lines[lineNo].toLowerCase();
      const lineTerms = new Set(lineLower.match(/[\p{L}\p{N}_]+/gu) || []);
      const matchedTerms = terms.filter(term => lineTerms.has(term));
      if (matchedTerms.length) {
        const excerpt = lines[lineNo].trim().replace(/\s+/g, ' ');
        if (excerpt) matchingLines.push({ line: lineNo + 1, terms: matchedTerms.length, text: excerpt.slice(0, 360) });
      }
    }
    const chronological = /CONTINUATION\.current\.md$/i.test(relPath);
    matchingLines.sort((a, b) => b.terms - a.terms || (chronological ? b.line - a.line : a.line - b.line));
    hits.push({ path: relPath, score, exactPhrase: exactPos >= 0, matchingLines: matchingLines.slice(0, 4) });
  }
}

if (path.resolve(REPO_ROOT) !== path.resolve(__dirname, '../..')) throw new Error('Invalid repository root');
walk(REPO_ROOT);
hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
console.log(JSON.stringify({
  query,
  terms,
  area: area || null,
  corpus: `${allText ? 'history and source text' : 'history, reports, receipts, logs, and documentation'}${includeLocal ? ' including local historical files (excluding generated knowledge index)' : ' in canonical project files only'}`,
  filesScanned,
  filesSkippedLarge,
  readErrors,
  count: hits.length,
  hits: hits.slice(0, limit)
}, null, 2));
