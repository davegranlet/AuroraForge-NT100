'use strict';

// Aurora Forge read-only lookup of FNV-1a64 identities embedded in printable
// JSFB strings. Matches are candidates only; they do not establish schema.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MASK64 = 0xFFFFFFFFFFFFFFFFn;
function fnv1a64(bytes) {
  let hash = 0xCBF29CE484222325n;
  for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * 0x100000001B3n) & MASK64;
  return hash.toString(16).toUpperCase().padStart(16, '0');
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function normalize(value) {
  const hex = String(value).replace(/^0x/i, '').toUpperCase();
  if (!/^[0-9A-F]{1,16}$/.test(hex)) throw new Error(`invalid 64-bit identity: ${value}`);
  return hex.padStart(16, '0');
}
function scanFile(file, targets, hits, maxHits) {
  const bytes = fs.readFileSync(file);
  let start = -1;
  const check = end => {
    if (start < 0) return;
    const length = end - start;
    if (length >= 1 && length <= 256) {
      const value = bytes.subarray(start, end);
      for (const [normalization, candidate] of [
        ['exact', value],
        ['lowercase-ascii', Buffer.from(value.map(byte => byte >= 0x41 && byte <= 0x5A ? byte + 0x20 : byte))],
      ]) {
        const identity = fnv1a64(candidate);
        if (targets.has(identity) && hits[identity].length < maxHits) {
          hits[identity].push({ file, offset: start, length, string: value.toString('ascii'), normalization });
        }
      }
    }
    start = -1;
  };
  for (let index = 0; index <= bytes.length; index++) {
    const byte = index < bytes.length ? bytes[index] : 0;
    if (byte >= 0x20 && byte <= 0x7E) { if (start < 0) start = index; }
    else check(index);
  }
  return bytes.length;
}
function run({ inventoryPath, targetValues, outputPath, maxHits = 50 }) {
  const inventoryFile = path.resolve(inventoryPath), outputFile = path.resolve(outputPath);
  if (fs.existsSync(outputFile)) throw new Error(`refusing to overwrite ${outputFile}`);
  const inventoryBytes = fs.readFileSync(inventoryFile);
  const inventory = JSON.parse(inventoryBytes.toString('utf8'));
  if (!Array.isArray(inventory)) throw new Error('inventory must be a JSON array of file records');
  const entries = inventory.filter(entry => String(entry.Extension).toLowerCase() === '.jsfb' && entry.FullPath);
  const targets = new Set(targetValues.map(normalize));
  const hits = Object.fromEntries([...targets].map(target => [target, []]));
  const errors = [];
  let bytesRead = 0;
  for (const entry of entries) {
    try { bytesRead += scanFile(entry.FullPath, targets, hits, maxHits); }
    catch (error) { errors.push({ file: entry.FullPath, error: error.message }); }
  }
  const report = {
    schema: 'aurora-forge/jsfb-fnv64-identity-search/v1',
    inventory: inventoryFile,
    inventorySha256: sha256(inventoryBytes),
    algorithm: 'FNV-1a64 over printable ASCII runs, exact and ASCII-lowercase',
    extensions: ['.jsfb'], filesSelected: entries.length, filesRead: entries.length - errors.length,
    bytesRead, readErrors: errors, hits, maxHitsPerIdentity: maxHits,
    limits: ['Searches printable ASCII strings only; misses do not rule out non-ASCII, encoded, or synthesized names.',
      'A hash match is a candidate string identity, not proof of the game-side schema or runtime meaning.'],
  };
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2), get = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
    const inventoryPath = get('--inventory'), outputPath = get('--out');
    const targetValues = (get('--targets') || '').split(',').map(value => value.trim()).filter(Boolean);
    const maxHits = Number(get('--max-hits') || 50);
    if (!inventoryPath || !outputPath || !targetValues.length) throw new Error('Usage: node scan-jsfb-fnv64-identities.js --inventory <FILES.json> --targets <hex,...> --out <new-report.json> [--max-hits 50]');
    const report = run({ inventoryPath, targetValues, outputPath, maxHits });
    process.stdout.write(`${JSON.stringify({ output: path.resolve(outputPath), filesRead: report.filesRead,
      filesSelected: report.filesSelected, bytesRead: report.bytesRead, readErrors: report.readErrors.length,
      hits: Object.fromEntries(Object.entries(report.hits).map(([identity, values]) => [identity, values.length ? values : 'none'])) }, null, 2)}\n`);
  } catch (error) { console.error(`JSFB FNV-1a64 identity search failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { fnv1a64, run };
