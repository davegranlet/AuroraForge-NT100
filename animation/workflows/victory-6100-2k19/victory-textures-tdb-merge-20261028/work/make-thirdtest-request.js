'use strict';
// Emit thirdtest.request.json for the remaining wanted paths missing from secondtest.
const fs = require('node:fs');
const path = require('node:path');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');
const out = 'C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/victory-textures-tdb-selfcontained-20261028';
const report = JSON.parse(fs.readFileSync('C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/outputs/opencode-takeover-20261028/agentB-tdb-report.json', 'utf8'));
const wanted = [];
for (const t of report) for (const r of t.records) wanted.push(String(r.path).replace(/\\/g, '/').toLowerCase());
const unique = [...new Set(wanted)];
const present = new Set();
for (const dir of ['BakeMe']) {
  const root = path.join(out, dir);
  (function walk(cur) { for (const e of fs.readdirSync(cur, { withFileTypes: true })) { const f = path.join(cur, e.name); if (e.isDirectory()) walk(f); else present.add(path.relative(root, f).replace(/\\/g, '/').toLowerCase()); } })(root);
}
const missing = unique.filter((p) => !present.has(p));
console.log(`total unrepeated=${unique.length} present=${present.size} missing=${missing.length}`);
const session = openArchive('C:/SteamLibrary/steamapps/common/WWE 2K26/mods/3rdtest-cv.cak', {});
const byName = new Map();
for (const f of session.files) byName.set(String(f.name).replace(/\\/g, '/').toLowerCase(), f);
const rows = [];
for (const low of missing) {
  const entry = byName.get(low);
  if (!entry) { console.log('STILL MISSING: ' + low); continue; }
  rows.push(entry);
}
fs.mkdirSync(path.join(out, 'work'), { recursive: true });
const request = {
  archivePath: 'C:/SteamLibrary/steamapps/common/WWE 2K26/mods/3rdtest-cv.cak',
  oodlePath: 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll',
  outputRoot: path.join(out, 'work', 'thirdtest'),
  archiveKey: session.key,
  overwrite: false,
  entries: rows.map((entry) => ({ id: entry.id, offset: Number(entry.offset), storedSize: entry.storedSize, expandedSize: entry.expandedSize, compressed: entry.compressed, protected: entry.protected, relativePath: entry.name, chunks: entry.chunks || [] })),
};
fs.writeFileSync(path.join(out, 'work', 'thirdtest.request.json'), JSON.stringify(request, null, 2) + '\n');
console.log(`rows=${rows.length} request written`);
