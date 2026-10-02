'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, decodePairs, fnv1a64 } = require('../electron/cak-reader');

const gameRoot = path.resolve(process.argv[2] || '');
const inputCatalog = path.resolve(process.argv[3] || '');
const outputCatalog = path.resolve(process.argv[4] || '');
if (!fs.existsSync(gameRoot) || !fs.statSync(gameRoot).isDirectory()) throw new Error('WWE 2K26 game folder not found.');
if (!fs.existsSync(inputCatalog)) throw new Error('WWE 2K26 path catalog not found.');
if (!outputCatalog) throw new Error('Choose an output catalog path.');

const dictionary = JSON.parse(fs.readFileSync(inputCatalog, 'utf8'));
const originalCount = Object.keys(dictionary).length;

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
}

function addCandidate(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

const folderBasenamesByLength = new Map();
const fileBasenamesByKey = new Map();
for (const value of Object.values(dictionary)) {
  const normalized = normalize(value);
  if (!normalized) continue;
  const components = normalized.split('/').filter(Boolean);
  components.slice(0, -1).forEach((component) => addCandidate(folderBasenamesByLength, Buffer.byteLength(component), component));
  const basename = components.at(-1);
  const extension = path.posix.extname(basename).slice(1);
  addCandidate(fileBasenamesByKey, `${Buffer.byteLength(basename)}|${extension}`, basename);
  addCandidate(fileBasenamesByKey, `${Buffer.byteLength(basename)}|`, basename);
}

function readNameLengths(archivePath, session) {
  const offset = session.header[17];
  const size = session.header[15];
  const fd = fs.openSync(archivePath, 'r');
  let encoded;
  try {
    encoded = Buffer.alloc(size);
    if (fs.readSync(fd, encoded, 0, size, offset) !== size) throw new Error('Name table ended early.');
  } finally {
    fs.closeSync(fd);
  }
  const decoded = decodePairs(encoded, session.key);
  const result = new Map();
  for (const item of [...session.files, ...session.folders]) {
    if (item.stringOffset < decoded.length) result.set(item.stringOffset, decoded[item.stringOffset]);
  }
  return result;
}

function parentIndexMap(folders) {
  const parents = new Map();
  for (const folder of folders) {
    for (const child of folder.children || []) {
      if (child >= 0 && child < folders.length && !parents.has(child)) parents.set(child, folder.id);
    }
  }
  return parents;
}

function resolveCandidateGroups(groups, candidateLookup, onMatch) {
  let found = 0;
  for (const group of groups.values()) {
    const candidates = candidateLookup(group);
    if (!candidates || !candidates.size) continue;
    const remaining = new Set(group.targets.keys());
    for (const candidate of candidates) {
      const full = `${group.parent}/${candidate}`;
      const hash = fnv1a64(full);
      if (!remaining.has(hash)) continue;
      onMatch(group.targets.get(hash), hash, full);
      remaining.delete(hash);
      found += 1;
      if (!remaining.size) break;
    }
  }
  return found;
}

const archives = fs.readdirSync(gameRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^bakedfile\d+\.cak$/i.test(entry.name))
  .map((entry) => path.join(gameRoot, entry.name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

let recoveredFolders = 0;
let recoveredFiles = 0;
const reports = [];
for (const archivePath of archives) {
  let progress = true;
  let passes = 0;
  const session = openArchive(archivePath, dictionary);
  const lengths = readNameLengths(archivePath, session);
  const parents = parentIndexMap(session.folders);
  while (progress && passes < 20) {
    progress = false;
    passes += 1;
    const groups = new Map();
    for (const folder of session.folders) {
      if (folder.nameResolved) continue;
      const parentId = parents.get(folder.id);
      if (parentId === undefined) continue;
      const parent = session.folders[parentId];
      const parentName = dictionary[parent.hash] || parent.name;
      if (!parentName) continue;
      const length = lengths.get(folder.stringOffset);
      const parentPath = normalize(parentName);
      const groupKey = `${parentPath}\0${length}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { parent: parentPath, length, targets: new Map() });
      groups.get(groupKey).targets.set(folder.hash, folder);
    }
    const foundThisPass = resolveCandidateGroups(groups, (group) => folderBasenamesByLength.get(group.length), (folder, hash, full) => {
      dictionary[hash] = full;
      folder.name = full;
      folder.nameResolved = true;
    });
    recoveredFolders += foundThisPass;
    progress = foundThisPass > 0;
  }
  const fileGroups = new Map();
  for (const file of session.files) {
    if (file.nameResolved) continue;
    const folder = session.folders[file.folderIndex];
    const folderName = folder && (dictionary[folder.hash] || folder.name);
    if (!folderName) continue;
    const length = lengths.get(file.stringOffset);
    const type = String(file.type || '').toLowerCase();
    const parentPath = normalize(folderName);
    const groupKey = `${parentPath}\0${length}\0${type}`;
    if (!fileGroups.has(groupKey)) fileGroups.set(groupKey, { parent: parentPath, length, type, targets: new Map() });
    fileGroups.get(groupKey).targets.set(file.hash, file);
  }
  recoveredFiles += resolveCandidateGroups(fileGroups, (group) => fileBasenamesByKey.get(`${group.length}|${group.type}`) || fileBasenamesByKey.get(`${group.length}|`), (file, hash, full) => {
    dictionary[hash] = full;
    file.name = full;
    file.nameResolved = true;
  });
  const reopened = openArchive(archivePath, dictionary);
  reports.push({
    archive: path.basename(archivePath),
    files: reopened.files.length,
    namedFiles: reopened.files.filter((item) => item.nameResolved).length,
    folders: reopened.folders.length,
    namedFolders: reopened.folders.filter((item) => item.nameResolved).length,
    passes
  });
}

const sorted = Object.fromEntries(Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(outputCatalog), { recursive: true });
fs.writeFileSync(outputCatalog, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  source: inputCatalog,
  gameRoot,
  originalEntries: originalCount,
  recoveredFolders,
  recoveredFiles,
  finalEntries: Object.keys(sorted).length,
  output: outputCatalog,
  reports
}, null, 2));
