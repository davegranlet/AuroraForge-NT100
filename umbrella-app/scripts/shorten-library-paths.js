'use strict';
// Ships the generated source library with short directory names so the portable
// app can be copied on Windows without hitting the legacy MAX_PATH limit.
// Relative layout is preserved, so require()/import between files keeps working.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'app', 'tools', 'sl'));
if (!fs.existsSync(root)) {
  console.log('No source library to shorten: ' + root);
  process.exit(0);
}

const MAX_SEGMENT = 12;
const PREFIX_LEN = 3;
const HASH_LEN = 3;
const TEXT_EXT = new Set(['.js', '.cjs', '.mjs', '.json', '.md', '.txt', '.py', '.ps1', '.cs', '.csproj', '.java', '.xml', '.yml', '.yaml', '.html', '.css', '.bat', '.cmd', '.sh', '.ini', '.cfg', '.conf', '.props', '.targets', '.sln']);

function hashName(name) {
  const base = name.replace(/[^a-z0-9]/gi, '').slice(0, PREFIX_LEN).toLowerCase().padEnd(PREFIX_LEN, 'x');
  let len = HASH_LEN;
  for (;;) {
    const suffix = crypto.createHash('sha1').update(name).digest('hex').slice(0, len);
    const candidate = base + '-' + suffix;
    if (candidate.length <= MAX_SEGMENT) return candidate;
    len = Math.max(1, len - 1);
  }
}

function listDirs(dir, prefix = '', output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = prefix ? prefix + path.sep + entry.name : entry.name;
    output.push(rel);
    listDirs(path.join(dir, entry.name), rel, output);
  }
  return output;
}

const dirs = listDirs(root).sort((a, b) => {
  const depth = a.split(path.sep).length - b.split(path.sep).length;
  return depth || a.localeCompare(b);
});

const map = new Map();
const children = new Map();
for (const rel of dirs) {
  const parent = path.dirname(rel) === '.' ? '' : path.dirname(rel);
  if (!children.has(parent)) children.set(parent, []);
  children.get(parent).push(path.basename(rel));
}

const depthOf = value => (value ? value.split(path.sep).length : 0);
const parents = [...children.keys()].sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
for (const parent of parents) {
  const names = children.get(parent) || [];
  const currentParent = parent ? (map.get(parent) || parent) : '';
  const used = new Set(names);
  const assigned = new Map();
  for (const name of names.sort()) {
    let finalName = name;
    if (name.length > MAX_SEGMENT) {
      let candidate = hashName(name);
      let nonce = 0;
      while (used.has(candidate)) candidate = hashName(name + '#' + (++nonce));
      used.add(candidate);
      finalName = candidate;
    }
    assigned.set(name, finalName);
  }
  for (const [oldName, newName] of assigned) {
    // Ancestors are already renamed, so only the final segment changes here.
    if (oldName !== newName) {
      const from = path.join(root, currentParent, oldName);
      const to = path.join(root, currentParent, newName);
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    const oldRel = parent ? parent + path.sep + oldName : oldName;
    const newRel = currentParent ? currentParent + path.sep + newName : newName;
    map.set(oldRel, newRel);
  }
}

const renames = [...map.entries()].filter(([oldRel, newRel]) => oldRel !== newRel);

const replacements = [];
for (const [oldRel, newRel] of map.entries()) {
  const oldNormalized = oldRel.split(path.sep).join('/');
  const newNormalized = newRel.split(path.sep).join('/');
  replacements.push({ from: oldNormalized, to: newNormalized });
  replacements.push({ from: oldNormalized.replace(/\//g, '\\'), to: newNormalized.replace(/\//g, '\\') });
  replacements.push({ from: oldNormalized.split('/').join('\\\\'), to: newNormalized.split('/').join('\\\\') });
}
replacements.sort((a, b) => b.from.length - a.from.length);

function rewriteText(file) {
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) return;
  if (file.endsWith('tool-library.json') || file.endsWith('SOURCE-SNAPSHOT.json')) return;
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  let changed = text;
  for (const item of replacements) changed = changed.split(item.from).join(item.to);
  if (changed !== text) fs.writeFileSync(file, changed, 'utf8');
}

function walkFiles(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, output);
    else output.push(full);
  }
  return output;
}

const files = walkFiles(root);
for (const file of files) rewriteText(file);

function mapPath(value) {
  const normalized = value.split('\\').join('/');
  const parts = normalized.split('/');
  const dir = parts.slice(0, -1).join('/');
  if (!dir) return normalized;
  const mappedDir = map.get(dir.split('/').join(path.sep));
  if (!mappedDir) return normalized;
  return mappedDir.split(path.sep).join('/') + '/' + parts[parts.length - 1];
}

const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const libraryFile = path.join(root, 'tool-library.json');
if (fs.existsSync(libraryFile)) {
  const library = JSON.parse(fs.readFileSync(libraryFile, 'utf8'));
  for (const tool of library.tools || []) {
    tool.path = mapPath(tool.path);
    tool.id = tool.path;
    const full = path.join(root, tool.path.split('/').join(path.sep));
    if (fs.existsSync(full)) tool.sha256 = hashFile(full);
  }
  fs.writeFileSync(libraryFile, JSON.stringify(library, null, 2) + '\n', 'utf8');
}

const snapshotFile = path.join(root, 'SOURCE-SNAPSHOT.json');
if (fs.existsSync(snapshotFile)) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  for (const item of snapshot.files || []) {
    item.path = mapPath(item.path);
    const full = path.join(root, item.path.split('/').join(path.sep));
    if (fs.existsSync(full)) {
      const bytes = fs.readFileSync(full);
      item.bytes = bytes.length;
      item.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    }
  }
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

const finalFiles = walkFiles(root);
const max = finalFiles.reduce((best, file) => {
  const len = path.relative(root, file).length;
  return len > best.len ? { len, file } : best;
}, { len: 0, file: '' });
const report = {
  root,
  renamedDirectories: renames.length,
  files: finalFiles.length,
  maxRelativePathLength: max.len,
  maxRelativePath: path.relative(root, max.file).split(path.sep).join('/')
};
const buildDir = path.resolve(__dirname, '..', 'build');
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(path.join(buildDir, 'shorten-library-paths.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
