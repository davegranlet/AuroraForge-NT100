'use strict';

// Build a deterministic coverage ledger for every function recovered from the
// 2026-10-30 decompilation pass.  Decompiled C is evidence; this ledger keeps
// production implementation status explicit instead of treating a decompiler
// row as an Aurora Forge tool.
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: node decompilation-function-coverage.js <function-index.csv> <output.json>');
  process.exit(2);
}

const [input, output] = process.argv.slice(2);
if (!input || !output) usage();
const text = fs.readFileSync(input, 'utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
if (lines.length < 2) throw new Error('Function index is empty');

function parseLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && quoted) { field += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(field); field = ''; continue; }
    field += ch;
  }
  out.push(field);
  return out;
}

const header = parseLine(lines[0]).map((name, i) => i === 0 ? name.replace(/^\uFEFF/, '') : name);
const index = Object.fromEntries(header.map((name, i) => [name, i]));
for (const required of ['output_file', 'function_name', 'address', 'decompiled']) {
  if (!(required in index)) throw new Error(`Missing CSV column: ${required}`);
}

const functions = lines.slice(1).map((line, row) => {
  const fields = parseLine(line);
  const decompiled = fields[index.decompiled] === 'True';
  const status = decompiled ? 'reference-only' : 'unsupported-no-body';
  return {
    id: row + 1,
    binary: fields[index.output_file],
    function: fields[index.function_name],
    address: fields[index.address],
    decompiled,
    status,
    tool: null,
    evidence: `decompilation-refresh/${fields[index.output_file]}`,
    classification: decompiled ? 'recovered-decompilation-not-ported' : 'no-recovered-body',
    note: decompiled ? 'Recovered decompilation is evidence; no verified Aurora Forge port is registered.' : 'No decompiled body was recovered; retain an explicit unsupported adapter.'
  };
});

const summary = {
  schema: 'aurora-forge-function-coverage/v1',
  generated: new Date().toISOString(),
  source: path.resolve(input),
  total: functions.length,
  decompiled: functions.filter(item => item.decompiled).length,
  notDecompiled: functions.filter(item => !item.decompiled).length,
  statuses: {
    'reference-only': functions.filter(item => item.status === 'reference-only').length,
    'unsupported-no-body': functions.filter(item => item.status === 'unsupported-no-body').length
  },
  functions
};
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ output: path.resolve(output), total: summary.total, decompiled: summary.decompiled, notDecompiled: summary.notDecompiled }));
