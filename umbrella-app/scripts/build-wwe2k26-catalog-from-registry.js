'use strict';

const fs = require('fs');
const path = require('path');
const { openArchive, fnv1a64 } = require('../electron/cak-reader');

const csvPath = path.resolve(process.argv[2] || '');
const gameFolder = path.resolve(process.argv[3] || '');
const outputPath = path.resolve(process.argv[4] || path.join(__dirname, '..', 'app', 'data', 'cak-known-paths.json'));

if (!fs.existsSync(csvPath) || !fs.statSync(csvPath).isFile()) throw new Error('registry CSV was not found.');
if (!fs.existsSync(gameFolder) || !fs.statSync(gameFolder).isDirectory()) throw new Error('WWE 2K26 game folder was not found.');

const archives = fs.readdirSync(gameFolder)
  .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
if (!archives.length) throw new Error('No WWE 2K26 bakedfile CAK archives were found.');

const fileHashes = new Set();
const folderHashes = new Set();
const archiveCounts = [];
for (const archiveName of archives) {
  const archive = openArchive(path.join(gameFolder, archiveName), {});
  // Some CAK tables contain zero-byte placeholder records without a hash.
  // They are not addressable files and must not reduce real-path coverage.
  for (const file of archive.files) if (file.hash) fileHashes.add(file.hash);
  for (const folder of archive.folders) if (folder.hash) folderHashes.add(folder.hash);
  archiveCounts.push({ archive: archiveName, files: archive.files.length, folders: archive.folders.length });
}

const csv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const lines = csv.split(/\r?\n/).filter(Boolean);
if (!/^Asset\/Directory GUID,Full Path$/i.test(lines[0].trim())) {
  throw new Error('The CSV does not have the expected registry export header.');
}

const dictionary = {};
const paths = new Set();
const fileNameCandidates = new Map();
const folderPathCandidates = new Map();
const outputPaths = new Map();
let malformedRows = 0;
let duplicatePaths = 0;
let confirmedRows = 0;
let hashMismatches = 0;
let hashCollisions = 0;
let outputPathCollisions = 0;
let texturePathsConverted = 0;
let rootPrefixesRemoved = 0;

function reverseHexBytes(value) {
  return String(value).match(/../g).reverse().join('').toLowerCase();
}

function addCandidate(map, hash, value) {
  if (!map.has(hash)) map.set(hash, new Map());
  const values = map.get(hash);
  const key = value.toLowerCase();
  if (!values.has(key)) values.set(key, value);
}

function exportPathFor(registryPath, isFile) {
  let result = registryPath;
  // the registry export records texture resources with the game's .tex name,
  // but exports their DDS payloads as .dds files. Preserve the registry hash
  // while presenting the same usable Windows filename produced by common extraction workflows.
  if (isFile && /\.tex$/i.test(result)) {
    result = result.slice(0, -4) + '.dds';
    texturePathsConverted += 1;
  }
  // The two root metadata files sit at the extraction root.
  if (isFile && /^Root\//i.test(result)) {
    result = result.slice(5);
    rootPrefixesRemoved += 1;
  }
  return result;
}

function recordOutputPath(registryHash, outputPath) {
  const key = outputPath.toLowerCase();
  if (outputPaths.has(key) && outputPaths.get(key) !== registryHash) {
    outputPathCollisions += 1;
    return false;
  }
  outputPaths.set(key, registryHash);
  return true;
}

for (let index = 1; index < lines.length; index += 1) {
  const match = /^(.*),([0-9a-fA-F]{16})$/.exec(lines[index]);
  if (!match) {
    malformedRows += 1;
    continue;
  }
  const registryPath = match[1].replace(/^\"|\"$/g, '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!registryPath || registryPath.includes('\0') || registryPath.split('/').includes('..')) {
    malformedRows += 1;
    continue;
  }
  const pathKey = registryPath.toLowerCase();
  if (paths.has(pathKey)) duplicatePaths += 1;
  paths.add(pathKey);

  const registryHash = reverseHexBytes(match[2]);
  const isFile = fileHashes.has(registryHash) || /\.tex$/i.test(registryPath) || /^Root\/(?:FilesysDescription\.json|_textures\.tdb)$/i.test(registryPath);
  const exportedPath = exportPathFor(registryPath, isFile);
  const calculatedHash = fnv1a64(pathKey);
  if (registryHash !== calculatedHash) hashMismatches += 1;
  if (dictionary[registryHash] && dictionary[registryHash].toLowerCase() !== exportedPath.toLowerCase()) {
    hashCollisions += 1;
    continue;
  }
  if (!recordOutputPath(registryHash, exportedPath)) continue;
  dictionary[registryHash] = exportedPath;

  const variants = new Set([registryPath, pathKey]);
  let rowConfirmed = false;
  for (const candidate of variants) {
    const hash = fnv1a64(candidate);
    if (fileHashes.has(hash)) {
      dictionary[hash] = exportedPath;
      rowConfirmed = true;
    }
    if (folderHashes.has(hash)) {
      dictionary[hash] = registryPath;
      rowConfirmed = true;
    }
  }

  const basename = path.posix.basename(registryPath);
  const exportedBasename = path.posix.basename(exportedPath);
  for (const candidate of new Set([basename, basename.toLowerCase()])) {
    const hash = fnv1a64(candidate);
    if (fileHashes.has(hash)) addCandidate(fileNameCandidates, hash, exportedBasename);
  }

  const parent = path.posix.dirname(registryPath);
  if (parent && parent !== '.') {
    for (const candidate of new Set([parent, parent.toLowerCase()])) {
      const hash = fnv1a64(candidate);
      if (folderHashes.has(hash)) addCandidate(folderPathCandidates, hash, parent);
    }
  }
  if (rowConfirmed) confirmedRows += 1;
}

let confirmedBasenameHashes = 0;
let ambiguousBasenameHashes = 0;
for (const [hash, candidates] of fileNameCandidates) {
  if (dictionary[hash]) continue;
  if (candidates.size !== 1) {
    ambiguousBasenameHashes += 1;
    continue;
  }
  dictionary[hash] = candidates.values().next().value;
  confirmedBasenameHashes += 1;
}

let confirmedDerivedFolderHashes = 0;
let ambiguousFolderHashes = 0;
for (const [hash, candidates] of folderPathCandidates) {
  if (dictionary[hash]) continue;
  if (candidates.size !== 1) {
    ambiguousFolderHashes += 1;
    continue;
  }
  dictionary[hash] = candidates.values().next().value;
  confirmedDerivedFolderHashes += 1;
}

let namedFiles = 0;
let namedFolders = 0;
for (const hash of fileHashes) if (dictionary[hash]) namedFiles += 1;
for (const hash of folderHashes) if (dictionary[hash]) namedFolders += 1;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8');

const report = {
  source: path.basename(csvPath),
  sourceRows: Math.max(0, lines.length - 1),
  uniquePaths: paths.size,
  malformedRows,
  duplicatePaths,
  hashMismatches,
  hashCollisions,
  outputPathCollisions,
  texturePathsConverted,
  rootPrefixesRemoved,
  archives: archives.length,
  archiveCounts,
  currentFileRecords: fileHashes.size,
  currentFolderRecords: folderHashes.size,
  confirmedCatalogEntries: Object.keys(dictionary).length,
  confirmedRows,
  confirmedBasenameHashes,
  ambiguousBasenameHashes,
  confirmedDerivedFolderHashes,
  ambiguousFolderHashes,
  namedFiles,
  unresolvedFiles: fileHashes.size - namedFiles,
  fileCoveragePercent: fileHashes.size ? Number((namedFiles * 100 / fileHashes.size).toFixed(4)) : 0,
  namedFolders,
  unresolvedFolders: folderHashes.size - namedFolders,
  folderCoveragePercent: folderHashes.size ? Number((namedFolders * 100 / folderHashes.size).toFixed(4)) : 0,
  output: outputPath,
  outputBytes: fs.statSync(outputPath).size
};
console.log(JSON.stringify(report, null, 2));
