'use strict';

// Aurora read-only comparison of raw numeric field-0 records for matching
// named nodes across existing arena/environment context-reader outputs. It
// reports exact recurrence only; it does not label axes or coordinate space.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase(); }
function numericLeaves(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const x of node) numericLeaves(x, out); return out; }
  if (Number.isFinite(node.f32) && node.ref == null && node.child == null) out.push(node.f32);
  for (const [k, v] of Object.entries(node)) if (k !== 'f32') numericLeaves(v, out);
  return out;
}
function collect(reportPath, label, namePattern) {
  const report = load(reportPath), rows = [];
  for (const file of report.files || []) for (const namedNode of file.namedNodes || []) {
    if (!namePattern.test(namedNode.name || '')) continue;
    for (const parent of namedNode.parents || []) {
      const field0 = parent.ownerTree?.fields?.find(f => f.id === 0);
      rows.push({
        label, file: file.file, fileSha256: file.sourceSha256,
        nodeName: namedNode.name, nodeTable: namedNode.nameTable,
        ownerTable: parent.owner, ownerField: parent.field,
        field0Target: field0?.ref?.target ?? null,
        field0NumericLeaves: numericLeaves(field0?.child || null),
      });
    }
  }
  return rows;
}
function run(arenaContext, environmentContext, outputPath) {
  const pattern = /(?:^|\\)Ring_Target$/i;
  const arena = collect(arenaContext, 'Arena', pattern);
  const environment = collect(environmentContext, 'Environment', pattern);
  const matches = [];
  for (const e of environment) for (const a of arena) {
    const ev = e.field0NumericLeaves, av = a.field0NumericLeaves;
    if (!ev.length || ev.length !== av.length || !ev.every((v, i) => Math.abs(v - av[i]) <= 1e-5)) continue;
    matches.push({ values: ev, environment: e, arena: a });
  }
  const result = {
    schema: 'aurora-forge/named-node-raw-numeric-record-comparison/v1',
    inputs: [
      { label: 'Arena', path: path.resolve(arenaContext), sha256: sha256(arenaContext) },
      { label: 'Environment', path: path.resolve(environmentContext), sha256: sha256(environmentContext) },
    ],
    matchRule: 'Exact ordered float32 leaf sequence in the named-node parent field-0 subtree, tolerance <= 1e-5.',
    interpretationLimit: 'This proves raw numeric sequence recurrence only. It does not establish field semantics, units, axes, coordinate space, or Victory runtime consumption.',
    arenaNamedParents: arena.length,
    environmentNamedParents: environment.length,
    exactSequenceMatches: matches,
  };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  return result;
}
if (require.main === module) {
  try {
    const [arena, environment, output] = process.argv.slice(2);
    if (!arena || !environment || !output) throw new Error('Usage: node compare-named-node-numeric-records.js <arena-context.json> <environment-context.json> <new-output.json>');
    const result = run(arena, environment, output);
    console.log(JSON.stringify({ output: path.resolve(output), arenaNamedParents: result.arenaNamedParents,
      environmentNamedParents: result.environmentNamedParents, exactSequenceMatches: result.exactSequenceMatches.length }, null, 2));
  } catch (error) { console.error(`Named-node numeric comparison failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { run };
