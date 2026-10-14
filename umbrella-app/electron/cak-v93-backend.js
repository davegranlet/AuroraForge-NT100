'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const crypto = require('crypto');

const FDIR_VERSIONS = Object.freeze({ V8_3: { major: 8, minor: 3 }, V9_3: { major: 9, minor: 3 }, V9_9: { major: 9, minor: 9 } });

function readFdirHeader(archivePath) {
  const fd = fs.openSync(archivePath, 'r');
  try {
    const header = Buffer.alloc(8);
    if (fs.readSync(fd, header, 0, 8, 0) !== 8) return null;
    if (header.toString('ascii', 0, 4) !== 'FDIR') return null;
    return { major: header[4], minor: header[5], flags1: header[6], flags2: header[7] };
  } finally { fs.closeSync(fd); }
}

function detectFdirVersion(archivePath) {
  const header = readFdirHeader(archivePath);
  if (!header) return null;
  if (header.major === 8 && header.minor === 3) return FDIR_VERSIONS.V8_3;
  if (header.major === 9 && header.minor === 3) return FDIR_VERSIONS.V9_3;
  if (header.major === 9 && header.minor === 9) return FDIR_VERSIONS.V9_9;
  return { major: header.major, minor: header.minor };
}

function isV93Archive(archivePath) {
  const header = readFdirHeader(archivePath);
  return header !== null && header.major === 9 && header.minor === 3;
}

function isSupportedVersion(archivePath) {
  const version = detectFdirVersion(archivePath);
  return version !== null && (version.major === 8 || version.major === 9);
}

function runBackend(toolPath, args, oodlePath = '') {
  if (!fs.existsSync(toolPath)) throw new Error('The included FDIR 9.3 backend is missing.');
  const env = { ...process.env };
  if (oodlePath) env.AURORA_OODLE_PATH = oodlePath;
  const isManagedTool = path.extname(toolPath).toLowerCase() === '.dll';
  const localDotnet = path.resolve(__dirname, '..', '..', '_toolchains', 'dotnet9', 'dotnet.exe');
  const executable = isManagedTool ? (env.AURORA_DOTNET_PATH || localDotnet) : toolPath;
  const backendArgs = isManagedTool ? [toolPath, ...args] : args;
  if (isManagedTool && !fs.existsSync(executable)) throw new Error('FTribTool requires the configured .NET 9 runtime.');
  const run = cp.spawnSync(executable, backendArgs, { encoding: 'utf8', windowsHide: true, env, maxBuffer: 256 * 1024 * 1024 });
  if (run.error) throw run.error;
  const stdout = String(run.stdout || '');
  const stderr = String(run.stderr || '');
  const combined = `${stdout}\n${stderr}`;
  // The inherited backend path historically returned exit code 0 after logging a fatal pack
  // exception, leaving a partial FDIR behind. Never pass that artifact to the
  // catalog verifier or stage it as a successful build.
  const fatal = combined.split(/\r?\n/).find((line) => /\[(?:Fatal|Error)\]/i.test(line));
  if (run.status !== 0 || fatal) {
    throw new Error(String(stderr || stdout || fatal || `FDIR backend exited with code ${run.status}.`).trim());
  }
  return stdout;
}

function openArchive(archivePath, toolPath) {
  const selected = path.resolve(archivePath);
  const version = detectFdirVersion(selected);
  if (!version) throw new Error('Not a valid FDIR archive.');
  if (version.major === 9 && version.minor === 3) {
    return openV93Archive(selected, toolPath);
  }
  if (version.major === 8 && version.minor === 3) {
    return openWithJsReader(selected, 'v83');
  }
  throw new Error(`FDIR v${version.major}.${version.minor} is not yet supported by the backend. Use the JavaScript reader for older formats.`);
}

function openV93Archive(selected, toolPath) {
  const output = runBackend(toolPath, ['catalog-json', '-i', selected]);
  const marker = 'AURORA_CATALOG_JSON=';
  const line = output.split(/\r?\n/).find((value) => value.startsWith(marker));
  if (!line) throw new Error('The FDIR 9.3 backend did not return a readable catalog.');
  const catalog = JSON.parse(line.slice(marker.length));
  const archiveSize = fs.statSync(selected).size;
  return {
    archiveName: path.basename(selected), archivePath: selected, archiveSize,
    versionMajor: catalog.versionMajor, versionMinor: catalog.versionMinor,
    format: 'FDIR 9.3', game: 'WWE 2K25', key: catalog.archiveKey, keyRecovered: false,
    folders: catalog.folders.map((folder) => ({ ...folder, path: folder.name })),
    files: catalog.files.map((file) => ({
      ...file, protected: file.protectedPayload, nativeName: file.name, nativeNameVerified: true,
      folderName: catalog.folders[file.folderIndex]?.name || path.posix.dirname(String(file.name || '').replace(/\\/g, '/')),
      nameResolved: true, availability: file.extractable ? 'ready' : 'external-reference', sourceArchivePath: selected,
      sourceArchiveName: path.basename(selected), sourceArchiveKey: catalog.archiveKey
    })),
    warnings: [], backend: 'v93'
  };
}

function openWithJsReader(selected, formatLabel) {
  let reader;
  try { reader = require('./cak-reader'); } catch { reader = null; }
  if (!reader) throw new Error('The JavaScript CAK reader is not available.');
  const session = reader.openArchive(selected);
  const version = detectFdirVersion(selected);
  return {
    archiveName: session.archiveName, archivePath: session.archivePath, archiveSize: session.archiveSize,
    versionMajor: version?.major, versionMinor: version?.minor,
    format: `FDIR ${version?.major}.${version?.minor}`, game: formatLabel === 'v83' ? 'WWE 2K22/2K23' : 'Unknown',
    key: session.key, keyRecovered: session.keyRecovered,
    folders: session.folders.map((folder) => ({ ...folder, path: folder.name || '' })),
    files: session.files.map((file) => ({
      id: file.id, stringOffset: file.stringOffset, folderIndex: file.folderIndex,
      storedSize: file.storedSize, expandedSize: file.expandedSize, offset: file.offset,
      type: file.type, chunkCount: file.chunkCount, compressed: file.compressed,
      protected: file.protected, flags: file.flags, extractable: file.extractable,
      externalPayload: file.externalPayload,
      nativeName: file.nativeName || '', nativeNameVerified: file.nativeNameVerified || false,
      folderName: file.folderName || '', nameResolved: file.nameResolved || false,
      name: file.name || '', availability: file.availability || 'unknown',
      sourceArchivePath: selected, sourceArchiveName: path.basename(selected), sourceArchiveKey: String(session.key)
    })),
    warnings: session.warnings || [], backend: 'js-reader'
  };
}

function extractAll(archivePath, outputRoot, toolPath, oodlePath) {
  return runBackend(toolPath, ['unpack-cak', '-i', archivePath, '-o', outputRoot, '--no-convert-dds'], oodlePath);
}

function extractFile(archivePath, relativePath, outputRoot, toolPath, oodlePath) {
  return runBackend(toolPath, ['unpack-file', '-i', archivePath, '-f', relativePath, '-o', outputRoot, '--no-convert-dds'], oodlePath);
}

function buildCak(sourceRoot, outputPath, toolPath, oodlePath) {
  return runBackend(toolPath, ['pack', '-i', sourceRoot, '-v', '9.3', '-o', outputPath, '--encrypt-header'], oodlePath);
}

function walk(root, current = root, output = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (['.aurora-cak-manifest.json', '.aurora-cak-external-references.json', 'Aurora_Forge_Extraction_Report.txt'].includes(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, full, output);
    else if (entry.isFile()) output.push({ full, relative: path.relative(root, full).replace(/\\/g, '/') });
  }
  return output;
}

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function archiveRelativePath(sourceRelative) {
  return sourceRelative.toLowerCase().endsWith('.dds')
    ? sourceRelative.slice(0, -4) + '.tex'
    : sourceRelative;
}

function verifyCak(archivePath, sourceRoot, toolPath, oodlePath) {
  const catalog = openArchive(archivePath, toolPath);
  const expected = walk(path.resolve(sourceRoot));
  const sourceHasTextureDatabase = expected.some((file) => file.relative.toLowerCase() === '_textures.tdb');
  const sourceHasDds = expected.some((file) => file.relative.toLowerCase().endsWith('.dds'));
  const generatedTextureDatabases = catalog.files.filter((file) => String(file.name).toLowerCase() === '_textures.tdb');
  if (generatedTextureDatabases.length !== (sourceHasDds && !sourceHasTextureDatabase ? 1 : 0)) {
    throw new Error(`FDIR 9.3 rebuild produced an unexpected _textures.tdb count: ${generatedTextureDatabases.length}.`);
  }
  const expectedArchiveFiles = expected.length + generatedTextureDatabases.length;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-v93-verify-'));
  try {
    extractAll(archivePath, temporary, toolPath, oodlePath);
    const actual = walk(temporary);
    if (catalog.files.length !== expectedArchiveFiles || actual.length !== expectedArchiveFiles) throw new Error(`FDIR 9.3 rebuild count mismatch: source ${expected.length}, generated metadata ${generatedTextureDatabases.length}, catalog ${catalog.files.length}, reopened ${actual.length}.`);
    const unprotected = catalog.files.filter((file) => !file.protectedPayload);
    if (unprotected.length) throw new Error(`FDIR 9.3 rebuild left ${unprotected.length} payload(s) unprotected, including ${unprotected[0].name}.`);
    if (generatedTextureDatabases.length && !actual.some((file) => file.relative.toLowerCase() === '_textures.tdb')) {
      throw new Error('FDIR 9.3 rebuild omitted generated _textures.tdb during reopen verification.');
    }
    for (const file of expected) {
      const recovered = path.join(temporary, ...archiveRelativePath(file.relative).split('/'));
      if (!fs.existsSync(recovered)) throw new Error(`FDIR 9.3 rebuild omitted ${file.relative}.`);
      if (file.relative.toLowerCase().endsWith('.dds')) {
        if (fs.statSync(recovered).size === 0) throw new Error(`FDIR 9.3 converted texture is empty: ${file.relative}.`);
      } else if (fs.statSync(file.full).size !== fs.statSync(recovered).size || sha256(file.full) !== sha256(recovered)) {
        throw new Error(`FDIR 9.3 byte verification failed for ${file.relative}.`);
      }
    }
    const convertedTextureCount = expected.filter((file) => file.relative.toLowerCase().endsWith('.dds')).length;
    return { verified: true, payloadVerified: true, fileCount: catalog.files.length, sourceFileCount: expected.length, convertedTextureCount, folderCount: catalog.folders.length, bytes: fs.statSync(archivePath).size, gameCompatibilityProfile: 'WWE 2K25 FDIR 9.3 (Experimental until in-game mount confirmation)' };
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

module.exports = { FDIR_VERSIONS, readFdirHeader, detectFdirVersion, isV93Archive, isSupportedVersion, openArchive, extractAll, extractFile, buildCak, verifyCak };
