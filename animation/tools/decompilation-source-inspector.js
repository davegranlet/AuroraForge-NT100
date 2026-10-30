'use strict';

// Inspect recovered C evidence for any indexed function. This is an Aurora
// Forge analysis tool, not an assertion that decompiled native behavior has
// been ported into production.
const fs = require('fs');
const path = require('path');

function die(message) { console.error(message); process.exit(2); }
const [indexPath, selector, mode = 'inspect'] = process.argv.slice(2);
if (!indexPath || !selector) die('Usage: node decompilation-source-inspector.js <function-index.csv> <id|address|binary:function> [inspect|body|calls]');

function csv(line) {
  const fields = []; let value = ''; let quote = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"' && quote) { value += '"'; i += 1; }
    else if (c === '"') quote = !quote;
    else if (c === ',' && !quote) { fields.push(value); value = ''; }
    else value += c;
  }
  fields.push(value); return fields;
}
const rows = fs.readFileSync(indexPath, 'utf8').split(/\r?\n/).filter(Boolean);
const header = csv(rows.shift()).map((v, i) => i === 0 ? v.replace(/^\uFEFF/, '') : v);
const col = Object.fromEntries(header.map((v, i) => [v, i]));
const entries = rows.map((line, i) => { const f = csv(line); return { id: i + 1, binary: f[col.output_file], function: f[col.function_name], address: f[col.address], decompiled: f[col.decompiled] === 'True' }; });
const item = /^\d+$/.test(selector) ? entries[Number(selector) - 1] : entries.find(e => e.address.toLowerCase() === selector.toLowerCase() || `${e.binary}:${e.function}`.toLowerCase() === selector.toLowerCase());
if (!item) die(`Function not found: ${selector}`);
const source = path.resolve(path.dirname(indexPath), 'ghidra-output', item.binary);
const result = { ...item, source, status: item.decompiled ? 'recovered-evidence' : 'no-recovered-body' };
if (!item.decompiled || !fs.existsSync(source)) {
  result.body = null;
  result.calls = [];
} else {
  const text = fs.readFileSync(source, 'utf8');
  const start = text.indexOf(`${item.function}(`);
  if (start < 0) { result.body = null; result.calls = []; result.status = 'indexed-but-not-found-in-output'; }
  else {
    const brace = text.indexOf('{', start);
    let depth = 0; let end = brace;
    for (; brace >= 0 && end < text.length; end += 1) { if (text[end] === '{') depth += 1; else if (text[end] === '}' && --depth === 0) { end += 1; break; } }
    result.body = text.slice(start, end);
    result.calls = [...result.body.matchAll(/\b(FUN_[0-9a-f]+)\s*\(/gi)].map(m => m[1]).filter(name => name !== item.function);
  }
}
if (mode === 'body') console.log(result.body || '');
else if (mode === 'calls') console.log(JSON.stringify({ id: result.id, function: result.function, calls: result.calls }, null, 2));
else console.log(JSON.stringify(result, null, 2));
