'use strict';

// Aurora Forge read-only structural trace for literal named nodes in Arena
// JSFBs. It reports validated parent tables and nearby scalar fields without
// assigning those fields a world-transform or axis meaning.
const fs = require('node:fs');
const path = require('node:path');
const { inspect } = require('./inspect-jsfb-graph');

function fieldSummary(field) {
  return { id: field.id, at: field.at, storageWidth: field.storageWidth ?? null,
    storageBytes: field.storageBytes ?? null, u32: field.u32 ?? null,
    i32: field.i32 ?? null, f32: field.f32 ?? null,
    ref: field.ref ? { kind: field.ref.kind, value: field.ref.value ?? null,
      target: field.ref.target ?? null, count: field.ref.count ?? null,
      tables: field.ref.tables ?? null } : null };
}
function analyze(scanPath, pattern = 'Ring_Target') {
  const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
  const matcher = new RegExp(pattern, 'i');
  const files = [...new Set(scan.references.map(hit => hit.fullPath))].sort();
  const results = [];
  for (const file of files) {
    const graph = inspect(file), bytes = fs.readFileSync(file);
    const tables = new Map(graph.tables.map(table => [table.offset, table]));
    const names = [];
    for (const table of graph.tables) for (const field of table.fields) {
      if (field.ref?.kind === 'string' && matcher.test(field.ref.value)) names.push({ table, field });
    }
    const incoming = new Map();
    const add = (offset, edge) => { if (!incoming.has(offset)) incoming.set(offset, []); incoming.get(offset).push(edge); };
    for (const table of graph.tables) for (const field of table.fields) {
      if (field.ref?.kind === 'table') add(field.ref.target, { owner: table.offset, field: field.id, kind: 'table' });
      if (field.ref?.kind === 'vector' && field.ref.tables === field.ref.count) {
        for (let i = 0; i < field.ref.count; i++) {
          const slot = field.ref.target + 4 + i * 4, relative = bytes.readUInt32LE(slot);
          if (relative) add(slot + relative, { owner: table.offset, field: field.id, kind: 'vector', index: i });
        }
      }
    }
    const summarizeTree = (offset, depth, seen) => {
      if (seen.has(offset) || depth > 3) return null;
      seen.add(offset);
      const table = tables.get(offset); if (!table) return null;
      const fields = table.fields.map(field => ({ ...fieldSummary(field),
        child: field.ref?.kind === 'table' ? summarizeTree(field.ref.target, depth + 1, seen) : null }));
      return { offset: table.offset, fields };
    };
    const records = names.map(({ table, field }) => {
      const parents = incoming.get(table.offset) || [];
      return { nameTable: table.offset, nameField: field.id, name: field.ref.value,
        parents: parents.map(edge => ({ ...edge,
          ownerTree: summarizeTree(edge.owner, 0, new Set()) })) };
    });
    results.push({ file: path.resolve(file), sourceSha256: graph.sha256,
      identifier: graph.identifier, validatedTables: graph.tableCount,
      graphTruncated: graph.truncated, namedNodes: records });
  }
  return { schema: 'aurora-forge/arena-named-node-context/v1',
    scan: path.resolve(scanPath), pattern, filesScanned: files.length,
    files: results,
    limits: ['Only validated graph table/string references are followed.',
      'Scalar bytes and values are structural observations; no axis, unit, world/local-space, or runtime-consumer semantics are assigned.'] };
}
if (require.main === module) {
  try {
    const [scanPath, output, pattern = 'Ring_Target'] = process.argv.slice(2);
    if (!scanPath || !output) throw new Error('Usage: node analyze-arena-named-node-context.js <literal-scan.json> <new-report.json> [path-regex]');
    const out = path.resolve(output);
    if (fs.existsSync(out)) throw new Error(`refusing to overwrite ${out}`);
    const report = analyze(scanPath, pattern);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ output: out, filesScanned: report.filesScanned,
      namedNodes: report.files.reduce((sum, file) => sum + file.namedNodes.length, 0) }, null, 2));
  } catch (error) { console.error(`Arena named-node analysis failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { analyze };
