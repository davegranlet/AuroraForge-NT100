#!/usr/bin/env node
'use strict';

/*
 * Exhaustive, read-only asset inventory for an extracted WWE game root.
 * Usage:
 *   node tools/audit-extracted-root.js <root> <output-directory>
 *
 * Produces one CSV row per file plus a JSON summary. It reads only metadata
 * and the first 32 bytes of each file; it never modifies the input root.
 */

const fs = require('fs');
const path = require('path');

const [rootArg, outputArg] = process.argv.slice(2);
if (!rootArg || !outputArg) {
  console.error('Usage: node tools/audit-extracted-root.js <root> <output-directory>');
  process.exit(2);
}

const root = path.resolve(rootArg);
const outputDir = path.resolve(outputArg);
if (!fs.statSync(root).isDirectory()) throw new Error(`Not a directory: ${root}`);
fs.mkdirSync(outputDir, { recursive: true });

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function signature(filePath) {
  const handle = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(32);
    const count = fs.readSync(handle, buffer, 0, buffer.length, 0);
    const sample = buffer.subarray(0, count);
    const ascii = sample.toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    return { hex: sample.toString('hex').toUpperCase(), ascii };
  } finally {
    fs.closeSync(handle);
  }
}

function classify(relativePath, ext, ascii) {
  const lower = relativePath.toLowerCase();
  const has = (...terms) => terms.some((term) => lower.includes(term));
  if (ext === '.clips') return ['high', 'Modern motion clip container'];
  if (ext === '.adefs') return ['high', 'Animation definition / motion metadata'];
  if (ext === '.acts' || ext === '.anims' || ext === '.yanm') return ['high', 'Animation payload'];
  if (ext === '.yobj' || ext === '.jboy' || ext === '.wdf' || ext === '.mskinfo') return ['high', 'Model or skeleton candidate'];
  if (ext === '.pac' || ext === '.hspc' || ext === '.epk8') return ['high', 'Archive/container candidate'];
  if (ext === '.jsfb' && has('animation', 'motion', 'victory', 'entrance', 'moveset', 'character')) return ['high', 'Structured table in animation-relevant path'];
  if (has('animation', 'animbank', 'motion', 'victory', 'entrance', 'moveset')) return ['medium', 'Animation-relevant path; format requires inspection'];
  if (has('skeleton', 'rig', 'bone', 'model', 'character')) return ['medium', 'Model/skeleton-relevant path; format requires inspection'];
  if (ext === '.jsfb' || ext === '.cbin' || ext === '.tbl' || ext === '.db' || ext === '.sdb') return ['medium', 'Structured-data candidate'];
  if (ext === '.bin' || ext === '.dat' || ascii.startsWith('PAC ') || ascii.startsWith('HSPC')) return ['medium', 'Unclassified binary/container candidate'];
  if (['.dds', '.bk2', '.ysh', '.pkfx', '.mtls', '.jmtl', '.hpl', '.ywa', '.corr_ywa'].includes(ext)) return ['low', 'Texture, video, shader, material, physics, or appearance asset'];
  return ['low', 'No immediate animation-converter relevance from path/type/signature'];
}

const ledgerPath = path.join(outputDir, 'root-per-file-capability-ledger.csv');
const ledger = fs.createWriteStream(ledgerPath, { encoding: 'utf8' });
ledger.write('relative_path,bytes,extension,signature_hex,signature_ascii,relevance,capability_assessment\n');

const summary = { root, generatedAt: new Date().toISOString(), files: 0, bytes: 0, extensions: {}, relevance: {}, errors: [] };
const stack = [root];
while (stack.length) {
  const directory = stack.pop();
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { stack.push(absolute); continue; }
    if (!entry.isFile()) continue;
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    const ext = path.extname(entry.name).toLowerCase() || '[none]';
    let bytes = 0;
    let sig = { hex: '', ascii: '' };
    let relevance = 'error';
    let assessment = 'Could not inspect';
    try {
      bytes = fs.statSync(absolute).size;
      sig = signature(absolute);
      [relevance, assessment] = classify(relative, ext, sig.ascii);
    } catch (error) {
      summary.errors.push({ relative, message: error.message });
    }
    ledger.write([relative, bytes, ext, sig.hex, sig.ascii, relevance, assessment].map(csv).join(',') + '\n');
    summary.files += 1;
    summary.bytes += bytes;
    summary.extensions[ext] = (summary.extensions[ext] || 0) + 1;
    summary.relevance[relevance] = (summary.relevance[relevance] || 0) + 1;
  }
}
ledger.end();
fs.writeFileSync(path.join(outputDir, 'root-capability-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ledgerPath, summaryPath: path.join(outputDir, 'root-capability-summary.json'), files: summary.files, relevance: summary.relevance, errors: summary.errors.length }, null, 2));
