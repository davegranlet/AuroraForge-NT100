'use strict';
// search-evt-keys.js — token-exact search across the 62 decoded evt_data tables for the
// entrance-273 key namespace (273, phase event ids, 25xxx object ids).
const fs = require('node:fs');
const path = require('node:path');
const d = path.join(__dirname, 'evt-data');
const files = fs.readdirSync(d).filter((f) => f.endsWith('.decoded.bin'))
  .sort((a, b) => parseInt(a.split('-')[1], 10) - parseInt(b.split('-')[1], 10));
const toks = new Set(['273', '10273', '11273', '12273', '13273', '14273', '27300', '25001', '25000', '25002']);
for (const f of files) {
  const text = fs.readFileSync(path.join(d, f), 'latin1');
  const lines = text.split(/\r?\n/);
  const hits = {};
  lines.forEach((line, li) => {
    const words = line.trim().split(/\s+/);
    for (const w of words) if (toks.has(w)) {
      hits[w] = hits[w] || [];
      if (hits[w].length < 3) hits[w].push('L' + li + ': ' + line.trim().slice(0, 90));
    }
  });
  const keys = Object.keys(hits);
  if (keys.length) {
    console.log('== ' + f.replace(/_evt.*/, ''));
    for (const k of keys) for (const h of hits[k]) console.log('   ', k, '->', h);
  }
}
