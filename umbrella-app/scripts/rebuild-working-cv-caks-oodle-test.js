#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { openArchive } = require('../electron/cak-reader');
const { buildCak } = require('../electron/archive-repackager');

const root = path.resolve(__dirname, '..');
const game = 'C:/SteamLibrary/steamapps/common/WWE 2K26';
const helper = path.join(root, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const oodle = path.join(game, 'oo2core_9_win64.dll');
const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const workRoot = 'D:/testcaks/rebuilt-working-cv-oodle-test';
const inputs = [
  path.join(game, 'mods', '2ndtest-cv.cak'),
  path.join(game, 'mods', '3rdtest-cv.cak'),
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function runHelper(request, requestPath) {
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  const result = cp.spawnSync(helper, [requestPath], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || (result.error && result.error.message) || 'helper failed').trim());
  }
  const parsed = JSON.parse(String(result.stdout || '').trim());
  const failures = (parsed.results || []).filter((item) => !item.Ok);
  if (failures.length) throw new Error(failures.map((item) => `${item.Id}: ${item.Error}`).join('\n'));
}

function safeRelative(file, index, archiveName) {
  if (file.nameResolved && file.name && !path.isAbsolute(file.name) && !file.name.split(/[\\/]/).includes('..')) {
    return file.name;
  }
  const ext = file.type ? `.${file.type.replace(/\W/g, '').toLowerCase() || 'bin'}` : '.bin';
  return `__unresolved/${archiveName}/file_${String(index).padStart(6, '0')}_${file.hash}${ext}`;
}

function safeFolderRelative(folder) {
  if (folder.nameResolved && folder.name && !path.isAbsolute(folder.name) && !folder.name.split(/[\\/]/).includes('..')) {
    return folder.name;
  }
  return '';
}

fs.rmSync(workRoot, { recursive: true, force: true });
fs.mkdirSync(workRoot, { recursive: true });

const summary = [];
for (const input of inputs) {
  const session = openArchive(input, dictionary);
  const base = path.basename(input, '.cak');
  const extractRoot = path.join(workRoot, `${base}-extracted`);
  const requestPath = path.join(workRoot, `${base}-extract-request.json`);
  const output = path.join(workRoot, `${base}-aurora-oodle.cak`);
  fs.mkdirSync(extractRoot, { recursive: true });

  const entries = session.files.map((file, index) => ({
    id: file.id,
    offset: Number(file.offset),
    storedSize: file.storedSize,
    expandedSize: file.expandedSize,
    compressed: file.compressed,
    protected: file.protected,
    relativePath: safeRelative(file, index, base),
    chunks: file.chunks,
  }));

  runHelper({
    archivePath: input,
    oodlePath: oodle,
    outputRoot: extractRoot,
    archiveKey: session.key,
    overwrite: false,
    entries,
  }, requestPath);

  for (const folder of session.folders) {
    const relative = safeFolderRelative(folder);
    if (relative) fs.mkdirSync(path.join(extractRoot, relative), { recursive: true });
  }

  const manifest = {
    schema: 'aurora-forge-cak-extraction-manifest/v1',
    purpose: 'Preserve original CAK hashes while rebaking a working CakeView archive for Oodle A/B testing.',
    sourceArchive: input,
    entries: session.files.map((file, index) => ({
      relativePath: entries[index].relativePath,
      fileHash: file.hash,
      folderHash: session.folders[file.folderIndex] && session.folders[file.folderIndex].hash || '',
      type: file.type,
      nameResolved: Boolean(file.nameResolved),
      sourceArchive: session.archiveName,
    })),
  };
  fs.writeFileSync(path.join(extractRoot, '.aurora-cak-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const built = buildCak(extractRoot, output, { oodlePath: oodle, helperPath: helper });
  const reopened = openArchive(output, dictionary);
  const missing = session.files.filter((file) => !reopened.files.some((entry) => entry.hash === file.hash));
  if (missing.length) throw new Error(`${base} rebuilt CAK lost ${missing.length} original file hash(es).`);

  summary.push({
    input,
    inputSha256: sha256(input),
    extractedTo: extractRoot,
    output,
    outputSha256: sha256(output),
    inputFiles: session.files.length,
    outputFiles: reopened.files.length,
    inputFolders: session.folders.length,
    outputFolders: reopened.folders.length,
    outputBytes: fs.statSync(output).size,
    compressed: reopened.files.filter((file) => file.compressed).length,
    stored: reopened.files.filter((file) => !file.compressed).length,
    built,
  });
}

const summaryPath = path.join(workRoot, 'summary.json');
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ workRoot, summaryPath, summary }, null, 2));
