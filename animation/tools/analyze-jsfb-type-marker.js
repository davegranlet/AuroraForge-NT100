'use strict';

// Correlate a raw JSFB scalar marker with its validated table neighborhood.
// This exposes structural evidence only; names/field semantics stay unassigned.
const fs = require('node:fs');
const path = require('node:path');
const { inspect } = require('./inspect-jsfb-graph');

function analyze(scanReportPath, markerHex, maxDepth = 4) {
  const scanReport = JSON.parse(fs.readFileSync(scanReportPath, 'utf8'));
  const marker = Number(BigInt(markerHex.startsWith('0x') ? markerHex : `0x${markerHex}`));
  const files = [...new Set(scanReport.references.map(hit => hit.fullPath))].sort();
  const results = [];
  for (const file of files) {
    const graph = inspect(file);
    const bytes = fs.readFileSync(file);
    const tables = new Map(graph.tables.map(table => [table.offset, table]));
    const markerTables = graph.tables.filter(table => table.fields.some(field => field.u32 === marker));
    for (const root of markerTables) {
      const queue = [{ offset: root.offset, depth: 0 }], seen = new Set(), neighborhood = [], strings = new Set();
      while (queue.length) {
        const { offset, depth } = queue.shift();
        if (seen.has(offset) || depth > maxDepth) continue;
        seen.add(offset);
        const table = tables.get(offset);
        if (!table) continue;
        const fields = table.fields.map(field => {
          if (field.ref?.kind === 'string') strings.add(field.ref.value);
          if (field.ref?.kind === 'table' && depth < maxDepth) queue.push({ offset: field.ref.target, depth: depth + 1 });
          if (field.ref?.kind === 'vector' && field.ref.tables === field.ref.count && depth < maxDepth) {
            for (let i = 0; i < field.ref.count; i++) {
              const slot = field.ref.target + 4 + i * 4;
              const relative = bytes.readUInt32LE(slot);
              if (relative) queue.push({ offset: slot + relative, depth: depth + 1 });
            }
          }
          return { id: field.id, storageWidth: field.storageWidth ?? null,
            storageBytes: field.storageBytes ?? null, bytes: field.bytes || null, u32: field.u32 ?? null,
            i32: field.i32 ?? null, f32: field.f32 ?? null,
            ref: field.ref ? { kind: field.ref.kind, value: field.ref.value, target: field.ref.target,
              count: field.ref.count, tables: field.ref.tables } : null };
        });
        neighborhood.push({ offset, depth, fields });
      }
      results.push({ file: path.resolve(file), sha256: graph.sha256, identifier: graph.identifier,
        markerTableOffset: root.offset, markerFields: root.fields.filter(field => field.u32 === marker).map(field => field.id),
        strings: [...strings].filter(Boolean), neighborhood });
    }
  }
  return { schema: 'aurora-forge/jsfb-type-marker-analysis/v1', scanReport: path.resolve(scanReportPath),
    markerHex: `0x${marker.toString(16).toUpperCase().padStart(8, '0')}`, filesWithRawHits: files.length,
    matchedTables: results.length, results,
    limits: ['The scalar marker is matched by raw numeric value only.', 'Neighborhood structure does not establish component or transform field semantics.'] };
}
if (require.main === module) {
  try {
    const [scanReport, marker, out, depth = '4'] = process.argv.slice(2);
    if (!scanReport || !marker || !out) throw new Error('Usage: node analyze-jsfb-type-marker.js <scan-report.json> <hex-u32> <new-output.json> [depth]');
    const output = path.resolve(out);
    if (fs.existsSync(output)) throw new Error('refusing to overwrite ' + output);
    const result = analyze(scanReport, marker, Number(depth));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output, filesWithRawHits: result.filesWithRawHits, matchedTables: result.matchedTables }, null, 2));
  } catch (error) { console.error('JSFB type-marker analysis failed: ' + error.message); process.exitCode = 1; }
}
module.exports = { analyze };
