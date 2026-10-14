#!/usr/bin/env node
'use strict';

// Aurora Forge - refresh a 2K26 library skeleton from the live game.
//
// Takes a known-good skeleton (registration base + decrypted SDBs + the
// Animation/Victory template) and produces a refreshed skeleton where every
// stock table is re-cloned from the CURRENT game CAKs, then re-anchors the
// converter template on a stock id that exists in the victory list, entrance
// list and cutscene registry.
//
// Usage:
//   node tools/refresh-2k26-skeleton.js \
//     --game <WWE 2K26 folder> \
//     --template <known-good BakeMe> \
//     --out <destination BakeMe> \
//     [--foundry <Aurora-CAK-Foundry>]
//
// Notes:
//   - SDB files stay as the template's decrypted copies (2K26 CAK SDBs are
//     container-encrypted; the decrypted base is the proven working source).
//   - Known modified files are kept: CAMMoveData (custom moves), RA lines,
//     TeamsTable, Soundtracks, EtcDesignData, NameplateData, HideCtrlData.
//
// Output (stdout, JSON): { out, anchorId, refreshed: [...], kept: [...], skipped: [...] }

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const DEFAULT_FOUNDRY = (() => {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'Aurora-CAK-Foundry'),
    path.resolve(__dirname, '..', '..', 'cak-foundry')
  ];
  for (const candidate of candidates) {
    try { if (fs.existsSync(candidate)) return candidate; } catch (_error) { /* ignore */ }
  }
  return candidates[0];
})();

// Scan cache: opening all 15 stock CAKs takes minutes; the result only depends
// on the game file set and the wanted path set, so cache it per machine.
const CACHE_VERSION = 1;
function cacheFile() {
  const base = process.env.LOCALAPPDATA || os.tmpdir();
  return path.join(base, 'AuroraForge', 'skeleton-scan-cache.json');
}
function cacheKey(game, archives) {
  const hash = crypto.createHash('sha256');
  hash.update(game.toLowerCase());
  for (const archive of archives) {
    const stat = fs.statSync(path.join(game, archive));
    hash.update(archive.toLowerCase() + ':' + stat.size + ':' + stat.mtimeMs + ';');
  }
  return hash.digest('hex');
}
function loadScanCache(key) {
  try {
    const data = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'));
    if (data.version !== CACHE_VERSION || !data.entries) return null;
    return data.entries[key] || null;
  } catch (_) { return null; }
}
function saveScanCache(key, found, wantedKeys, archiveKeys) {
  try {
    const file = cacheFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let data = { version: CACHE_VERSION, entries: {} };
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); if (data.version !== CACHE_VERSION) data = { version: CACHE_VERSION, entries: {} }; } catch (_) { data = { version: CACHE_VERSION, entries: {} }; }
    data.entries[key] = { wanted: wantedKeys.join(','), found, keys: archiveKeys };
    const keys = Object.keys(data.entries);
    while (keys.length > 4) delete data.entries[keys.shift()];
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  } catch (_) { /* cache is best-effort */ }
}

const KEEP = new Set([
  'audio/ra_lines_ps/directory_listing.adb2',
  'createshow/etcdesigndata.jsfb',
  'createshow/nameplatedata.jsfb',
  'hide/hidectrldata.hidelink.jsfb',
  'movedata/cammovedata.jsfb',
  'msc/global/soundtracks.jsfb',
  'stable/teamstable.jsfb',
]);

function arg(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name}`);
  return value;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function main() {
  const game = path.resolve(arg(process.argv, '--game', ''));
  const template = path.resolve(arg(process.argv, '--template', ''));
  const out = path.resolve(arg(process.argv, '--out', ''));
  const foundry = path.resolve(arg(process.argv, '--foundry', DEFAULT_FOUNDRY));
  if (!game || !template || !out) throw new Error('Usage: node tools/refresh-2k26-skeleton.js --game <2K26 folder> --template <BakeMe> --out <BakeMe>');
  if (!fs.existsSync(path.join(game, 'WWE2K26_x64.exe'))) throw new Error(`2K26 game folder not recognised (no WWE2K26_x64.exe): ${game}`);
  if (!fs.existsSync(path.join(template, 'Entrances', 'VictoryListData.jsfb'))) throw new Error(`template skeleton not recognised (no Entrances/VictoryListData.jsfb): ${template}`);
  if (fs.existsSync(out) && process.argv.includes('--force')) fs.rmSync(out, { recursive: true, force: true });
  if (fs.existsSync(out)) throw new Error(`refusing to overwrite existing skeleton: ${out}`);

  const cakReader = require(path.join(foundry, 'electron', 'cak-reader.js'));
  const fnv1a64 = cakReader.fnv1a64;
  const helper = path.join(foundry, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
  const oodle = path.join(game, 'oo2core_9_win64.dll');
  if (!fs.existsSync(helper)) throw new Error('Aurora CAK helper is missing: ' + helper);
  if (!fs.existsSync(oodle)) throw new Error('oo2core_9_win64.dll is missing in the game folder');

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.cpSync(template, out, { recursive: true, preserveTimestamps: true });

  const wanted = new Map(); // fnv hash -> relative path
  const kept = [];
  for (const file of walk(out)) {
    const rel = file.slice(out.length + 1).replace(/\\/g, '/');
    if (/aurora-library-proof\.json$/i.test(rel)) continue;
    const lower = rel.toLowerCase();
    if (/\.(sdb|dds|tex)$/i.test(lower) || lower.startsWith('animation/victory/')) { kept.push(rel); continue; }
    if (KEEP.has(lower)) { kept.push(rel); continue; }
    wanted.set(fnv1a64(lower), rel);
  }

  const archives = fs.readdirSync(game).filter((n) => /^bakedfile\d+\.cak$/i.test(n)).sort();
  const wantedAll = new Map(wanted);
  const scanKey = cacheKey(game, archives);
  let found = null;
  let archiveKeys = null;
  let cacheHit = false;
  if (!process.argv.includes('--no-cache')) {
    const cached = loadScanCache(scanKey);
    if (cached && Array.isArray(cached.found)) {
      found = cached.found;
      archiveKeys = cached.keys || {};
      cacheHit = true;
    }
  }
  if (!found) {
    found = [];
    archiveKeys = {};
    for (const archive of archives) {
      if (!wanted.size) break;
      let session;
      try { session = cakReader.openArchive(path.join(game, archive), {}); } catch (_) { continue; }
      archiveKeys[archive] = session.key >>> 0;
      for (const f of session.files) {
        if (!f.hash) continue;
        const rel = wanted.get(String(f.hash).toLowerCase());
        if (!rel) continue;
        found.push({
          rel,
          archive,
          id: f.id,
          offset: Number(f.offset),
          storedSize: f.storedSize,
          expandedSize: f.expandedSize,
          compressed: Boolean(f.compressed),
          protected: Boolean(f.protected),
          chunks: f.chunks,
        });
        wanted.delete(String(f.hash).toLowerCase());
      }
    }
    if (!process.argv.includes('--no-cache')) {
      saveScanCache(scanKey, found, [...wantedAll.keys()], archiveKeys);
    }
  }
  const foundRels = new Set(found.map((item) => item.rel));
  const skipped = [...wantedAll.values()].filter((rel) => !foundRels.has(rel));

  // Extract refreshed files from the live CAKs.
  const byArchive = new Map();
  for (const item of found) {
    if (!byArchive.has(item.archive)) byArchive.set(item.archive, []);
    byArchive.get(item.archive).push(item);
  }
  const refreshed = [];
  for (const [archive, items] of byArchive) {
    const archivePath = path.join(game, archive);
    const archiveKey = archiveKeys ? archiveKeys[archive] : null;
    if (!archiveKey) { for (const item of items) skipped.push(item.rel + ' (no cached archive key)'); continue; }
    const request = {
      archivePath,
      oodlePath: oodle,
      outputRoot: out,
      archiveKey,
      overwrite: true,
      entries: items.map((item) => ({
        id: item.id, offset: item.offset, storedSize: item.storedSize, expandedSize: item.expandedSize,
        compressed: item.compressed, protected: item.protected, relativePath: item.rel, chunks: item.chunks,
      })),
    };
    const reqPath = path.join(os.tmpdir(), 'aurora-skeleton-' + process.pid + '-' + Date.now() + '.json');
    fs.writeFileSync(reqPath, JSON.stringify(request), 'utf8');
    const run = cp.spawnSync(helper, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
    fs.rmSync(reqPath, { force: true });
    let parsed = null;
    try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (_) {}
    const results = (parsed && parsed.results) || [];
    results.forEach((res, index) => {
      if (res && res.Ok) refreshed.push({ rel: items[index].rel, archive });
      else skipped.push(items[index].rel + ' (helper failed)');
    });
  }

  // Re-anchor: pick the lowest id present in victory list + entrance list + cutscene registry.
  const { locateEntranceVectors } = require('./locate-entrance-vectors');
  const { locateCutsceneVector } = require('./clips-codec/locate-cutscene-vector');
  const { findEntranceEntry } = require('./find-2k25-entrance-entry');

  const victoryBuffer = fs.readFileSync(path.join(out, 'Entrances', 'VictoryListData.jsfb'));
  const entranceBuffer = fs.readFileSync(path.join(out, 'Entrances', 'EntranceListData.jsfb'));
  const cutsceneBuffer = fs.readFileSync(path.join(out, 'Cutscene', 'CutsceneNoRegistry.jsfb'));

  const u32v = (b, o) => b.readUInt32LE(o), i32v = (b, o) => b.readInt32LE(o), u16v = (b, o) => b.readUInt16LE(o);
  function vFieldAt(buffer, table, field) {
    const vtable = table - i32v(buffer, table);
    const slot = vtable + 4 + field * 2;
    if (slot + 2 > vtable + u16v(buffer, vtable)) return null;
    const rel = u16v(buffer, slot);
    return rel ? table + rel : null;
  }
  function vOffsetAt(buffer, table, field) { const at = vFieldAt(buffer, table, field); return at === null ? null : at + u32v(buffer, at); }
  const victoryIds = new Set();
  {
    const root = u32v(victoryBuffer, 0);
    const wrapper = vOffsetAt(victoryBuffer, root, 0);
    const vector = vOffsetAt(victoryBuffer, wrapper, 0);
    const count = u32v(victoryBuffer, vector);
    for (let i = 0; i < count; i++) {
      const slot = vector + 4 + i * 4;
      const table = slot + u32v(victoryBuffer, slot);
      const at = vFieldAt(victoryBuffer, table, 0);
      if (at !== null) victoryIds.add(u16v(victoryBuffer, at));
    }
  }
  const entranceSections = locateEntranceVectors(entranceBuffer);
  const entranceIds = new Set((entranceSections[8] || []).map((r) => r.id));
  const cutsceneIds = new Set();
  {
    const { count, slotsOffset } = locateCutsceneVector(cutsceneBuffer);
    for (let i = 0; i < count; i++) {
      const slot = slotsOffset + 4 * i;
      const rel = u32v(cutsceneBuffer, slot);
      if (!rel) continue;
      const table = slot + rel;
      if (table + 12 > cutsceneBuffer.length) continue;
      cutsceneIds.add(u32v(cutsceneBuffer, table + 8));
    }
  }
  const candidates = [...victoryIds].filter((id) => id > 0 && entranceIds.has(id) && cutsceneIds.has(id)).sort((a, b) => a - b);
  if (!candidates.length) throw new Error('no stock anchor id found in victory+entrance+cutscene tables');
  const anchorId = candidates[0];
  if (!findEntranceEntry(entranceBuffer, anchorId)) throw new Error('anchor entrance record missing after refresh');

  const victoryDir = path.join(out, 'Animation', 'Victory');
  const clipFiles = fs.existsSync(victoryDir) ? fs.readdirSync(victoryDir).filter((n) => /^\d+\.clips$/i.test(n)) : [];
  let renamed = null;
  if (!clipFiles.some((n) => Number(path.basename(n, '.clips')) === anchorId)) {
    if (clipFiles.length !== 1) throw new Error(`cannot re-anchor: expected one template .clips, found ${clipFiles.length}`);
    const current = path.basename(clipFiles[0], '.clips');
    const clipsFrom = path.join(victoryDir, clipFiles[0]);
    const clipsTo = path.join(victoryDir, anchorId + '.clips');
    fs.renameSync(clipsFrom, clipsTo);
    const adefsFrom = path.join(victoryDir, current + '.adefs');
    const adefsTo = path.join(victoryDir, anchorId + '.adefs');
    if (fs.existsSync(adefsFrom)) fs.renameSync(adefsFrom, adefsTo);
    renamed = { from: current, to: anchorId };
  }

  return {
    schema: 'aurora-forge-2k26-skeleton-refresh/v1',
    game,
    template,
    out,
    cacheHit,
    anchorId,
    renamedTemplate: renamed,
    refreshedCount: refreshed.length,
    refreshed,
    keptCount: kept.length,
    skipped,
  };
}

if (require.main === module) {
  try {
    const result = main();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('2K26 skeleton refresh failed: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
