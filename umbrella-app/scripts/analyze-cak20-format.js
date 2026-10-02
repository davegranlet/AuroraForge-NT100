'use strict';

const fs = require('fs');
const path = require('path');
const { decodePairs, keyFromFirstMask } = require('../electron/cak-reader');

const projectRoot = path.resolve(__dirname, '..');
const gameFolder = process.env.AURORA_WWE2K20_FOLDER || 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE2K20';
const extractedRoot = process.env.AURORA_WWE2K20_ROOT || 'D:\\WWE26-mods\\extracts\\2k20\\Root';
const cakeToolsRoot = path.join(projectRoot, '_research', 'CakeTools-AlphaPreview');

const u32 = (value) => value >>> 0;
const hex32 = (value) => u32(value).toString(16).padStart(8, '0');

function readSlice(filePath, size, offset = 0) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(size);
    const count = fs.readSync(fd, buffer, 0, size, offset);
    return buffer.subarray(0, count);
  } finally {
    fs.closeSync(fd);
  }
}

function words(buffer, offset = 0, count = Math.floor((buffer.length - offset) / 4)) {
  return Array.from({ length: count }, (_, index) => buffer.readUInt32LE(offset + index * 4));
}

function printableAsciiRuns(buffer, minLength = 5) {
  const runs = [];
  let current = '';
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    const value = buffer[index];
    if (value >= 32 && value < 127) {
      if (!current) start = index;
      current += String.fromCharCode(value);
    } else {
      if (current.length >= minLength) runs.push({ offset: start, value: current });
      current = '';
    }
  }
  if (current.length >= minLength) runs.push({ offset: start, value: current });
  return runs;
}

function headerLooksLikeCak20(decoded, archiveSize) {
  if (decoded.length < 84) return false;
  const w = words(decoded, 0, 21);
  if (w[0] > 500000 || w[1] > 500000) return false;
  if (w[3] !== w[1] * 12 || w[6] !== w[0] * 12) return false;
  const sizes = [w[3], w[6], w[9], w[12], w[15]];
  const offsets = [w[5], w[8], w[11], w[14], w[17]];
  if (sizes.some((size) => size > archiveSize)) return false;
  if (offsets.some((offset) => offset < 92 || offset > archiveSize)) return false;
  for (let index = 0; index < 4; index += 1) {
    if (offsets[index] + sizes[index] !== offsets[index + 1]) return false;
  }
  return offsets[4] + sizes[4] <= archiveSize && w[20] <= archiveSize;
}

function tryCurrentReaderFamily(filePath) {
  const size = fs.statSync(filePath).size;
  const prefix = readSlice(filePath, 92);
  const rawHeader = prefix.subarray(8, 92);
  const candidates = [
    0,
    0xffffffff,
    0xc0010806,
    0x060801c0,
    0x300,
    0x6,
    0x7,
    0x8,
    0x9,
    keyFromFirstMask(u32(rawHeader.readUInt32LE(0) ^ 0)),
    keyFromFirstMask(u32(rawHeader.readUInt32LE(0) ^ 1)),
    keyFromFirstMask(u32(rawHeader.readUInt32LE(0) ^ 6))
  ];
  const matches = [];
  for (const key of [...new Set(candidates.map(u32))]) {
    const decoded = decodePairs(rawHeader, key);
    if (headerLooksLikeCak20(decoded, size)) {
      matches.push({ key: hex32(key), words: words(decoded, 0, 21).map(hex32) });
    }
  }
  return matches;
}

function compareBuffers(files) {
  if (files.length < 2) return [];
  const buffers = files.map((file) => fs.readFileSync(file));
  const shortest = Math.min(...buffers.map((buffer) => buffer.length));
  const ranges = [];
  let rangeStart = -1;
  for (let offset = 0; offset < shortest; offset += 1) {
    const same = buffers.every((buffer) => buffer[offset] === buffers[0][offset]);
    if (!same && rangeStart < 0) rangeStart = offset;
    if ((same || offset === shortest - 1) && rangeStart >= 0) {
      ranges.push({ start: rangeStart, end: same ? offset - 1 : offset });
      rangeStart = -1;
    }
  }
  return ranges;
}

function readArcPaths() {
  const arcPath = path.join(extractedRoot, 'Chunk1-pc.arc');
  if (!fs.existsSync(arcPath)) return { arcPath, paths: [] };
  const bytes = fs.readFileSync(arcPath);
  const start = bytes.length >= 40 ? bytes.readUInt32LE(36) : 0;
  const paths = [];
  let current = '';
  for (let cursor = start; cursor < bytes.length; cursor += 1) {
    const value = bytes[cursor];
    if (value === 0) {
      const clean = current.trim();
      if (/^(?:debug\\|pac\\)/i.test(clean)) paths.push(clean);
      current = '';
    } else if (value >= 32 && value < 127) current += String.fromCharCode(value);
    else current = '';
  }
  return { arcPath, paths };
}

function describeFile(filePath) {
  const stat = fs.statSync(filePath);
  const prefix = readSlice(filePath, Math.min(1024, stat.size));
  return {
    name: path.basename(filePath),
    path: filePath,
    bytes: stat.size,
    signature: prefix.subarray(0, 4).toString('ascii'),
    firstWords: words(prefix, 0, Math.min(16, Math.floor(prefix.length / 4))).map(hex32),
    asciiRuns: printableAsciiRuns(prefix).slice(0, 8),
    currentReaderMatches: tryCurrentReaderFamily(filePath)
  };
}

function main() {
  const installed = fs.existsSync(gameFolder)
    ? fs.readdirSync(gameFolder).filter((name) => /^bakedfile\d+\.cak$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => path.join(gameFolder, name))
    : [];
  const templates = fs.existsSync(cakeToolsRoot)
    ? fs.readdirSync(cakeToolsRoot).filter((name) => /^bakedfile\d+\.cak$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => path.join(cakeToolsRoot, name))
    : [];
  const arc = readArcPaths();
  const proofTargets = arc.paths.slice(0, 12).map((entry) => {
    const fullPath = path.join(extractedRoot, entry);
    return { entry, exists: fs.existsSync(fullPath), bytes: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0 };
  });

  const report = {
    gameFolder,
    extractedRoot,
    installedArchiveCount: installed.length,
    templateArchiveCount: templates.length,
    installed: installed.map(describeFile),
    templates: templates.map(describeFile),
    templateDifferingRanges: compareBuffers(templates).map((range) => ({ start: `0x${range.start.toString(16)}`, end: `0x${range.end.toString(16)}`, bytes: range.end - range.start + 1 })),
    arcPath: arc.arcPath,
    arcPathCount: arc.paths.length,
    proofTargets
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
