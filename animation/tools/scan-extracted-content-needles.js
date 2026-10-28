'use strict';

// Aurora Forge read-only full-corpus byte sweep. Reads every file in a saved
// Aurora inventory (all extensions, including binary/model/texture files),
// searches for supplied or built-in byte identities, validates file count and
// observed byte lengths, and writes a compact evidence report outside the
// source extraction. It does not modify source files.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { performance } = require('node:perf_hooks');

const DEFAULT_NEEDLES = [
  ['ascii:Ring_Target', Buffer.from('Ring_Target', 'ascii')],
  ['ascii:TGT_center', Buffer.from('TGT_center', 'ascii')],
  ['ascii:SetPlace', Buffer.from('SetPlace', 'ascii')],
  ['ascii:Ring', Buffer.from('Ring', 'ascii')],
  ['ascii:Camera01', Buffer.from('Camera01', 'ascii')],
  ['ascii:J_Root', Buffer.from('J_Root', 'ascii')],
  ['ascii:tgt.Camera', Buffer.from('tgt.Camera', 'ascii')],
  ['u32le:component-F02E11D4', Buffer.from([0xd4, 0x11, 0x2e, 0xf0])],
  ['u32be:component-F02E11D4', Buffer.from([0xf0, 0x2e, 0x11, 0xd4])],
  ['u32le:marker-00040001', Buffer.from([0x01, 0x00, 0x04, 0x00])],
  ['u32le:marker-00100014', Buffer.from([0x14, 0x00, 0x10, 0x00])],
  ['u32le:marker-0020001B', Buffer.from([0x1b, 0x00, 0x20, 0x00])],
  ['u64le:fnv64-Ring-DCEA4D2BFA11CEEB', Buffer.from([0xeb, 0xce, 0x11, 0xfa, 0x2b, 0x4d, 0xea, 0xdc])],
  ['u64le:camera-channel-54D1B2A64667E32E', Buffer.from([0x2e, 0xe3, 0x67, 0x46, 0xa6, 0xb2, 0xd1, 0x54])],
  ['u64le:camera-channel-5A3744A0D6E080B1', Buffer.from([0xb1, 0x80, 0xe0, 0xd6, 0xa0, 0x44, 0x37, 0x5a])],
  ['u64le:camera-channel-188FD8CF51F19C95', Buffer.from([0x95, 0x9c, 0xf1, 0x51, 0xcf, 0xd8, 0x8f, 0x18])],
];

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    result[key.slice(2)] = value;
  }
  if (!result.inventory || !result.report) {
    throw new Error('Usage: node scan-extracted-content-needles.js --inventory <FILES.json> --report <report.json>');
  }
  return result;
}

async function scanFile(file, needles, chunkBytes) {
  const counts = new Uint32Array(needles.length);
  const positions = Array.from({ length: needles.length }, () => []);
  let size = 0;
  let tail = Buffer.alloc(0);
  const maxNeedleLength = needles.reduce((max, needle) => Math.max(max, needle.bytes.length), 0);
  for await (const chunk of fs.createReadStream(file, { highWaterMark: chunkBytes })) {
    const joined = tail.length ? Buffer.concat([tail, chunk]) : chunk;
    const firstNewStart = Math.max(0, tail.length - maxNeedleLength + 1);
    for (let n = 0; n < needles.length; n++) {
      const needle = needles[n].bytes;
      let offset = firstNewStart;
      while ((offset = joined.indexOf(needle, offset)) !== -1) {
        const absolute = size - tail.length + offset;
        counts[n]++;
        if (positions[n].length < 4) positions[n].push(absolute);
        offset++;
      }
    }
    size += chunk.length;
    const keep = maxNeedleLength - 1;
    tail = joined.subarray(Math.max(0, joined.length - keep));
  }
  return { size, counts, positions };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const inventoryPath = path.resolve(args.inventory);
  const reportPath = path.resolve(args.report);
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  if (!Array.isArray(inventory) || inventory.length === 0) throw new Error('Inventory must be a non-empty JSON array');
  const root = path.resolve(inventory[0].FullPath, '..');
  // The first file may be root-level; resolve root from the documented FILES.json Root when present.
  const reportRoot = path.resolve(inventory.root || inventory.Root || root);
  const needles = DEFAULT_NEEDLES.map(([label, bytes]) => ({ label, bytes }));
  const totals = needles.map(() => ({ hits: 0, files: 0, byExtension: new Map(), topFiles: [] }));
  const extensions = new Map();
  let processed = 0, bytesRead = 0, missing = 0, sizeMismatches = 0, readErrors = 0;
  let oversizedBytesSkipped = 0;
  const oversizedFilesSkipped = [];
  const errors = [];
  const start = performance.now();
  let lastProgressAt = start;
  const concurrency = Math.max(1, Math.min(32, Number(args.concurrency || Math.min(12, os.cpus().length))));
  const maxFileBytes = Number(args['max-file-bytes'] || Number.MAX_SAFE_INTEGER);
  const chunkBytes = 4 * 1024 * 1024;
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= inventory.length) return;
      const row = inventory[index];
      const fullPath = path.resolve(row.FullPath || path.join(reportRoot, ...(row.RelativePath || '').split(/[\\/]/)));
      const ext = String(row.Extension || path.extname(fullPath) || '<none>').toLowerCase();
      try {
        const stat = await fs.promises.stat(fullPath);
        if (!stat.isFile()) throw new Error('not a regular file');
        if (Number(row.Length) !== stat.size) sizeMismatches++;
        if (stat.size > maxFileBytes) {
          oversizedBytesSkipped += stat.size;
          oversizedFilesSkipped.push({ path: row.RelativePath || path.relative(reportRoot, fullPath).replace(/\\/g, '/'), bytes: stat.size, extension: ext });
          continue;
        }
        const result = await scanFile(fullPath, needles, chunkBytes);
        if (result.size !== stat.size) sizeMismatches++;
        bytesRead += result.size;
        processed++;
        extensions.set(ext, (extensions.get(ext) || 0) + 1);
        for (let n = 0; n < needles.length; n++) {
          const hits = result.counts[n];
          if (!hits) continue;
          const summary = totals[n];
          summary.hits += hits;
          summary.files++;
          summary.byExtension.set(ext, (summary.byExtension.get(ext) || 0) + hits);
          if (summary.topFiles.length < 256 || hits > summary.topFiles.at(-1).hits) {
            summary.topFiles.push({ path: row.RelativePath || path.relative(reportRoot, fullPath).replace(/\\/g, '/'), hits, positions: result.positions[n] });
            summary.topFiles.sort((a, b) => b.hits - a.hits || a.path.localeCompare(b.path));
            if (summary.topFiles.length > 256) summary.topFiles.length = 256;
          }
        }
      } catch (error) {
        if (error.code === 'ENOENT') missing++;
        else readErrors++;
        if (errors.length < 100) errors.push({ path: row.RelativePath, error: String(error.message || error) });
      }
      const now = performance.now();
      if (now - lastProgressAt >= 5000) {
        const seconds = (now - start) / 1000;
        process.stderr.write(`progress files=${processed}/${inventory.length} bytes=${bytesRead} rateMiBps=${(bytesRead / 1048576 / seconds).toFixed(1)} missing=${missing} errors=${readErrors}\n`);
        lastProgressAt = now;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedSeconds = (performance.now() - start) / 1000;
  const report = {
    schema: 'aurora-forge/extracted-content-needle-scan/v1',
    inventory: inventoryPath,
    root: reportRoot,
    startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
    completedAt: new Date().toISOString(),
    filesExpected: inventory.length,
    filesRead: processed,
    filesSkippedAboveLimit: oversizedFilesSkipped.length,
    bytesSkippedAboveLimit: oversizedBytesSkipped,
    maxFileBytes,
    oversizedFilesSkipped,
    totalBytesRead: bytesRead,
    elapsedSeconds,
    averageMiBPerSecond: bytesRead / 1048576 / elapsedSeconds,
    concurrency,
    filesMissing: missing,
    sizeMismatches,
    readErrors,
    extensionsSeen: Object.fromEntries([...extensions].sort(([a], [b]) => a.localeCompare(b))),
    needles: totals.map((summary, i) => ({
      label: needles[i].label,
      hex: needles[i].bytes.toString('hex').toUpperCase(),
      hitCount: summary.hits,
      filesWithHits: summary.files,
      hitsByExtension: Object.fromEntries([...summary.byExtension].sort(([a], [b]) => a.localeCompare(b))),
      highestHitFiles: summary.topFiles,
    })),
    errors,
    complete: processed + oversizedFilesSkipped.length === inventory.length && missing === 0 && sizeMismatches === 0 && readErrors === 0,
    limits: ['Every inventoried file at or below maxFileBytes was byte-scanned; larger files are listed with exact sizes and were not read, as requested.', 'Compressed/encoded content must be decoded by its format reader before semantic interpretation.', 'Hit counts are evidence of byte occurrences, not schema meaning.'],
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ filesRead: processed, filesExpected: inventory.length, totalBytesRead: bytesRead, elapsedSeconds, averageMiBPerSecond: report.averageMiBPerSecond, missing, sizeMismatches, readErrors, complete: report.complete, report: reportPath })}\n`);
}

run().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
