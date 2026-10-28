'use strict';

// Aurora Forge-owned CAK comparison. Catalog metadata is useful for fast
// triage; extracted payload SHA-256 values are the authoritative byte delta.
// The tool is read-only with respect to both source archives.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { openArchive } = require('../../cak-foundry/electron/cak-reader');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function keyFor(file) {
  return file.name.replace(/\\/g, '/').toLowerCase();
}

function inventory(session) {
  const map = new Map();
  for (const file of session.files) {
    const key = keyFor(file);
    if (map.has(key)) throw new Error(`Duplicate virtual path in ${session.archiveName}: ${file.name}`);
    map.set(key, file);
  }
  return map;
}

function validateChunkTables(session) {
  return session.files.flatMap((file) => {
    const expectedChunks = Math.ceil(file.expandedSize / 0x100000);
    const chunks = file.chunks || [];
    const boundaries = chunks.map((chunk) => chunk.end);
    const monotonic = boundaries.every((end, index) => end > (index ? boundaries[index - 1] : 0));
    const reachesEnd = boundaries.length === 0 ? file.storedSize === 0 : boundaries[boundaries.length - 1] === file.storedSize;
    const countMismatch = file.compressed && chunks.length !== expectedChunks;
    const boundaryMismatch = boundaries.length > 0 && (!monotonic || !reachesEnd);
    return countMismatch || boundaryMismatch ? [{
      path: file.name,
      id: file.id,
      compressed: file.compressed,
      storedSize: file.storedSize,
      expandedSize: file.expandedSize,
      actualChunkCount: chunks.length,
      expectedChunkCount: file.compressed ? expectedChunks : null,
      monotonicBoundaries: monotonic,
      finalBoundaryMatchesStoredSize: reachesEnd
    }] : [];
  });
}

function safeOutputPath(root, relativePath) {
  const parts = String(relativePath).replace(/\\/g, '/').split('/');
  if (!parts.length || parts.some((part) => !part || part === '.' || part === '..' || part.includes(':'))) {
    throw new Error(`Unsafe archive output path: ${relativePath}`);
  }
  const full = path.resolve(root, ...parts);
  const prefix = path.resolve(root) + path.sep;
  if (!full.startsWith(prefix)) throw new Error(`Archive path escapes extraction root: ${relativePath}`);
  return full;
}

function invokeHelper(helper, request, requestPath) {
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  const result = cp.spawnSync(helper, [requestPath], {
    encoding: 'utf8', windowsHide: true, timeout: 600000, maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw new Error(String(result.error.message || 'Aurora CAK helper could not start.'));
  let report;
  try { report = JSON.parse(String(result.stdout || '').trim()); }
  catch { throw new Error(String(result.stderr || result.stdout || 'Aurora CAK helper returned invalid JSON.').trim()); }
  const results = report.results || report.Results;
  if (!Array.isArray(results) || results.length !== request.entries.length) throw new Error('Aurora CAK helper returned an incomplete extraction result.');
  return { exitCode: result.status, results };
}

function extractSession(session, outputRoot, helper, oodle) {
  fs.mkdirSync(outputRoot, { recursive: true });
  const files = session.files.filter((file) => file.extractable && file.expandedSize > 0
    && keyFor(file) !== 'hide/hidectrldata.hidelink.jsfb');
  for (const file of files) safeOutputPath(outputRoot, file.name);
  const request = {
    archivePath: session.archivePath,
    oodlePath: oodle,
    outputRoot,
    archiveKey: session.key,
    overwrite: false,
    entries: files.map((file) => ({
      id: file.id, offset: Number(file.offset), storedSize: file.storedSize,
      expandedSize: file.expandedSize, compressed: file.compressed,
      protected: file.protected, relativePath: file.name,
    }))
  };
  const requestPath = path.join(outputRoot, '..', `${path.basename(outputRoot)}-request.json`);
  let helperExitCode = null;
  let helperResults = null;
  const existing = files.map((file) => ({ file, full: safeOutputPath(outputRoot, file.name) }));
  const present = existing.filter((item) => fs.existsSync(item.full));
  if (present.length && present.length !== existing.length) throw new Error(`Partial extraction already exists in ${outputRoot}; refusing to overwrite or infer missing outputs.`);
  if (present.length) {
    for (const item of present) if (fs.statSync(item.full).size !== item.file.expandedSize) throw new Error(`Existing extraction size mismatch for ${item.file.name}`);
  } else {
    const result = invokeHelper(helper, request, requestPath);
    helperExitCode = result.exitCode;
    helperResults = result.results;
  }
  const payloads = files.map((file) => {
    const full = safeOutputPath(outputRoot, file.name);
    if (!fs.existsSync(full)) {
      const item = helperResults?.[files.indexOf(file)];
      return { key: keyFor(file), path: file.name, sha256: null, bytes: null, error: item?.Error || item?.error || 'No expanded output file was produced.' };
    }
    const bytes = fs.statSync(full).size;
    if (bytes !== file.expandedSize) return { key: keyFor(file), path: file.name, sha256: null, bytes, error: `Expanded size mismatch: ${bytes} != ${file.expandedSize}` };
    const item = helperResults?.[files.indexOf(file)];
    return { key: keyFor(file), path: file.name, sha256: sha256(full), bytes, error: item && !(item.Ok ?? item.ok) ? (item.Error || item.error || 'Aurora helper marked extraction unsuccessful.') : null };
  });
  return { payloads, helperExitCode, reused: Boolean(present.length) };
}

function compare(left, right, leftPayloads, rightPayloads) {
  const leftMap = inventory(left);
  const rightMap = inventory(right);
  const leftHashes = new Map(leftPayloads.map((item) => [item.key, item]));
  const rightHashes = new Map(rightPayloads.map((item) => [item.key, item]));
  const keys = [...new Set([...leftMap.keys(), ...rightMap.keys()])].sort();
  const entries = keys.map((key) => {
    const a = leftMap.get(key);
    const b = rightMap.get(key);
    if (!a) return { path: b.name, status: 'added-right', rightSha256: rightHashes.get(key)?.sha256 || null };
    if (!b) return { path: a.name, status: 'removed-right', leftSha256: leftHashes.get(key)?.sha256 || null };
    const metaA = { hash: a.hash, type: a.type, storedSize: a.storedSize, expandedSize: a.expandedSize, compressed: a.compressed, protected: a.protected, chunkCount: a.chunkCount, flags: a.flags };
    const metaB = { hash: b.hash, type: b.type, storedSize: b.storedSize, expandedSize: b.expandedSize, compressed: b.compressed, protected: b.protected, chunkCount: b.chunkCount, flags: b.flags };
    const leftPayload = leftHashes.get(key);
    const rightPayload = rightHashes.get(key);
    const bytesEqual = leftPayload?.sha256 && rightPayload?.sha256 ? leftPayload.sha256 === rightPayload.sha256 : null;
    const metadataEqual = JSON.stringify(metaA) === JSON.stringify(metaB);
    return {
      path: a.name,
      status: bytesEqual === null ? 'not-extracted' : bytesEqual ? 'byte-identical' : 'payload-different',
      leftSha256: leftPayload?.sha256 || null,
      rightSha256: rightPayload?.sha256 || null,
      leftExtractionError: leftPayload?.error || null,
      rightExtractionError: rightPayload?.error || null,
      metadataEqual,
      leftMetadata: metaA,
      rightMetadata: metaB
    };
  });
  const counts = Object.fromEntries(['byte-identical', 'payload-different', 'added-right', 'removed-right', 'not-extracted'].map((status) => [status, entries.filter((entry) => entry.status === status).length]));
  return {
    left: left.archivePath, right: right.archivePath, leftKey: left.key, rightKey: right.key,
    leftCatalogFiles: left.files.length, rightCatalogFiles: right.files.length, counts, entries,
    invalidChunkTables: { left: validateChunkTables(left), right: validateChunkTables(right) }
  };
}

function run(options = {}) {
  const leftPath = path.resolve(options.left || '');
  const rightPath = path.resolve(options.right || '');
  const output = path.resolve(options.output || '');
  if (!options.left || !options.right || !options.output) throw new Error('Usage: node animation/tools/compare-cak-payloads.js --left <CAK> --right <CAK> --out <new-output-dir> [--game <WWE 2K26 root>]');
  if (fs.existsSync(output)) throw new Error(`Output already exists; refusing to overwrite: ${output}`);
  const repo = path.resolve(__dirname, '..', '..');
  const foundry = path.join(repo, 'cak-foundry');
  const helper = path.join(foundry, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
  const game = path.resolve(options.game || 'C:/SteamLibrary/steamapps/common/WWE 2K26');
  const oodle = path.join(game, 'oo2core_9_win64.dll');
  const dictionary = JSON.parse(fs.readFileSync(path.join(foundry, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
  if (!fs.existsSync(helper) || !fs.existsSync(oodle)) throw new Error('Aurora CAK helper or game Oodle library not found.');
  const left = openArchive(leftPath, dictionary);
  const right = openArchive(rightPath, dictionary);
  fs.mkdirSync(output, { recursive: true });
  const leftExtract = extractSession(left, path.join(output, 'left'), helper, oodle);
  const rightExtract = extractSession(right, path.join(output, 'right'), helper, oodle);
  const report = compare(left, right, leftExtract.payloads, rightExtract.payloads);
  report.schema = 'aurora-forge-cak-payload-comparison/v1';
  report.extraction = {
    leftCount: leftExtract.payloads.length, rightCount: rightExtract.payloads.length,
    leftHelperExitCode: leftExtract.helperExitCode, rightHelperExitCode: rightExtract.helperExitCode,
    leftReusedCompleteExtraction: leftExtract.reused, rightReusedCompleteExtraction: rightExtract.reused,
    method: 'Aurora Forge CAK reader + AuroraCakHelper; per-entry results and expanded-size checked; SHA-256 per payload'
  };
  fs.writeFileSync(path.join(output, 'comparison.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run({ left: arg('--left'), right: arg('--right'), output: arg('--out'), game: arg('--game') });
    console.log(JSON.stringify({ output: path.resolve(arg('--out'), 'comparison.json'), counts: report.counts, leftCatalogFiles: report.leftCatalogFiles, rightCatalogFiles: report.rightCatalogFiles, extraction: report.extraction }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

module.exports = { compare, inventory, run, validateChunkTables };
