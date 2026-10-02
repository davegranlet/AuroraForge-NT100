'use strict';
// Partition the md index into N balanced batches (by bytes) for parallel reading.
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname;
const docs = JSON.parse(fs.readFileSync(path.join(HERE, 'index.json'), 'utf8'));
const N = 8;
// newest-first, then greedy-fill the smallest batch
docs.sort((a, b) => b.mtime.localeCompare(a.mtime));
const batches = Array.from({ length: N }, () => ({ bytes: 0, docs: [] }));
for (const doc of docs) {
  batches.sort((a, b) => a.bytes - b.bytes);
  batches[0].docs.push(doc);
  batches[0].bytes += doc.bytes;
}
let total = 0;
for (let i = 0; i < N; i++) {
  const b = batches[i];
  b.docs.sort((a, b2) => a.rel.localeCompare(b2.rel));
  const list = b.docs.map((d) => d.path).join('\r\n');
  fs.writeFileSync(path.join(HERE, `batch-${i + 1}.txt`), list);
  total += b.bytes;
  console.log(`batch-${i + 1}: ${b.docs.length} docs, ${(b.bytes / 1024).toFixed(0)} KB`);
}
console.log('total:', (total / 1024 / 1024).toFixed(2), 'MB');
