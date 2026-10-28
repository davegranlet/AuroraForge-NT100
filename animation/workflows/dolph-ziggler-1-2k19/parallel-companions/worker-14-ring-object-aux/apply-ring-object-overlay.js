'use strict';
// apply-ring-object-overlay.js — Worker 4 lane-local generic applier.
// Applies an Aurora Forge Worker-4 overlay plan (plan.json) to any 2K26 .clips base
// whose records carry the pinned ids. Non-swapped records are preserved byte-for-byte;
// a base whose sha256 does not match the plan pin is refused unless --allow-unpinned.
//
// Usage:
//   node apply-ring-object-overlay.js --plan <plan.json> --base-dir <dir> --out-dir <dir> [--allow-unpinned]
const fs = require('node:fs');
const path = require('node:path');
const { applyOverlay, sha256 } = require('./ring-object-overlay-lib.js');

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const planPath = opt('--plan');
  if (!planPath) throw new Error('--plan is required');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  if (!['aurora-forge/worker14-ring-object-overlay-plan/v1', 'aurora-forge/worker14-ring-object-rope-only-plan/v1'].includes(plan.schema)) throw new Error(`unexpected plan schema ${plan.schema}`);
  const allowUnpinned = args.includes('--allow-unpinned');
  const baseDir = opt('--base-dir', plan.baseDir).replace(/\\/g, '/');
  const outDir = opt('--out-dir', path.join(__dirname, 'out', 'applied')).replace(/\\/g, '/');
  const planDir = path.dirname(planPath);
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (const file of plan.files) {
    const basePath = path.join(baseDir, file.file);
    const base = fs.readFileSync(basePath);
    const actual = sha256(base);
    if (actual !== file.baseSha256 && !allowUnpinned) {
      throw new Error(`base ${file.file} sha ${actual} != plan pin ${file.baseSha256}; refusing (use --allow-unpinned to override)`);
    }
    const swaps = new Map();
    for (const swap of file.swaps) {
      const payloadPath = path.resolve(planDir, swap.payloadFile);
      const payload = fs.readFileSync(payloadPath);
      const payloadSha = sha256(payload);
      if (payloadSha !== swap.payloadSha256) throw new Error(`payload ${swap.payloadFile} sha ${payloadSha} != plan pin ${swap.payloadSha256}`);
      if (!swaps.has(swap.recordId)) swaps.set(swap.recordId, payload);
      else if (!swaps.get(swap.recordId).equals(payload)) throw new Error(`conflicting payloads for ${swap.recordId}`);
    }
    const { buffer, applied } = applyOverlay(base, swaps);
    const outPath = path.join(outDir, file.file);
    fs.writeFileSync(outPath, buffer);
    results.push({ file: file.file, basePath, baseSha256: actual, basePinned: actual === file.baseSha256, outPath, outSha256: sha256(buffer), outBytes: buffer.length, applied });
    console.log(`${file.file}: ${applied.length} record swaps -> ${buffer.length}B sha ${sha256(buffer)} (base pinned=${actual === file.baseSha256})`);
  }
  const outManifest = { schema: 'aurora-forge/worker14-ring-object-overlay-applied/v1', generated: new Date().toISOString(), plan: planPath, baseDir, outDir, results };
  const manifestPath = path.join(outDir, 'applied-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(outManifest, null, 1));
  console.log(`written ${manifestPath}`);
}

if (require.main === module) main();
