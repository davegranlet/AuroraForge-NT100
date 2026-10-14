'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildPackage } = require('./build-2k19-to-2k20-victory-package');

const DEFAULT_YANM20_OFFSET = 37212;

function usage() {
  return `Usage:\n  node tools/batch-2k19-to-2k20-victory-packages.js --source19Dir <dir> --fop19Dir <dir> --reference20Root <dir> --outputRoot <dir> [--ids 6100,6101] [--dry-run true]\n  node tools/batch-2k19-to-2k20-victory-packages.js --manifest <manifest.json> --outputRoot <dir> [--dry-run true]\n\nManifest form:\n[\n  {\n    "id": "6100",\n    "source19": "D:/path/to/decoded/body.bin",\n    "fop19": "D:/path/to/source.0fop",\n    "referenceActs20": "D:/path/to/6100.acts",\n    "referenceEvd20": "D:/path/to/6100.evd"\n  }\n]\n`;
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) throw new Error(`unexpected argument ${key}`);
    const name = key.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      out[name] = true;
    } else {
      out[name] = value;
      index += 1;
    }
  }
  if (out.ids) out.ids = String(out.ids).split(',').map((id) => normalizeId(id.trim())).filter(Boolean);
  if (out.section !== undefined) out.section = Number(out.section);
  if (out['yanm-offset'] !== undefined) out.yanmOffset = Number(out['yanm-offset']);
  out.dryRun = out['dry-run'] === true || String(out['dry-run']).toLowerCase() === 'true';
  return out;
}

function normalizeId(value) {
  const digits = String(value || '').match(/\d+/)?.[0];
  if (!digits) return null;
  return digits.replace(/^0+(?=\d)/, '').padStart(4, '0');
}

function walkFiles(root) {
  const resolved = path.resolve(root);
  if (!fs.existsSync(resolved)) return [];
  const out = [];
  const stack = [resolved];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  return out;
}

function idsFromPath(filePath) {
  const text = filePath.replace(/\\/g, '/');
  const out = new Set();
  for (const match of text.matchAll(/(?<!\d)0?([1-9]\d{3})(?!\d)/g)) {
    out.add(match[1].padStart(4, '0'));
  }
  return [...out];
}

function addCandidate(map, id, file, score) {
  if (!id) return;
  const item = { file, score };
  const existing = map.get(id);
  if (!existing || item.score > existing.score || (item.score === existing.score && file.length < existing.file.length)) {
    map.set(id, item);
  }
}

function indexSourceMotions(source19Dir) {
  const map = new Map();
  for (const file of walkFiles(source19Dir)) {
    const lower = file.toLowerCase();
    if (!lower.endsWith('.bin') && !lower.endsWith('.yanm')) continue;
    const ids = idsFromPath(file);
    if (!ids.length) continue;
    let score = 1;
    if (lower.includes('entry_0_(zlib)')) score += 10;
    if (lower.includes('decoded-shdc')) score += 3;
    if (lower.includes('entry_1_(zlib)')) score -= 20;
    for (const id of ids) addCandidate(map, id, file, score);
  }
  return map;
}

function indexFops(fop19Dir) {
  const map = new Map();
  for (const file of walkFiles(fop19Dir)) {
    const lower = file.toLowerCase();
    if (!lower.endsWith('.0fop') && !lower.endsWith('.fop') && !lower.endsWith('.bin')) continue;
    const ids = idsFromPath(file);
    if (!ids.length) continue;
    let score = 1;
    if (lower.endsWith('.0fop')) score += 10;
    if (lower.includes('event')) score += 2;
    for (const id of ids) addCandidate(map, id, file, score);
  }
  return map;
}

function indexReferences(reference20Root) {
  const acts = new Map();
  const evd = new Map();
  for (const file of walkFiles(reference20Root)) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.acts' && ext !== '.evd') continue;
    const id = normalizeId(path.basename(file, ext));
    if (!id) continue;
    if (ext === '.acts') addCandidate(acts, id, file, 10);
    else addCandidate(evd, id, file, 10);
  }
  return { acts, evd };
}

function rowFromManifest(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new Error('manifest rows must be objects');
  }
  const id = normalizeId(item.id || item.animationId || item.slot || item.source19 || item.referenceActs20);
  return {
    id,
    source19: item.source19,
    fop19: item.fop19,
    referenceActs20: item.referenceActs20,
    referenceEvd20: item.referenceEvd20,
  };
}

function buildRows(options) {
  if (options.manifest) {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(options.manifest), 'utf8'));
    if (!Array.isArray(manifest)) throw new Error('manifest must be a JSON array');
    return manifest.map(rowFromManifest);
  }

  for (const name of ['source19Dir', 'fop19Dir', 'reference20Root']) {
    if (!options[name]) throw new Error(`${name} is required without --manifest`);
  }
  const sources = indexSourceMotions(options.source19Dir);
  const fops = indexFops(options.fop19Dir);
  const references = indexReferences(options.reference20Root);
  const ids = options.ids || [...new Set([...sources.keys(), ...fops.keys(), ...references.acts.keys(), ...references.evd.keys()])].sort();
  return ids.map((id) => ({
    id,
    source19: sources.get(id)?.file,
    fop19: fops.get(id)?.file,
    referenceActs20: references.acts.get(id)?.file,
    referenceEvd20: references.evd.get(id)?.file,
  }));
}

function validateRow(row) {
  const missing = [];
  for (const field of ['id', 'source19', 'fop19', 'referenceActs20', 'referenceEvd20']) {
    if (!row[field]) missing.push(field);
    else if (field !== 'id' && !fs.existsSync(path.resolve(row[field]))) missing.push(`${field}:not_found`);
  }
  return missing;
}

function runBatch(options) {
  if (!options.outputRoot) throw new Error('outputRoot is required');
  const rows = buildRows(options);
  if (!rows.length) throw new Error('no batch rows matched');
  const results = [];
  for (const row of rows) {
    const missing = validateRow(row);
    if (missing.length) {
      results.push({ ok: false, id: row.id || null, stage: 'match', missing, row });
      continue;
    }
    if (options.dryRun) {
      results.push({ ok: true, id: row.id, stage: 'dry-run', row });
      continue;
    }
    try {
      const result = buildPackage({
        source19: row.source19,
        fop19: row.fop19,
        referenceActs20: row.referenceActs20,
        referenceEvd20: row.referenceEvd20,
        outputRoot: options.outputRoot,
        id: row.id,
        section: options.section || 0,
        yanmOffset: options.yanmOffset || DEFAULT_YANM20_OFFSET,
      });
      results.push(result);
    } catch (error) {
      results.push({ ok: false, id: row.id, stage: 'package', error: error.message, row });
    }
  }
  const summary = {
    ok: results.every((result) => result.ok),
    outputRoot: path.resolve(options.outputRoot),
    total: results.length,
    succeeded: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
  return summary;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const summary = runBatch(options);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!summary.ok) process.exitCode = 2;
  } catch (error) {
    console.error(`2K19 to 2K20 batch build failed: ${error.message}`);
    console.error(usage());
    process.exitCode = 1;
  }
}

module.exports = {
  runBatch,
  buildRows,
  indexSourceMotions,
  indexFops,
  indexReferences,
  idsFromPath,
  normalizeId,
};
