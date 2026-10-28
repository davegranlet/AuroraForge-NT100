'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');

function scan(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.clips')) files.push(full);
    }
  }
  walk(root);
  const results = [];
  const rejected = [];
  for (const file of files) {
    try {
      const parsed = parseFile(file, { includeRaw: false });
      results.push({ file: path.relative(root, file), bytes: parsed.bytes, records: parsed.count,
        profiles: parsed.records.map(record => ({ index: record.index, id: record.id, tracks: record.trackIdentifiers.length,
          frameValue: record.frameValue, fps: record.fps, group78: record.sections[3].count,
          group90: record.group90Profile })) });
    } catch (error) { rejected.push({ file: path.relative(root, file), error: error.message }); }
  }
  return { root, schema: 'aurora-forge-clips-corpus/v1', files: files.length, parsed: results.length, rejected, results };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/scan-clips-corpus.js <root> [output.json]');
    const report = scan(path.resolve(process.argv[2]));
    const output = process.argv[3] && path.resolve(process.argv[3]);
    if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ root: report.root, files: report.files, parsed: report.parsed, rejected: report.rejected.length, output: output || null }, null, 2));
  } catch (error) { console.error(`clips corpus scan failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { scan };
