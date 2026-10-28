'use strict';
// Lane-local: compare the B4C0 control archive against the E6 native-body diagnostic.
// Levels: (1) member table (order/sizes/chunk layout), (2) extracted content hashes,
// (3) member-set and name differences, (4) per-member size deltas.
// usage: node compare-members.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const A = path.join(ROOT, 'extract-b4c0');
const B = path.join(ROOT, 'extract-e6');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function tree(root) {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'member-table.json' || e.name === '_extract-request.json') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full); else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  })(root);
  return out.sort();
}

const tableA = JSON.parse(fs.readFileSync(path.join(A, 'member-table.json'), 'utf8'));
const tableB = JSON.parse(fs.readFileSync(path.join(B, 'member-table.json'), 'utf8'));
const mapA = new Map(tableA.files.map(f => [f.name, f]));
const mapB = new Map(tableB.files.map(f => [f.name, f]));

const report = { schema: 'parallel-body/loading-control-audit/member-compare/v1', control: tableA.archive, candidate: tableB.archive, table: [], content: [], notes: [] };

// member table comparison in archive order
const maxLen = Math.max(tableA.files.length, tableB.files.length);
for (let i = 0; i < maxLen; i++) {
  const a = tableA.files[i], b = tableB.files[i];
  report.table.push({
    index: i,
    nameEqual: !!(a && b && a.name === b.name),
    control: a ? { name: a.name, offset: a.offset, stored: a.storedSize, expanded: a.expandedSize, compressed: a.compressed, chunks: a.chunkCount } : null,
    candidate: b ? { name: b.name, offset: b.offset, stored: b.storedSize, expanded: b.expandedSize, compressed: b.compressed, chunks: b.chunkCount } : null,
  });
}
for (const name of new Set([...mapA.keys(), ...mapB.keys()])) {
  const a = mapA.get(name), b = mapB.get(name);
  if (!a) { report.notes.push(`only-in-candidate: ${name}`); continue; }
  if (!b) { report.notes.push(`only-in-control: ${name}`); continue; }
  const sizeDiff = { stored: b.storedSize - a.storedSize, expanded: b.expandedSize - a.expandedSize };
  if (sizeDiff.stored !== 0) report.notes.push(`size-diff: ${name} stored ${a.storedSize}->${b.storedSize} (${sizeDiff.stored > 0 ? '+' : ''}${sizeDiff.stored})`);
}

// content comparison
for (const rel of new Set([...tree(A), ...tree(B)])) {
  const fa = path.join(A, rel), fb = path.join(B, rel);
  const ha = fs.existsSync(fa) ? sha(fa) : null;
  const hb = fs.existsSync(fb) ? sha(fb) : null;
  report.content.push({ archive: rel, controlSha256: ha, candidateSha256: hb, verdict: ha === hb ? 'identical' : (ha === null ? 'only-in-candidate' : (hb === null ? 'only-in-control' : 'different')), controlBytes: ha ? fs.statSync(fa).size : null, candidateBytes: hb ? fs.statSync(fb).size : null });
}
const diff = report.content.filter(r => r.verdict !== 'identical');
console.log(`member order identical: ${report.table.every(t => t.nameEqual)} (${tableA.files.length} vs ${tableB.files.length})`);
console.log(`content identical: ${report.content.length - diff.length}/${report.content.length}`);
for (const d of diff) console.log(`  ${d.verdict.padEnd(18)} ${d.archive}  ${d.controlBytes} -> ${d.candidateBytes}`);
for (const n of report.notes) console.log('  note:', n);
fs.writeFileSync(path.join(ROOT, 'member-compare.json'), JSON.stringify(report, null, 1));
console.log('written member-compare.json');
