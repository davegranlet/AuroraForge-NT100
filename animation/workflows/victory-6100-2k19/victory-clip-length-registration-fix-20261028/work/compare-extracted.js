'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(); }
function listFiles(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) return listFiles(root, full);
    return [path.relative(root, full).replace(/\\/g, '/')];
  }).sort();
}

const [baselineRoot, candidateRoot, outPath] = process.argv.slice(2);
if (!baselineRoot || !candidateRoot || !outPath) throw new Error('Usage: node compare-extracted.js <baselineExtracted> <candidateExtracted> <out.json>');
const base = path.resolve(baselineRoot);
const candidate = path.resolve(candidateRoot);
const baseFiles = listFiles(base);
const candidateFiles = listFiles(candidate);
const baseSet = new Set(baseFiles);
const candidateSet = new Set(candidateFiles);
const added = candidateFiles.filter((file) => !baseSet.has(file));
const removed = baseFiles.filter((file) => !candidateSet.has(file));
const common = baseFiles.filter((file) => candidateSet.has(file));

const changed = [];
const unchanged = [];
for (const relative of common) {
  const baseBytes = fs.readFileSync(path.join(base, ...relative.split('/')));
  const candidateBytes = fs.readFileSync(path.join(candidate, ...relative.split('/')));
  if (baseBytes.equals(candidateBytes)) {
    unchanged.push({ path: relative, bytes: baseBytes.length, sha256: sha256(baseBytes) });
    continue;
  }
  const byteDiff = [];
  const length = Math.max(baseBytes.length, candidateBytes.length);
  for (let offset = 0; offset < length; offset += 1) {
    if (baseBytes[offset] !== candidateBytes[offset]) {
      byteDiff.push({
        offset,
        before: offset < baseBytes.length ? baseBytes[offset].toString(16).padStart(2, '0').toUpperCase() : null,
        after: offset < candidateBytes.length ? candidateBytes[offset].toString(16).padStart(2, '0').toUpperCase() : null,
      });
    }
  }
  changed.push({
    path: relative,
    bytesBefore: baseBytes.length,
    bytesAfter: candidateBytes.length,
    sha256Before: sha256(baseBytes),
    sha256After: sha256(candidateBytes),
    differingByteCount: byteDiff.length,
    differingByteOffsets: byteDiff.map((entry) => entry.offset),
    byteDiff,
  });
}

const expectedPath = 'Cutscene/CaeAdvanced/1014003.jsfb';
const expectedOffsets = [1468, 1469];
const report = {
  schema: 'aurora-forge/victory-clip-length-registration-extracted-payload-delta/v1',
  generatedUtc: new Date().toISOString(),
  baseline: { root: base, fileCount: baseFiles.length },
  candidate: { root: candidate, fileCount: candidateFiles.length },
  added,
  removed,
  changed,
  unchangedCount: unchanged.length,
  expectedChangedPath: expectedPath,
  expectedDifferingByteOffsets: expectedOffsets,
  onlyExpectedPayloadChanged: changed.length === 1
    && changed[0].path === expectedPath
    && changed[0].differingByteOffsets.join(',') === expectedOffsets.join(',')
    && changed[0].byteDiff.map((entry) => entry.before).join('') === 'DA06'
    && changed[0].byteDiff.map((entry) => entry.after).join('') === '7409',
  pass: changed.length === 1
    && changed[0].path === expectedPath
    && changed[0].differingByteOffsets.join(',') === expectedOffsets.join(',')
    && changed[0].byteDiff.map((entry) => entry.before).join('') === 'DA06'
    && changed[0].byteDiff.map((entry) => entry.after).join('') === '7409'
    && unchanged.length === 42
    && added.length === 0
    && removed.length === 0,
};
fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  out: path.resolve(outPath),
  baselineFiles: baseFiles.length,
  candidateFiles: candidateFiles.length,
  changed: changed.map((entry) => ({ path: entry.path, sha256Before: entry.sha256Before, sha256After: entry.sha256After, differingByteOffsets: entry.differingByteOffsets })),
  unchangedCount: unchanged.length,
  added: added.length,
  removed: removed.length,
  pass: report.pass,
}, null, 2));
