'use strict';

const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(process.argv[2] || '');
const extractedRoot = path.resolve(process.argv[3] || '');
const outputPath = path.resolve(process.argv[4] || path.join(__dirname, '..', 'app', 'data', 'cak-texture-headers.json'));

if (!fs.existsSync(csvPath) || !fs.statSync(csvPath).isFile()) throw new Error('registry CSV was not found.');
if (!fs.existsSync(extractedRoot) || !fs.statSync(extractedRoot).isDirectory()) throw new Error('The WWE 2K26 extracted Root folder was not found.');

function reverseHexBytes(value) {
  return String(value).match(/../g).reverse().join('').toLowerCase();
}

function readDdsHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const base = Buffer.alloc(128);
    if (fs.readSync(fd, base, 0, base.length, 0) !== base.length) return null;
    if (base.subarray(0, 4).toString('ascii') !== 'DDS ') return null;
    const headerSize = base.subarray(84, 88).toString('ascii') === 'DX10' ? 148 : 128;
    if (headerSize === 128) return base;
    const extended = Buffer.alloc(headerSize);
    base.copy(extended);
    if (fs.readSync(fd, extended, 128, 20, 128) !== 20) return null;
    return extended;
  } finally {
    fs.closeSync(fd);
  }
}

const csv = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const lines = csv.split(/\r?\n/).filter(Boolean);
if (!/^Asset\/Directory GUID,Full Path$/i.test(lines[0].trim())) throw new Error('The CSV does not have the expected registry export header.');

const headers = [];
const headerIndexes = new Map();
const entries = {};
const missing = [];
let textureRows = 0;
let invalidDds = 0;

for (let index = 1; index < lines.length; index += 1) {
  const match = /^(.*),([0-9a-fA-F]{16})$/.exec(lines[index]);
  if (!match) continue;
  const registryPath = match[1].replace(/^\"|\"$/g, '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!/\.tex$/i.test(registryPath)) continue;
  textureRows += 1;
  const ddsRelativePath = registryPath.slice(0, -4) + '.dds';
  const ddsPath = path.join(extractedRoot, ...ddsRelativePath.split('/'));
  if (!fs.existsSync(ddsPath) || !fs.statSync(ddsPath).isFile()) {
    missing.push(ddsRelativePath);
    continue;
  }
  const header = readDdsHeader(ddsPath);
  if (!header) {
    invalidDds += 1;
    missing.push(ddsRelativePath);
    continue;
  }
  const encoded = header.toString('base64');
  let headerIndex = headerIndexes.get(encoded);
  if (headerIndex === undefined) {
    headerIndex = headers.length;
    headers.push(encoded);
    headerIndexes.set(encoded, headerIndex);
  }
  entries[reverseHexBytes(match[2])] = headerIndex;
  if (textureRows % 10000 === 0) console.log(`Scanned ${textureRows.toLocaleString()} texture paths...`);
}

const catalog = {
  schemaVersion: 1,
  game: 'WWE 2K26',
  source: path.basename(csvPath),
  textureRows,
  mappedTextures: Object.keys(entries).length,
  uniqueHeaders: headers.length,
  invalidDds,
  missingTextures: missing.length,
  headers,
  entries
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(catalog) + '\n', 'utf8');
console.log(JSON.stringify({
  textureRows,
  mappedTextures: catalog.mappedTextures,
  missingTextures: missing.length,
  invalidDds,
  uniqueHeaders: headers.length,
  firstMissing: missing.slice(0, 25),
  output: outputPath,
  outputBytes: fs.statSync(outputPath).size
}, null, 2));

if (missing.length || invalidDds) process.exitCode = 2;
