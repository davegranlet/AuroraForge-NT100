'use strict';
// probe-failure.js - why did 1414001.clips fail extraction? compare catalog fields + chunks.
const fs = require('fs');
const path = require('path');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const foundry = 'C:/nt100-codebasemain/cak-foundry';
const dictionary = JSON.parse(fs.readFileSync(path.join(foundry, 'app', 'data', 'cak-known-paths.json'), 'utf8'));

for (const cak of [process.argv[2], process.argv[3]].filter(Boolean)) {
  if (!fs.existsSync(cak)) { console.log('MISSING', cak); continue; }
  const s = openArchive(cak, dictionary);
  console.log('════ ' + path.basename(cak) + ' | files', s.files.length, 'key 0x' + s.key.toString(16));
  for (const f of s.files) {
    if (!/141400[12]\.clips/i.test(f.name)) continue;
    console.log('  ' + f.name);
    console.log('    storedSize ' + f.storedSize + ' expandedSize ' + f.expandedSize + ' compressed ' + f.compressed + ' protected ' + f.protected + ' offset ' + f.offset);
    console.log('    chunks: ' + JSON.stringify(f.chunks));
  }
}
// ENG.sdb probes
const tree = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k26-library-v4-BakeMe';
const eng = fs.readFileSync(tree + '/Sdb/ENG.sdb');
const u16 = (s) => Buffer.from(s.split('').map((c) => c.charCodeAt(0)).flatMap((v) => [v & 0xff, v >> 8]));
for (const s of ['14002', 'Dolph', 'test557', 'ENT_SINGLE']) {
  const n = u16(s); const o = []; let i = 0;
  while ((i = eng.indexOf(n, i)) !== -1) { o.push(i); i++; if (o.length > 4) break; }
  console.log('ENG.sdb UTF16LE "' + s + '":', o.length, o.join(','));
}
// name hash hunt: fnv64 lower of candidate names as LE bytes
const MASK = (1n << 64n) - 1n;
function fnv(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
for (const s of ['14002_ent_single_dolph_ziggler_18_m_heel', 'test557', 'ent_single_dolph_ziggler_18_m_heel']) {
  const n = Buffer.alloc(8); n.writeBigUInt64LE(fnv(s)); let i = 0, c = 0;
  while ((i = eng.indexOf(n, i)) !== -1) { c++; i++; }
  console.log('ENG.sdb fnv64("' + s + '") occurrences:', c);
}
