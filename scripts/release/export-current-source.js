#!/usr/bin/env node
'use strict';

// Export current working files, including untracked one-offs. Never exports Git history.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const SOURCE = /\.(?:[cm]?js|jsx|tsx?|py|php|sql|lua|rb|pl|ps1|psm1|cs|csproj|sln|slnx|props|targets|java|c|cc|cpp|cxx|h|hpp|rs|toml|go|html?|css|scss|sh|cmd|bat|ya?ml|xml|xsd|fbs|proto|rc|resx|iss|nsi|nuspec)$/i;
const ASSET = /\.(?:svg|png|jpe?g|gif|webp|ico|woff2?|ttf|otf)$/i;
const CONFIG = /(?:^|\/)(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|[^/]+\.config\.json|global\.json|requirements[^/]*\.txt|CMakeLists\.txt|Makefile|Dockerfile|\.gitignore|\.gitattributes|\.npmrc|\.editorconfig)$/i;
const NOTICE = /(?:^|\/)(?:LICENSE[^/]*|COPYING[^/]*|NOTICE[^/]*|THIRD[-_]PARTY[-_]NOTICES[^/]*|SOURCE\.txt|VERSION)$/i;
const PRIVATE = /(?:^|\/)(?:forge2|\.git|\.local|node_modules|bin|obj|dist|build|portable-release|sdcl-release|ghidra-projects|__pycache__|\.git\.embedded-backup|Aurora-Forge-Patreon-Verifier|source-library|app\.asar\.unpacked)(?:\/|$)|^(?:release|releases|sites|website)(?:\/|$)|^umbrella-app\/website(?:\/|$)|^umbrella-app\/app\/tools\/entry-studio\/tools(?:\/|$)|^umbrella-app\/app\/tools\/(?:source-library|sl)(?:\/|$)/i;
const GENERATED = /(?:^|\/)(?:[^/]*(?:decompil|decompiled|source-audit|ilspy|clr-dump)[^/]*|BakeMe|references|extracted|native-fixtures)(?:\/|$)/i;
const SECRET = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/,
  /(?:client_secret|api[_-]?key|access[_-]?token|password)\s*[:=]\s*["'][^"'\s]{20,}["']/i
];

function rel(p) { return path.relative(ROOT, p).split(path.sep).join('/'); }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function csvRows(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if (c === '\n' && !quoted) { row.push(value.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift() || [];
  return rows.map(values => Object.fromEntries(header.map((name, i) => [name, values[i] || ''])));
}
function filePolicy(p, cataloged) {
  if (/^(?:sites|website)(?:\/|$)|^umbrella-app\/website(?:\/|$)/i.test(p)) return 'website-source-excluded-by-publication-policy';
  if (/^sites\/memory-lane\/(?:memories\.js|private-storage\/|media\/|verification\/)/i.test(p)) return 'personal-media-index-or-generated-gallery-fixture';
  if (PRIVATE.test(p) || /(?:^|\/)docs\/private(?:\/|$)/i.test(p) || /patreon[-_]?verifier|HideCtrlData|(?:^|\/)\.env(?:\.|$)|(?:^|\/)(?:AGENTS|DEEPSEEK)\.md$/i.test(p)) return 'private-protected-or-generated-tree';
  if (GENERATED.test(path.posix.dirname(p))) return 'generated-decompilation-or-game-input';
  if (!SOURCE.test(p) && !CONFIG.test(p) && !NOTICE.test(p) && /(?:^|\/)(?:notes|analysis|mod-coverage-reports|docs)(?:\/|$)/i.test(p) && !/(?:^|\/)(?:README|BUILD|API|CONTRIBUTING|SECURITY)[^/]*\.md$/i.test(p)) return 'private-research-note-or-audit';
  if (/\.(?:log|dmp|bak|tmp|cak|clips|adefs|anims|acts|evd|bin|jsfb|sdb|pac|mp4|zip|exe|dll|pdb)$/i.test(p)) return 'binary-game-data-log-or-archive';
  if (SOURCE.test(p) || CONFIG.test(p) || NOTICE.test(p)) return null;
  if (/\.json$/i.test(p) && !/^animation\/workflows\//i.test(p) && !/^research\//i.test(p)) return null;
  if (ASSET.test(p) && /^(?:umbrella-app|cak-foundry|100-not-tribute)\//i.test(p)) return null;
  if (/\.md$/i.test(p) && !/^research\/|^animation\/workflows\//i.test(p) && /(?:^|\/)(?:README|BUILD|API|CONTRIBUTING|SECURITY|THIRD-PARTY-NOTICES)[^/]*\.md$/i.test(p)) return null;
  return cataloged ? 'catalog-item-is-data-binary-or-private-document' : 'non-source-or-private-document';
}
function main(args = process.argv.slice(2), options = {}) {
  const outArg = args.indexOf('--out');
  const out = path.resolve(outArg < 0 ? path.join(ROOT, '.local/source-release', new Date().toISOString().replace(/[:.]/g, '-')) : args[outArg + 1]);
  const allowed = path.join(ROOT, '.local/source-release') + path.sep;
  if (!out.startsWith(allowed)) throw new Error('Output must be a new directory below .local/source-release');
  if (fs.existsSync(out)) throw new Error('Refusing to overwrite an existing immutable source snapshot: ' + out);
  fs.mkdirSync(out, { recursive: true }); const payload = path.join(out, 'source'); fs.mkdirSync(payload);
  const catalogPath = path.join(ROOT, 'animation/workflows/victory-6100-2k19/complete-tool-capability-catalog-20261023.csv');
  const catalog = fs.existsSync(catalogPath) ? csvRows(fs.readFileSync(catalogPath, 'utf8')) : [];
  const known = new Map(catalog.map(row => [row.Path.toLowerCase(), row]));
  const files = new Set(), exclusions = [], errors = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name), p = rel(full);
      if (entry.isSymbolicLink()) { exclusions.push({ path: p, reason: 'symlink-or-junction-not-followed', scope: 'subtree-or-file' }); continue; }
      if (entry.isDirectory()) {
        if (PRIVATE.test(p) || GENERATED.test(p) || /^docs\/private(?:\/|$)|^sites\/memory-lane\/(?:private-storage|media|verification)(?:\/|$)/i.test(p)) { exclusions.push({ path: p, reason: /^(?:sites|website)(?:\/|$)|^umbrella-app\/website(?:\/|$)/i.test(p) ? 'website-source-excluded-by-publication-policy' : 'private-generated-or-personal-data-subtree', scope: 'subtree' }); continue; }
        try { walk(full); } catch (e) { errors.push({ path: p, error: e.code || e.message }); }
      } else if (entry.isFile()) files.add(p);
    }
  }
  walk(ROOT);
  // Include known authored one-offs in otherwise skipped output trees; protected rules still apply.
  for (const row of catalog) {
    if (!SOURCE.test(row.Path) || PRIVATE.test(row.Path) || GENERATED.test(path.posix.dirname(row.Path))) continue;
    if (!fs.existsSync(path.resolve(ROOT, row.Path))) {
      exclusions.push({ path: row.Path, reason: 'catalog-entry-missing', scope: 'file' });
      continue;
    }
    files.add(row.Path);
  }
  // Literal JSON data dependencies of shipped scripts are part of the runnable source set.
  const forced = new Set();
  for (const p of files) {
    if (!/\.[cm]?js$/i.test(p)) continue;
    let text;
    try { text = fs.readFileSync(path.resolve(ROOT, p), 'utf8'); } catch { continue; }
    for (const match of text.matchAll(/require\(\s*['"](\.[^'"]+\.json)['"]\s*\)/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(p), match[1]));
      if (!target.startsWith('../') && files.has(target)) forced.add(target);
    }
  }
  const included = [], holds = [], dependencyGaps = [];
  for (const p of [...files].sort()) {
    const reason = forced.has(p) ? null : filePolicy(p, known.has(p.toLowerCase()));
    if (reason) { exclusions.push({ path: p, reason, scope: 'file' }); continue; }
    const full = path.resolve(ROOT, p);
    if (!full.startsWith(ROOT + path.sep)) throw new Error('Path escape: ' + p);
    let bytes; try { bytes = fs.readFileSync(full); } catch (e) { errors.push({ path: p, error: e.code || e.message }); continue; }
    const text = bytes.toString('utf8');
    const secretMatch = !ASSET.test(p) && SECRET.findIndex(pattern => pattern.test(text));
    if (secretMatch !== false && secretMatch >= 0) { holds.push({ path: p, reason: 'possible-secret', rule: secretMatch, sha256: sha(bytes) }); continue; }
    const dest = path.join(payload, p); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, bytes);
    if (sha(fs.readFileSync(dest)) !== sha(bytes)) throw new Error('Snapshot copy failed hash verification: ' + p);
    included.push({ path: p, bytes: bytes.length, sha256: sha(bytes), cataloged: known.has(p.toLowerCase()), kind: known.get(p.toLowerCase())?.Kind || 'current-tree-source-or-support-file' });
  }
  const exported = new Set(included.map(row => row.path));
  for (const item of included.filter(row => /\.[cm]?js$/i.test(row.path))) {
    const text = fs.readFileSync(path.join(payload, item.path), 'utf8');
    const refs = [...text.matchAll(/(?:require\(\s*|from\s+|import\(\s*)['"](\.[^'"]+)['"]/g)].map(match => match[1]);
    for (const ref of new Set(refs)) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(item.path), ref));
      const candidates = [base, ...['.js','.cjs','.mjs','.json','/index.js','/package.json'].map(suffix => base + suffix)];
      if (!candidates.some(candidate => exported.has(candidate))) dependencyGaps.push({ path: item.path, reference: ref, reason: 'literal-relative-import-not-in-snapshot' });
    }
  }
  const head = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  const manifest = { schema: 'aurora-current-source-snapshot-v1', createdUtc: new Date().toISOString(), sourceRoot: ROOT, sourceBasis: 'current working files including untracked code; not Git HEAD alone', gitHead: head.stdout.trim(), publishReady: false, included, exclusions, holds, errors, dependencyGaps, limitations: ['Heuristic source/data separation requires final boundary review.', 'Third-party source licensing and authored asset rights are not established by this export.', 'Dynamic imports, Python/C#/native dependency closure and runtime game inputs require separate verification.', 'Private docs/research notes/logs excluded; authored code under research is included.', 'Private Patreon backend stays excluded. No Git history or binary artifacts are exported.'] };
  fs.writeFileSync(path.join(out, 'manifest.private.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'source', 'SOURCE-SNAPSHOT.json'), JSON.stringify({ schema: manifest.schema, createdUtc: manifest.createdUtc, files: included.map(({path, bytes, sha256}) => ({path, bytes, sha256})) }, null, 2) + '\n');
  const summary = { out, included: included.length, exclusions: exclusions.length, holds: holds.length, errors: errors.length, dependencyGaps: dependencyGaps.length, publishReady: false };
  if (!options.quiet) console.log(JSON.stringify(summary, null, 2));
  return { out, payload, manifestPath: path.join(out, 'manifest.private.json'), manifest, summary };
}
if (require.main === module) main();
module.exports = { csvRows, filePolicy, main, exportCurrentSource: main };
