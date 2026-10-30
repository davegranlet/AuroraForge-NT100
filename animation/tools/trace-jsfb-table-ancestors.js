'use strict';

// Aurora read-only structural trace of reverse references to a JSFB table.
// Useful for locating an Arena component in its containing scene graph without
// assigning unnamed table fields semantics.
const fs = require('node:fs');
const path = require('node:path');
const { inspect } = require('./inspect-jsfb-graph');

function trace(file, targetOffset, maxDepth = 12, maxNodes = 500) {
  const absolute = path.resolve(file), bytes = fs.readFileSync(absolute), graph = inspect(absolute);
  const reverse = new Map();
  const add = (to, edge) => { if (!reverse.has(to)) reverse.set(to, []); reverse.get(to).push(edge); };
  for (const table of graph.tables) for (const field of table.fields) {
    if (field.ref?.kind === 'table') add(field.ref.target, { from: table.offset, field: field.id, via: 'table' });
    if (field.ref?.kind === 'vector' && field.ref.tables === field.ref.count) {
      for (let index = 0; index < field.ref.count; index++) {
        const slot = field.ref.target + 4 + index * 4, relative = bytes.readUInt32LE(slot);
        if (relative) add(slot + relative, { from: table.offset, field: field.id, via: 'vector', index });
      }
    }
  }
  const tables = new Map(graph.tables.map(table => [table.offset, table]));
  const queue = [{ offset: targetOffset, depth: 0, path: [] }], seen = new Set(), paths = [];
  while (queue.length && seen.size < maxNodes) {
    const current = queue.shift();
    if (seen.has(current.offset) || current.depth > maxDepth) continue;
    seen.add(current.offset);
    const parents = reverse.get(current.offset) ?? [];
    const table = tables.get(current.offset);
    if (table?.offset === graph.rootOffset || parents.length === 0) paths.push(current);
    for (const edge of parents) queue.push({ offset: edge.from, depth: current.depth + 1,
      path: [...current.path, { child: current.offset, ...edge }] });
  }
  const rows = paths.map(item => ({ ...item,
    tables: [item.offset, ...[...item.path].reverse().map(edge => edge.child)].map(offset => {
      const table = tables.get(offset);
      return { offset, root: offset === graph.rootOffset,
        strings: table?.fields.filter(field => field.ref?.kind === 'string').map(field => ({ field: field.id, value: field.ref.value })) ?? [],
        numericFields: table?.fields.filter(field => field.present !== false && !field.ref).map(field => ({ id: field.id,
          width: field.storageWidth, bytes: field.storageBytes, u32: field.u32, f32: field.f32 })) ?? [] };
    }) }));
  return { schema: 'aurora-forge/jsfb-reverse-reference-trace/v1', file: absolute,
    sha256: graph.sha256, rootOffset: graph.rootOffset, targetOffset, maxDepth, maxNodes,
    visited: seen.size, terminalPaths: rows };
}

if (require.main === module) {
  try {
    const [file, offsetText, output, depth = '12'] = process.argv.slice(2);
    if (!file || !offsetText || !output) throw new Error('Usage: node trace-jsfb-table-ancestors.js <file.jsfb> <table-offset> <new-report.json> [max-depth]');
    const offset = Number(offsetText);
    if (!Number.isSafeInteger(offset) || offset < 4) throw new Error('table offset must be a safe integer >= 4');
    const report = trace(file, offset, Number(depth));
    const dest = path.resolve(output); fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: dest, visited: report.visited, terminalPaths: report.terminalPaths.length }, null, 2));
  } catch (error) { console.error(`JSFB ancestor trace failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { trace };
