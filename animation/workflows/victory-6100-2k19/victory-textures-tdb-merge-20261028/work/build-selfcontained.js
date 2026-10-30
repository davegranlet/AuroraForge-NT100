'use strict';
// Build the self-contained TDB variant: merged TDB BakeMe + every payload file the TDB references (77 paths from 2nd/3rd CAKs).
// Lives OUTSIDE the target dir so it cannot delete itself.
const fs = require('node:fs');
const path = require('node:path');
const { openArchive, fnv1a64 } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');

const base = 'C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/victory-textures-tdb-merge-20261028';
const out = 'C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/victory-textures-tdb-selfcontained-20261028';
const game = 'C:/SteamLibrary/steamapps/common/WWE 2K26';
const sources = [
  { cak: path.join(game, 'mods/2ndtest-cv.cak'), key: 'secondtest' },
  { cak: path.join(game, 'mods/3rdtest-cv.cak'), key: 'thirdtest' },
];

const report = JSON.parse(fs.readFileSync('C:/nt100-codebasemain/animation/workflows/victory-6100-2k19/outputs/opencode-takeover-20261028/agentB-tdb-report.json', 'utf8'));
const wanted = new Map(); // lowercase path -> {path, recordHash}
for (const tdb of report) for (const rec of tdb.records) {
  const p = String(rec.path).replace(/\\/g, '/');
  wanted.set(p.toLowerCase(), { path: p, recordHash: rec.hash });
}
console.log(`wantedPaths=${wanted.size}`);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'BakeMe'), { recursive: true });
fs.cpSync(path.join(base, 'BakeMe'), path.join(out, 'BakeMe'), { recursive: true });

const resolved = []; // {from, entry}
for (const src of sources) {
  const session = openArchive(src.cak, {});
  const byName = new Map();
  for (const f of session.files) byName.set(String(f.name).replace(/\\/g, '/').toLowerCase(), f);
  for (const [low, info] of wanted) {
    if (resolved.some((r) => r.low === low)) continue;
    const entry = byName.get(low);
    if (entry) resolved.push({ low, from: src.key, entry });
  }
}
const unresolved = [...wanted.keys()].filter((low) => !resolved.some((r) => r.low === low));
console.log(`resolved=${resolved.length} unresolved=${unresolved.length}`);
if (unresolved.length) { console.log('UNRESOLVED:'); for (const u of unresolved) console.log(u); }

const bySource = new Map();
for (const r of resolved) {
  if (!bySource.has(r.from)) bySource.set(r.from, []);
  bySource.get(r.from).push(r);
}

const helper = 'C:/nt100-codebasemain/cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe';
const { spawnSync } = require('node:child_process');
for (const [key, rows] of bySource) {
  const session = openArchive(sources.find((s) => s.key === key).cak, {});
  const outputSub = path.join(out, 'work', key);
  fs.mkdirSync(outputSub, { recursive: true });
  const requestPath = path.join(out, 'work', `${key}.request.json`);
  const request = {
    archivePath: sources.find((s) => s.key === key).cak,
    oodlePath: path.join(game, 'oo2core_9_win64.dll'),
    outputRoot: outputSub,
    archiveKey: session.key,
    overwrite: false,
    entries: rows.map((r) => ({
      id: r.entry.id,
      offset: Number(r.entry.offset),
      storedSize: r.entry.storedSize,
      expandedSize: r.entry.expandedSize,
      compressed: r.entry.compressed,
      protected: r.entry.protected,
      relativePath: r.entry.name,
      chunks: r.entry.chunks || [],
    })),
  };
  fs.writeFileSync(requestPath, JSON.stringify(request, null, 2) + '\n');
  const res = spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`helper failed for ${key}: ${res.stderr || res.stdout}`);
  const parsed = JSON.parse(String(res.stdout || '').trim());
  const fails = (parsed.results || []).filter((r) => !r.Ok);
  if (fails.length) throw new Error(`helper reported failures for ${key}: ${JSON.stringify(fails.slice(0, 3))}`);
  for (const r of rows) {
    const srcFile = path.join(outputSub, ...r.low.split('/'));
    if (!fs.existsSync(srcFile)) throw new Error(`helper did not emit ${r.low}`);
    const dest = path.join(out, 'BakeMe', ...r.low.split('/'));
    if (fs.existsSync(dest)) throw new Error(`dup: ${r.low}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(srcFile, dest);
  }
  console.log(`${key}: extracted=${rows.length} ok`);
}

const walk = (root, cur = root, acc = []) => fs.readdirSync(cur, { withFileTypes: true }).forEach((e) => { const f = path.join(cur, e.name); e.isDirectory() ? walk(root, f, acc) : acc.push(path.relative(root, f).replace(/\\/g, '/')); return acc; });
const files = walk(path.join(out, 'BakeMe'));
console.log(`buildMeFiles=${files.length}`);
const tdbStat = fs.statSync(path.join(out, 'BakeMe', '_textures.tdb'));
console.log(`buildBytes=${files.reduce((s, f) => s + fs.statSync(path.join(out, 'BakeMe', f)).size, 0)} tdbBytes=${tdbStat.size}`);
