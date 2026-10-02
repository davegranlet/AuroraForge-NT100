'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, fnv1a64 } = require('../electron/cak-reader');

const root = path.join(__dirname, '..');
const game26 = path.resolve(process.argv[2] || 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26');
const extracts25 = path.resolve(process.argv[3] || 'C:\\Games\\wwe-2k25-extracts\\Root');
const extracts26 = path.resolve(process.argv[4] || 'D:\\WWE26-mods\\extracts\\Root');
const outputCatalog = path.resolve(process.argv[5] || path.join(root, 'app', 'data', 'cak-known-paths.json'));
const outputReport = path.resolve(process.argv[6] || path.join(root, 'build', 'extracted-layout-audit.json'));

for (const folder of [game26, extracts25, extracts26]) {
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) throw new Error('Required folder was not found: ' + folder);
}

const currentCatalog = JSON.parse(fs.readFileSync(outputCatalog, 'utf8'));
const archives = fs.readdirSync(game26)
  .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
  .map((name) => path.join(game26, name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!archives.length) throw new Error('No WWE 2K26 bakedfile*.cak archives were found.');

const fileTargets = new Set();
const folderTargets = new Set();
for (const archivePath of archives) {
  const archive = openArchive(archivePath, currentCatalog);
  for (const item of archive.fileHashes) if (item.hash) fileTargets.add(item.hash);
  for (const item of archive.folderHashes) if (item.hash) folderTargets.add(item.hash);
}
const allTargets = new Set([...fileTargets, ...folderTargets]);

function scanLayout(scanRoot, label) {
  const started = Date.now();
  const files = new Set();
  const folders = new Set();
  const topLevel = {};
  const matches = {};
  const matchKinds = {};
  const collisions = [];
  const stack = [scanRoot];
  let totalBytes = 0;

  const tryMatch = (candidate, kind) => {
    for (const variant of new Set([candidate, candidate.toLowerCase()])) {
      const hash = fnv1a64(variant);
      if (!allTargets.has(hash)) continue;
      const existing = matches[hash];
      if (existing && existing.toLowerCase() !== candidate.toLowerCase()) collisions.push({ hash, existing, candidate, kind });
      else if (!existing) {
        matches[hash] = candidate;
        matchKinds[hash] = kind;
      }
    }
  };

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(current, entry.name);
      const relative = path.relative(scanRoot, full).replace(/\\/g, '/');
      const canonical = relative.replace(/^root\//i, '');
      const family = canonical.split('/')[0] || '(root)';
      if (!topLevel[family]) topLevel[family] = { files: 0, folders: 0, bytes: 0 };
      if (entry.isDirectory()) {
        folders.add(canonical.toLowerCase());
        topLevel[family].folders += 1;
        tryMatch(canonical, 'folder');
        stack.push(full);
      } else if (entry.isFile()) {
        const size = fs.statSync(full).size;
        files.add(canonical.toLowerCase());
        totalBytes += size;
        topLevel[family].files += 1;
        topLevel[family].bytes += size;
        tryMatch(canonical, 'file-path');
        tryMatch(path.posix.basename(canonical), 'file-basename');
      }
    }
  }

  return {
    label,
    root: scanRoot,
    elapsedSeconds: Math.round((Date.now() - started) / 100) / 10,
    files,
    folders,
    totalBytes,
    topLevel,
    matches,
    matchKinds,
    collisions
  };
}

console.log('Scanning WWE 2K25 extracted layout...');
const scan25 = scanLayout(extracts25, 'WWE 2K25');
console.log(`WWE 2K25: ${scan25.files.size} files, ${scan25.folders.size} folders, ${Object.keys(scan25.matches).length} target matches.`);
console.log('Scanning WWE 2K26 extracted layout...');
const scan26 = scanLayout(extracts26, 'WWE 2K26');
console.log(`WWE 2K26: ${scan26.files.size} files, ${scan26.folders.size} folders, ${Object.keys(scan26.matches).length} target matches.`);

const intersection = (a, b) => [...a].filter((value) => b.has(value));
const difference = (a, b) => [...a].filter((value) => !b.has(value));
const match25 = new Set(Object.keys(scan25.matches));
const match26 = new Set(Object.keys(scan26.matches));
const unionMatches = new Set([...match25, ...match26]);

const conflicts = [];
for (const hash of intersection(match25, match26)) {
  const path25 = scan25.matches[hash];
  const path26 = scan26.matches[hash];
  if (path25.toLowerCase() !== path26.toLowerCase()) conflicts.push({ hash, path25, path26 });
}

const nextCatalog = { ...currentCatalog };
// Current-game paths win; older-game paths can fill only missing hashes.
for (const [hash, candidate] of Object.entries(scan25.matches)) if (!nextCatalog[hash]) nextCatalog[hash] = candidate.toLowerCase();
for (const [hash, candidate] of Object.entries(scan26.matches)) nextCatalog[hash] = candidate.toLowerCase();
const sortedCatalog = Object.fromEntries(Object.entries(nextCatalog).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(outputCatalog, JSON.stringify(sortedCatalog, null, 2) + '\n', 'utf8');

const report = {
  generatedAt: new Date().toISOString(),
  rule: 'Matched WWE 2K26 archive names are bundled at release time. End users never scan extracted folders.',
  archives: archives.map((item) => path.basename(item)),
  targetHashes: { all: allTargets.size, files: fileTargets.size, folders: folderTargets.size },
  layouts: {
    wwe2k25: { root: scan25.root, files: scan25.files.size, folders: scan25.folders.size, totalBytes: scan25.totalBytes, elapsedSeconds: scan25.elapsedSeconds, topLevel: scan25.topLevel },
    wwe2k26: { root: scan26.root, files: scan26.files.size, folders: scan26.folders.size, totalBytes: scan26.totalBytes, elapsedSeconds: scan26.elapsedSeconds, topLevel: scan26.topLevel }
  },
  comparison: {
    sharedFiles: intersection(scan25.files, scan26.files).length,
    only2k25Files: difference(scan25.files, scan26.files).length,
    only2k26Files: difference(scan26.files, scan25.files).length,
    sharedFolders: intersection(scan25.folders, scan26.folders).length,
    only2k25Folders: difference(scan25.folders, scan26.folders).length,
    only2k26Folders: difference(scan26.folders, scan25.folders).length
  },
  archiveMatches: {
    from2k25: match25.size,
    from2k26: match26.size,
    sharedHashes: intersection(match25, match26).length,
    only2k25Hashes: difference(match25, match26).length,
    only2k26Hashes: difference(match26, match25).length,
    union: unionMatches.size,
    unresolvedTargetHashes: allTargets.size - unionMatches.size,
    crossGenerationConflicts: conflicts,
    scanCollisions2k25: scan25.collisions,
    scanCollisions2k26: scan26.collisions
  },
  catalog: { before: Object.keys(currentCatalog).length, after: Object.keys(sortedCatalog).length, added: Object.keys(sortedCatalog).length - Object.keys(currentCatalog).length }
};

fs.mkdirSync(path.dirname(outputReport), { recursive: true });
fs.writeFileSync(outputReport, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
