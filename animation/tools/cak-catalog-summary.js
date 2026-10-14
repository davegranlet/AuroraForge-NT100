'use strict';

const fs = require('fs');

function readPossiblyUtf16Json(file) {
  let raw = fs.readFileSync(file, 'utf8');
  if (raw.includes('\0')) raw = fs.readFileSync(file, 'utf16le');
  const start = raw.indexOf('{');
  if (start < 0) throw new Error('cak-catalog-summary: no JSON object found');
  return JSON.parse(raw.slice(start));
}

function summarizeCakCatalog(catalog) {
  const keyFiles = catalog.files.filter((file) => file.name.includes('VictoryListData') ||
    file.name.includes('CutsceneNoRegistry') ||
    file.name.includes('EntranceListData') ||
    file.name.includes('ENG.sdb'));
  return {
    files: catalog.files.length,
    folders: catalog.folders.length,
    version: `${catalog.versionMajor}.${catalog.versionMinor}`,
    encrypted: catalog.encrypted,
    archiveName: catalog.archiveName,
    firstFiles: catalog.files.slice(0, 12).map((file) => file.name),
    keyFiles: keyFiles.map((file) => ({
      name: file.name,
      storedSize: file.storedSize,
      expandedSize: file.expandedSize,
    })),
    has14000: catalog.files.some((file) => file.name.includes('14000')),
  };
}

module.exports = { readPossiblyUtf16Json, summarizeCakCatalog };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node cak-catalog-summary.js <catalog.json>');
    process.exit(2);
  }
  console.log(JSON.stringify(summarizeCakCatalog(readPossiblyUtf16Json(file)), null, 2));
}
