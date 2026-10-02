#!/usr/bin/env node
'use strict';
// Aurora MD Search — quick CLI reference over every .md file in C:\AuroraForge-Aug26.
// For the assistant (and anyone) to look up any knowledge without re-reading the tree.
//
// Usage:
//   node mdsearch.js build                     (re)build index.json from all md files
//   node mdsearch.js search <terms...>         ranked full-text search with snippets
//   node mdsearch.js grep <regex>              raw regex over lines
//   node mdsearch.js headings <pathPart>       list headings of matching files
//   node mdsearch.js show <pathPart>           print a file (first match by path)
//   node mdsearch.js list [pathPart]           list indexed files
//
// Index: index.json next to this script: [{ path, rel, bytes, mtime, headings[], text }]

const fs = require('node:fs');
const path = require('node:path');

const ROOT = 'C:\\AuroraForge-Aug26';
const HERE = __dirname;
const INDEX = path.join(HERE, 'index.json');
const EXCLUDE = /node_modules|\\\.git($|\\)|\\\.tools\\|\\temp\\|\\\.aider\.tags\.cache|\\_tools-cache\\|\\_md-search\\|\\latest\\|\\Aurora Forge Sept 20\\|\\_archive\\|\\_worktrees\\|\\_research\\|\\_toolchains\\|\\_tools\\|\\AuroraForge-Beta2\\|\\Owner-Build-Beta1\.0\.0c\\|\\local-release-archive\\|\\external-source-imports\\|\\wwnames\\|\\build-logs\\/i;
const EXTENSIONS = new Set(['.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.ts', '.py', '.ps1', '.c', '.h', '.cs', '.xml', '.yml', '.yaml', '.html', '.csv', '.tsv', '.bat']);
const MAX_BYTES = 2 * 1024 * 1024;

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (EXCLUDE.test(full)) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase()) && !/(package-lock|yarn\.lock|pnpm-lock)/i.test(entry.name)) out.push(full);
  }
  return out;
}

function build() {
  const files = walk(ROOT);
  const byHash = new Map();
  for (const file of files) {
    let text;
    try {
      if (fs.statSync(file).size > MAX_BYTES) continue;
      text = fs.readFileSync(file, 'utf8');
    } catch { continue; }
    if (text.includes('\u0000')) continue;
    const crypto = require('node:crypto');
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const stat = fs.statSync(file);
    const prior = byHash.get(hash);
    if (!prior || stat.mtimeMs > prior.mtimeMs) {
      const headings = [...text.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1].trim()).slice(0, 200);
      byHash.set(hash, {
        path: file,
        rel: path.relative(ROOT, file),
        bytes: stat.size,
        mtime: stat.mtime.toISOString().slice(0, 16),
        mtimeMs: stat.mtimeMs,
        headings,
        text,
      });
    }
  }
  const docs = [...byHash.values()].map(({ mtimeMs, ...rest }) => rest);
  fs.writeFileSync(INDEX, JSON.stringify(docs));
  console.log(JSON.stringify({ indexed: docs.length, uniqueOf: files.length, bytes: docs.reduce((s, d) => s + d.bytes, 0), index: INDEX }));
}

function load() {
  if (!fs.existsSync(INDEX)) { console.error('no index; run: node mdsearch.js build'); process.exit(2); }
  return JSON.parse(fs.readFileSync(INDEX, 'utf8'));
}

function snippet(text, index, length = 160) {
  const start = Math.max(0, index - 60);
  return text.slice(start, start + length).replace(/\s+/g, ' ').trim();
}

function search(args) {
  const docs = load();
  const terms = args.filter((a) => !a.startsWith('--')).map((t) => t.toLowerCase());
  const limit = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : 15; })();
  const inPath = (() => { const i = args.indexOf('--in'); return i >= 0 ? args[i + 1].toLowerCase() : null; })();
  if (!terms.length) { console.error('usage: search <terms...> [--in pathPart] [--limit N]'); process.exit(2); }
  const results = [];
  for (const doc of docs) {
    if (inPath && !doc.rel.toLowerCase().includes(inPath)) continue;
    const haystack = doc.text.toLowerCase();
    let score = 0;
    let firstAt = -1;
    let all = true;
    for (const term of terms) {
      const at = haystack.indexOf(term);
      if (at < 0) { all = false; break; }
      score += 10;
      if (firstAt < 0 || at < firstAt) firstAt = at;
      // heading bonus
      if (doc.headings.some((h) => h.toLowerCase().includes(term))) score += 25;
      // title-ish bonus (first 200 chars)
      if (haystack.slice(0, 200).includes(term)) score += 15;
    }
    if (!all) continue;
    score += Math.max(0, 20 - Math.floor(doc.bytes / 50000)); // small files rank higher
    results.push({ doc, score, at: firstAt });
  }
  results.sort((a, b) => b.score - a.score || a.doc.rel.localeCompare(b.doc.rel));
  for (const r of results.slice(0, limit)) {
    console.log(`\n[${r.score}] ${r.doc.rel}  (${r.doc.bytes}B, ${r.doc.mtime})`);
    console.log('   ' + snippet(r.doc.text, r.at));
  }
  console.log(`\n${results.length} matching docs (showing ${Math.min(limit, results.length)})`);
}

function grep(args) {
  const docs = load();
  const pattern = args.find((a) => !a.startsWith('--'));
  if (!pattern) { console.error('usage: grep <regex> [--in pathPart] [--limit N]'); process.exit(2); }
  const re = new RegExp(pattern, 'i');
  const inPath = (() => { const i = args.indexOf('--in'); return i >= 0 ? args[i + 1].toLowerCase() : null; })();
  const limit = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : 40; })();
  let shown = 0;
  for (const doc of docs) {
    if (inPath && !doc.rel.toLowerCase().includes(inPath)) continue;
    const lines = doc.text.split(/\r?\n/);
    for (let n = 0; n < lines.length; n++) {
      if (re.test(lines[n])) {
        console.log(`${doc.rel}:${n + 1}: ${lines[n].trim().slice(0, 220)}`);
        if (++shown >= limit) { console.log('... (limit reached)'); return; }
      }
    }
  }
  console.log(`\n${shown} line hits`);
}

function headings(args) {
  const docs = load();
  const part = (args[0] || '').toLowerCase();
  for (const doc of docs) {
    if (!doc.rel.toLowerCase().includes(part)) continue;
    console.log(`\n${doc.rel} (${doc.bytes}B)`);
    for (const h of doc.headings.slice(0, 60)) console.log('  - ' + h);
  }
}

function show(args) {
  const docs = load();
  const part = (args[0] || '').toLowerCase();
  const doc = docs.find((d) => d.rel.toLowerCase().includes(part));
  if (!doc) { console.error('no file matches ' + part); process.exit(2); }
  console.log(`=== ${doc.rel} (${doc.bytes}B, ${doc.mtime}) ===\n`);
  console.log(doc.text);
}

function list(args) {
  const docs = load();
  const part = (args[0] || '').toLowerCase();
  for (const doc of docs) {
    if (part && !doc.rel.toLowerCase().includes(part)) continue;
    console.log(`${String(doc.bytes).padStart(8)}  ${doc.mtime}  ${doc.rel}`);
  }
  console.log(`\n${docs.filter((d) => !part || d.rel.toLowerCase().includes(part)).length} docs`);
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'build': build(); break;
  case 'search': search(rest); break;
  case 'grep': grep(rest); break;
  case 'headings': headings(rest); break;
  case 'show': show(rest); break;
  case 'list': list(rest); break;
  default:
    console.log('commands: build | search <terms> | grep <regex> | headings <path> | show <path> | list [path]');
}
