'use strict';
// Compact, read-only census of the 2K19 entrance-273 child files (2730..2739, 2273) and the parent 273.bin.
// Reports size, SHA-256, first 16 bytes and counts of known chunk magics (YANM, POF0, SHDC, 0FOP, ...).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DIR = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance';
const names = process.argv.slice(3).length ? process.argv.slice(3) : ['273.bin', '2273.bin', '2730.bin', '2731.bin', '2733.bin', '2734.bin', '2735.bin', '2736.bin', '2737.bin', '2738.bin', '2739.bin'];
const MAGICS = ['YANM', 'POF0', 'SHDC', '0FOP', 'FOP0', 'BPE', 'ZLIB', 'OODL', 'CAE', 'ADEF', 'NMSH', 'MSHR', 'Tabl'];
const out = [];
for (const n of names) {
  const f = path.join(DIR, n);
  if (!fs.existsSync(f)) { out.push({ file: n, missing: true }); continue; }
  const b = fs.readFileSync(f);
  const counts = {};
  for (const m of MAGICS) {
    let c = 0, at = 0;
    const needle = Buffer.from(m, 'latin1');
    for (;;) { const i = b.indexOf(needle, at); if (i < 0) break; c++; at = i + 1; }
    if (c) counts[m] = c;
  }
  out.push({
    file: n, bytes: b.length, sha256_12: crypto.createHash('sha256').update(b).digest('hex').toUpperCase().slice(0, 16),
    head16: b.subarray(0, 16).toString('hex'), magics: counts,
  });
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
