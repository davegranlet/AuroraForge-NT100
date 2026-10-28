'use strict';

// Aurora-owned read-only compact structural index for inventory-selected
// Cutscene JSFBs. It retains observed strings and reference shape, but does not
// assign unknown fields semantic names.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inspect } = require('./inspect-jsfb-graph');
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function run(manifestPath, outputPath, options = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = manifest.filter(e => /^Cutscene\//i.test(String(e.RelativePath || '').replaceAll('\\', '/'))
    && String(e.Extension || path.extname(e.RelativePath || '')).toLowerCase() === '.jsfb');
  const rows = [];
  for (const e of files) {
    const file = e.FullPath || path.resolve(options.extractionRoot || path.dirname(manifestPath), e.RelativePath);
    const relativePath = String(e.RelativePath || path.relative(options.extractionRoot, file)).replaceAll('\\', '/');
    try {
      const graph = inspect(file, options.maxTables || 10000);
      const strings = new Set(), vectorShapes = new Set(), refKinds = { table: 0, vector: 0, string: 0, unresolved: 0 };
      for (const table of graph.tables) for (const field of table.fields) {
        if (field.ref) {
          refKinds[field.ref.kind] = (refKinds[field.ref.kind] || 0) + 1;
          if (field.ref.kind === 'string' && field.ref.value) strings.add(field.ref.value);
          if (field.ref.kind === 'vector') vectorShapes.add(`${field.ref.kind}:${field.ref.count}:${field.ref.tables || 0}:${field.ref.strings || 0}`);
        } else if (field.present !== false) refKinds.unresolved++;
      }
      rows.push({ file: relativePath, sha256: graph.sha256, bytes: graph.bytes, identifier: graph.identifier,
        rootOffset: graph.rootOffset, tables: graph.tableCount, truncated: graph.truncated,
        strings: [...strings].sort(), vectorShapes: [...vectorShapes].sort(), refKinds });
    } catch (error) {
      let hash = null; try { hash = sha256(fs.readFileSync(file)); } catch {}
      rows.push({ file: relativePath, sha256: hash, parse: 'failed', error: error.message });
    }
  }
  rows.sort((a, b) => a.file.localeCompare(b.file));
  const summary = { schema: 'aurora-forge/cutscene-jsfb-corpus-index/v1', sourceManifest: path.resolve(manifestPath),
    files: rows.length, parsed: rows.filter(x => x.tables !== undefined).length,
    failed: rows.filter(x => x.parse === 'failed').length, truncated: rows.filter(x => x.truncated).length,
    totalTables: rows.reduce((n, x) => n + (x.tables || 0), 0), records: rows };
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  return summary;
}

if (require.main === module) {
  try {
    const [manifest, output] = process.argv.slice(2);
    if (!manifest || !output) throw new Error('Usage: node index-cutscene-jsfb-corpus.js <FILES.json> <new-report.json>');
    const result = run(manifest, path.resolve(output));
    console.log(JSON.stringify({ output: path.resolve(output), files: result.files, parsed: result.parsed,
      failed: result.failed, truncated: result.truncated, totalTables: result.totalTables }, null, 2));
  } catch (error) { console.error('Cutscene JSFB inventory failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { run };
