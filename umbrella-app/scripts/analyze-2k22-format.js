'use strict';

const fs = require('fs');
const path = require('path');
const cak20Reader = require('../electron/cak20-reader');
const cak26Reader = require('../electron/cak-reader');

const defaultGameFolder = 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K22';
const gameFolder = path.resolve(process.env.AURORA_WWE2K22_FOLDER || process.argv[2] || defaultGameFolder);
const defaultReferenceRoot = 'C:\\Games\\2k22-extracts\\Root';
const referenceRoot = path.resolve(process.env.AURORA_WWE2K22_ROOT || process.argv[3] || defaultReferenceRoot);

function readPrefix(filePath, size = 128) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(size);
    const count = fs.readSync(fd, buffer, 0, size, 0);
    return buffer.subarray(0, count);
  } finally {
    fs.closeSync(fd);
  }
}

function probeReader(label, reader, archivePath) {
  const started = Date.now();
  try {
    const session = reader.openArchive(archivePath);
    return {
      reader: label,
      accepted: true,
      elapsedMs: Date.now() - started,
      fileCount: session.files.length,
      folderCount: session.folders.length
    };
  } catch (error) {
    return {
      reader: label,
      accepted: false,
      elapsedMs: Date.now() - started,
      reason: error.message
    };
  }
}

function inspectReferenceRoot(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return { available: false, root };
  const pending = [root];
  const extensions = new Map();
  let fileCount = 0;
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile()) {
        const extension = path.extname(entry.name).toLowerCase() || '(none)';
        fileCount += 1;
        extensions.set(extension, (extensions.get(extension) || 0) + 1);
      }
    }
  }
  const descriptionPath = path.join(root, 'FilesysDescription.json');
  let buildDescription = null;
  if (fs.existsSync(descriptionPath)) {
    try { buildDescription = JSON.parse(fs.readFileSync(descriptionPath, 'utf8')); } catch (_error) { /* Keep unreadable optional metadata null. */ }
  }
  return {
    available: true, root, fileCount,
    topLevelDirectories: fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    largestExtensionGroups: [...extensions.entries()].sort((left, right) => right[1] - left[1]).slice(0, 30).map(([extension, count]) => ({ extension, count })),
    buildDescription
  };
}

function main() {
  if (!fs.existsSync(gameFolder) || !fs.statSync(gameFolder).isDirectory()) {
    throw new Error(`WWE 2K22 folder not found: ${gameFolder}`);
  }

  const names = fs.readdirSync(gameFolder);
  const executable = names.find((name) => /^WWE2K22_x64\.exe$/i.test(name)) || null;
  const oodle = names.find((name) => /^oo2core_\d+_win64\.dll$/i.test(name)) || null;
  const archiveNames = names
    .filter((name) => /^bakedfile\d+\.cak$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const archives = archiveNames.map((name) => {
    const archivePath = path.join(gameFolder, name);
    const prefix = readPrefix(archivePath);
    return {
      name,
      size: fs.statSync(archivePath).size,
      magic: prefix.subarray(0, 4).toString('ascii'),
      version: prefix.length >= 6 ? prefix.readUInt16LE(4) : null,
      versionHex: prefix.length >= 6 ? `0x${prefix.readUInt16LE(4).toString(16).padStart(4, '0')}` : null,
      flags: prefix.length >= 8 ? `0x${prefix.readUInt16LE(6).toString(16).padStart(4, '0')}` : null,
      first128Hex: prefix.toString('hex').match(/.{1,2}/g).join(' ')
    };
  });

  const firstArchivePath = archiveNames.length ? path.join(gameFolder, archiveNames[0]) : null;
  const report = {
    inspectionMode: 'read-only',
    gameFolder,
    executable,
    oodle,
    archiveCount: archives.length,
    totalArchiveBytes: archives.reduce((sum, archive) => sum + archive.size, 0),
    archives,
    referenceExtraction: inspectReferenceRoot(referenceRoot),
    compatibility: firstArchivePath ? [
      probeReader('WWE 2K20 CAK reader', cak20Reader, firstArchivePath),
      probeReader('WWE 2K26 CAK reader', cak26Reader, firstArchivePath)
    ] : []
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
