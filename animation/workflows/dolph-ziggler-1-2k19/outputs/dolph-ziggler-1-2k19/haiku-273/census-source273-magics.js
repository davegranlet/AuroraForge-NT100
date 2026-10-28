'use strict';
// Read-only census of 4-byte ASCII chunk magics and their offsets in the 2K19 273 source.
// Establishes which sections exist beyond the 10 YANM body/facial sections (for ring/object/camera scope).
const fs = require('node:fs');
const crypto = require('node:crypto');
const src = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const b = fs.readFileSync(src);
const counts = new Map();
for (let i = 0; i + 4 <= b.length; i++) {
  const c0 = b[i], c1 = b[i + 1], c2 = b[i + 2], c3 = b[i + 3];
  const ok = (c) => (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || c === 0x5f;
  if (!(ok(c0) && ok(c1) && ok(c2) && ok(c3))) continue;
  const key = b.toString('latin1', i, i + 4);
  if (!/[A-Za-z]{2}/.test(key)) continue;
  if (!counts.has(key)) counts.set(key, []);
  counts.get(key).push(i);
}
const rows = [...counts.entries()].filter(([, v]) => v.length >= 2 || ['YANM', '0FOP', 'POF0', 'SHDC', 'BPE'].includes(v.length && 'x')).map(([k, v]) => ({ magic: k, count: v.length, first: v.slice(0, 6) }));
const known = ['YANM', '0FOP', 'POF0', 'SHDC', 'BPE', 'ZLIB', 'OODL', 'NMSH', 'MSHR', 'BPEC', 'ACTS', 'AMYM', 'TBUF', 'HSPC', 'PAC'];
const keyRows = known.map((k) => ({ magic: k, count: (counts.get(k) || []).length, first: (counts.get(k) || []).slice(0, 12) }));
const sha = crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
process.stdout.write(JSON.stringify({ src, bytes: b.length, sha256: sha, known: keyRows, frequentMagicsAtLeast2: rows.sort((a, b2) => b2.count - a.count).slice(0, 40) }, null, 1) + '\n');
