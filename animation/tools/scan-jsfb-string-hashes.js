'use strict';

// Aurora Forge read-only lookup of likely 32-bit string hashes in an existing
// JSFB file inventory. Supports raw/lowercase FNV-1a32 and CRC32 because the
// game uses CRC32 for normalized names in at least one inspected runtime path.
// A hit is a candidate string match, not schema proof.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) { let c = 0xFFFFFFFF; for (const b of bytes) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (~c) >>> 0; }
function fnv1a32(bytes) { let h = 0x811C9DC5; for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function normalizeTarget(s) { const x = s.replace(/^0x/i, '').toUpperCase(); if (!/^[0-9A-F]{1,8}$/.test(x)) throw new Error(`invalid 32-bit hash: ${s}`); return x.padStart(8, '0'); }
function variants(bytes) {
  const original = bytes, lower = Buffer.from(bytes);
  for (let i = 0; i < lower.length; i++) if (lower[i] >= 0x41 && lower[i] <= 0x5A) lower[i] += 0x20;
  return [
    { normalization: 'raw', bytes: original },
    { normalization: 'lowercase-ascii', bytes: lower },
  ];
}
function scanFile(file, targets, hits, maxHits) {
  const bytes = fs.readFileSync(file);
  let start = -1;
  const check = (end) => {
    if (start < 0) return;
    const length = end - start;
    if (length >= 3 && length <= 256) {
      const value = bytes.subarray(start, end);
      for (const variant of variants(value)) {
        for (const [algorithm, hash] of [['fnv1a32', fnv1a32(variant.bytes)], ['crc32', crc32(variant.bytes)]]) {
          const key = hash.toString(16).toUpperCase().padStart(8, '0');
          if (targets.has(key) && hits[key].length < maxHits) hits[key].push({ file, offset: start, length,
            string: value.toString('ascii'), algorithm, normalization: variant.normalization });
        }
      }
    }
    start = -1;
  };
  for (let i = 0; i <= bytes.length; i++) {
    const b = i < bytes.length ? bytes[i] : 0;
    if (b >= 0x20 && b <= 0x7E) { if (start < 0) start = i; }
    else check(i);
  }
  return bytes.length;
}
function run({ inventoryPath, targetValues, outputPath, maxHits = 50 }) {
  const absoluteInventory = path.resolve(inventoryPath), absoluteOutput = path.resolve(outputPath);
  if (fs.existsSync(absoluteOutput)) throw new Error(`refusing to overwrite ${absoluteOutput}`);
  const inventory = JSON.parse(fs.readFileSync(absoluteInventory, 'utf8'));
  if (!Array.isArray(inventory)) throw new Error('inventory must be a JSON array of file records');
  const entries = inventory.filter(entry => String(entry.Extension).toLowerCase() === '.jsfb' && entry.FullPath);
  const targetLabels = new Map(targetValues.map(value => [normalizeTarget(value), String(value)]));
  const targets = new Set(targetLabels.keys()), hits = Object.fromEntries([...targets].map(key => [key, []]));
  const errors = [];
  let bytesRead = 0;
  for (const entry of entries) {
    const file = entry.FullPath;
    try { bytesRead += scanFile(file, targets, hits, maxHits); }
    catch (error) { errors.push({ file, error: error.message }); }
  }
  const report = { schema: 'aurora-forge/jsfb-string-hash-search/v1', inventory: absoluteInventory,
    inventorySha256: sha256(fs.readFileSync(absoluteInventory)), targets: [...targetLabels].map(([hash, label]) => ({ label, hash })),
    extensions: ['.jsfb'], filesSelected: entries.length, filesRead: entries.length - errors.length, bytesRead, readErrors: errors,
    hits, maxHitsPerHash: maxHits,
    limits: ['Searches printable ASCII runs present verbatim in JSFB files.',
      'Only raw and ASCII-lowercased FNV-1a32/CRC32 are checked; no match does not rule out hashed names, encoded strings, or another hash algorithm.',
      'A string-hash match is a candidate only and does not prove the game assigns that schema meaning.'] };
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2), get = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
    const inventoryPath = get('--inventory'), outputPath = get('--out');
    const targetValues = (get('--targets') || '').split(',').map(s => s.trim()).filter(Boolean);
    const maxHits = Number(get('--max-hits') || 50);
    if (!inventoryPath || !outputPath || !targetValues.length) throw new Error('Usage: node scan-jsfb-string-hashes.js --inventory <FILES.json> --targets <hex,...> --out <new-report.json> [--max-hits 50]');
    const report = run({ inventoryPath, targetValues, outputPath, maxHits });
    console.log(JSON.stringify({ output: path.resolve(outputPath), filesRead: report.filesRead, filesSelected: report.filesSelected,
      bytesRead: report.bytesRead, readErrors: report.readErrors.length,
      hits: Object.fromEntries(Object.entries(report.hits).map(([key, value]) => [key, value.length ? value : 'none'])) }, null, 2));
  } catch (error) { console.error(`JSFB string hash search failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { run, fnv1a32, crc32 };
