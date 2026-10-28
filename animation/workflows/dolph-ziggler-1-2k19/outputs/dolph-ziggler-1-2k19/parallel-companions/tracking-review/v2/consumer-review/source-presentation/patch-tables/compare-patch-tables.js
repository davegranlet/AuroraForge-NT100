'use strict';
// compare-patch-tables.js — base vs p10/p20/p30 evt_data tables index-by-index:
// sizes, line counts, content, 273/phase-id occurrences, and row-id overlap to
// establish patch precedence (replace vs append).
const fs = require('node:fs');
const path = require('node:path');
const baseDir = path.join(__dirname, '..', 'evt-data');
const out = { schema: 'aurora-forge-parallel-companions/evt-data-patch-compare-v1', generated: new Date().toISOString(), tables: [] };

function readText(dir, i) {
  const f = fs.readdirSync(dir).find((x) => new RegExp(`^0-${i}_`).test(x) && x.endsWith('.decoded.bin'));
  if (!f) return null;
  const text = fs.readFileSync(path.join(dir, f), 'latin1');
  return { file: f, lines: text.split(/\r?\n/).filter((l) => l.trim().length), text };
}
function firstCols(lines) {
  return lines.map((l) => l.trim().split(/\s+/)[0]);
}

for (const [tag, max] of [['p10', 15], ['p20', 10], ['p30', 12]]) {
  const dir = path.join(__dirname, tag);
  for (let i = 0; i <= max; i++) {
    const p = readText(dir, i);
    if (!p) continue;
    const b = readText(baseDir, i);
    const baseCols = b ? firstCols(b.lines) : [];
    const patchCols = firstCols(p.lines);
    const overlap = patchCols.filter((c) => baseCols.includes(c));
    const replaced = overlap.length > 0 && p.lines.length !== (b ? b.lines.length : 0);
    out.tables.push({
      patch: tag, table: i,
      baseLines: b ? b.lines.length : null, patchLines: p.lines.length,
      baseSample: b ? b.lines.slice(0, 2) : null, patchSample: p.lines.slice(0, 4),
      firstColOverlapWithBase: overlap.length,
      firstCols: patchCols.slice(0, 24),
      has273: p.text.includes('273'),
      hasPhaseIds: /10273|11273|12273|13273|14273/.test(p.text),
    });
    console.log(`${tag} table ${i}: baseLines=${b ? b.lines.length : '-'} patchLines=${p.lines.length} firstColOverlap=${overlap.length}`);
    console.log(`   patch sample: ${p.lines.slice(0, 3).join(' | ').slice(0, 150)}`);
  }
}
fs.writeFileSync(path.join(__dirname, 'patch-compare.json'), JSON.stringify(out, null, 1));
console.log('written patch-compare.json');
