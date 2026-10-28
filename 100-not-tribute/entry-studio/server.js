#!/usr/bin/env node
'use strict';
// Aurora Forge — Entry Studio (quick app): pick 2K19 animations, convert, edit the
// new 2K25 entry's fields manually, bake + stage.
// Run: node server.js  (then open http://127.0.0.1:7878)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const REPO = 'C:\\AuroraForge-Aug26\\AuroraForge_WWE_PC-Game_Modding_Tool\\WWE2K19-to-2K26-Entrance-Prototype';
const FTRIB = 'C:\\AuroraForge-Aug26\\AuroraForge_WWE_PC-Game_Modding_Tool\\Aurora-CAK-Foundry\\app\\tools\\cak-v93\\FTribTool.exe';
const DEFAULTS = {
  extraction: 'C:\\Games\\2k25-extraction',
  binsEntrance: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-beta2-library-2k19-extracted\\entrance',
  binsVictory: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-beta2-library-2k19-extracted\\victory',
  work: 'C:\\AuroraForge-Aug26\\_work\\entry-studio',
  mods: 'C:\\WWE 2K25 Saturday Nights Main Event\\mods',
};
const TREE = path.join(DEFAULTS.work, 'BakeMe');

// ---------------------------------------------------------------------------
// Security model (see API.md):
//  - binds to 127.0.0.1 only; requires loopback socket
//  - validates Host and (when present) Origin headers: localhost/127.0.0.1 only
//  - body size caps (JSON 2 MB, upload 64 MB)
//  - all WRITE paths must resolve inside ALLOWED_WRITE_ROOTS (work dir + game mods)
//  - uploads keep only the basename; reads/scan are read-only listings
// ---------------------------------------------------------------------------
const PORT = 7878;
const BIND = '127.0.0.1';
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;
const ALLOWED_WRITE_ROOTS = [DEFAULTS.work, DEFAULTS.mods].map((p) => path.resolve(p).toLowerCase());

function insideAllowedWrite(p) {
  const resolved = path.resolve(p).toLowerCase();
  return ALLOWED_WRITE_ROOTS.some((root) => resolved === root || resolved.startsWith(root + path.sep));
}
function loopback(req) {
  const addr = req.socket.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}
function guard(req, res) {
  if (!loopback(req)) { json(res, 403, { error: 'loopback only' }); return false; }
  const host = String(req.headers.host || '');
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { json(res, 403, { error: 'invalid host header' }); return false; }
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) { json(res, 403, { error: 'cross-origin denied' }); return false; }
  return true;
}
function readLimited(req, cap) {
  return new Promise((resolve, reject) => {
    const chunks = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > cap) { reject(new Error('body too large')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, code, value) { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); }
function body(req) { return readLimited(req, MAX_JSON_BYTES).then((buf) => { const text = buf.toString('utf8'); return text ? JSON.parse(text) : {}; }); }
function readBodyRaw(req) { return readLimited(req, MAX_UPLOAD_BYTES); }

const tools = {};
function tool(name) { if (!tools[name]) tools[name] = require(path.join(REPO, 'tools', name)); return tools[name]; }

function ensureTree() {
  const { stageStockTree, ensureSdbWinner } = tool('convert-2k19-animation-to-2k25-entry.js');
  fs.mkdirSync(TREE, { recursive: true });
  stageStockTree(TREE, DEFAULTS.extraction);
  ensureSdbWinner(TREE, DEFAULTS.work);
  return TREE;
}

function entryState(entryId) {
  const state = { entryId, entrance: null, victory: null, name: null, descriptor: null };
  const descPath = path.join(TREE, `${entryId}-entry-descriptor.json`);
  if (fs.existsSync(descPath)) state.descriptor = JSON.parse(fs.readFileSync(descPath, 'utf8'));
  const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
  if (fs.existsSync(ePath)) {
    const found = tool('find-2k25-entrance-entry.js').findEntranceEntry(fs.readFileSync(ePath), entryId);
    if (found) state.entrance = { section: found.section, index: found.index, ...found.record, hideId: String(found.record.hideId) };
  }
  const vPath = path.join(TREE, 'Entrances', 'VictoryListData.jsfb');
  if (fs.existsSync(vPath)) {
    const { readRows } = (() => { try { return require(path.join(REPO, 'tools', 'victory-list.js')); } catch { return {}; } })();
    try {
      const { findSdbRecord } = tool('sdb-read.js');
      const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
      if (fs.existsSync(sdbPath) && state.entrance && state.entrance.nameString) {
        const rec = tool('sdb-read.js').findSdbRecord(fs.readFileSync(sdbPath), state.entrance.nameString);
        state.name = rec ? rec.text : null;
      }
    } catch {}
  }
  return state;
}

function nextEntryId() {
  const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
  const rows = tool('locate-entrance-vectors.js').locateEntranceVectors(fs.readFileSync(ePath)).flat();
  const taken = new Set(rows.map((r) => r.id).filter((v) => Number.isSafeInteger(v)));
  let id = 14000;
  while (taken.has(id)) id++;
  return id;
}

// Clone DIRE INTENTIONS (entry #1) into every file it appears in, with the new id.
function createEntryFromDire(entryId) {
  ensureTree();
  const dire = { nameString: 949807537 };
  // 1. EntranceListData row (clone id 1, keep everything else incl. nameString)
  const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
  const existing = tool('find-2k25-entrance-entry.js').findEntranceEntry(fs.readFileSync(ePath), entryId);
  if (!existing) {
    const tmp = `${ePath}.clone.tmp`;
    execFileSync(process.execPath, [path.join(REPO, 'tools', 'append_2k25_entrance_clone_graph.js'), ePath, tmp, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(dire.nameString)], { encoding: 'utf8' });
    fs.renameSync(`${tmp}`, ePath);
  }
  // 2. VictoryListData row (wrestlerId 1 -> entryId, keep nameString + cloned motion refs)
  const vPath = path.join(TREE, 'Entrances', 'VictoryListData.jsfb');
  const vRows = (() => {
    const u16 = (at) => fs.readFileSync(vPath).readUInt16LE(at);
    return null;
  })();
  // read dire victory row scalars for explicit args
  const vbuf = fs.readFileSync(vPath);
  const u16r = (at) => vbuf.readUInt16LE(at); const u32r = (at) => vbuf.readUInt32LE(at); const i32r = (at) => vbuf.readInt32LE(at);
  const fAr = (t, f) => { const v = t - i32r(t); const s = v + 4 + f * 2; if (s + 2 > v + u16r(v)) return null; const rel = u16r(s); return rel ? t + rel : null; };
  const oAr = (t, f) => { const at = fAr(t, f); return at === null ? null : at + u32r(at); };
  const vroot = u32r(0); const vvec = oAr(oAr(vroot, 0), 0); const vcount = u32r(vvec);
  let direVictory = null;
  for (let i = 0; i < vcount; i++) {
    const slot = vvec + 4 + i * 4; const t = slot + u32r(slot);
    const idA = fAr(t, 0);
    if (idA && u16r(idA) === 1) {
      const get = (f, read) => { const at = fAr(t, f); return at === null ? undefined : read(at); };
      direVictory = { someId: get(4, u32r), face: get(5, u32r) };
      break;
    }
  }
  if (direVictory && !tool('edit-2k25-victory-entry.js').editVictoryEntry) { /* noop */ }
  const alreadyVictory = (() => {
    try {
      let found = false;
      for (let i = 0; i < vcount; i++) { const slot = vvec + 4 + i * 4; const t = slot + u32r(slot); const idA = fAr(t, 0); if (idA && u16r(idA) === entryId) { found = true; break; } }
      return found;
    } catch { return false; }
  })();
  if (!alreadyVictory) {
    const args = [path.join(REPO, 'tools', 'append_2k25_victory_entry.js'), vPath, vPath, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(dire.nameString)];
    if (direVictory && direVictory.someId !== undefined) args.push('--some-id', String(direVictory.someId));
    if (direVictory && direVictory.face !== undefined) args.push('--face', String(direVictory.face));
    const out = spawnSync(process.execPath, args, { encoding: 'utf8' });
    if (out.status !== 0) throw new Error(`victory clone failed: ${out.stderr || out.stdout}`);
  }
  return { entryId, nameString: dire.nameString, clonedFrom: 1, files: ['Entrances/EntranceListData.jsfb', 'Entrances/VictoryListData.jsfb'] };
}

function convertForEntry(entryId, source19) {
  ensureTree();
  const { buildEntranceAssets } = tool('convert-2k19-animation-to-2k25-entry.js');
  const assets = buildEntranceAssets({ source19, entryId, extraction: DEFAULTS.extraction, outputRoot: TREE });
  // set f4 = own id (motion), keep f5-f9 cloned
  const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
  tool('edit-2k25-entrance-entry.js').editEntranceEntry({ inputPath: ePath, outputPath: ePath, entryId, setters: { field4: entryId } });
  return { entryId, clips: assets.clips, adefs: assets.adefs, phases: assets.phases };
}

function writeEntry(entryId, fields, mode, kind) {
  ensureTree();
  // 1. name string (find-or-append)
  let newNameId = fields.nameString;
  if (fields.name) {
    const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
    const out = spawnSync(process.execPath, [path.join(REPO, 'tools', 'sdb-name.js'), sdbPath, sdbPath, '--text', String(fields.name)], { encoding: 'utf8' });
    if (out.status !== 0) throw new Error(`sdb-name failed: ${out.stderr}`);
    newNameId = JSON.parse(out.stdout).id;
  }
  const setters = {};
  for (const key of ['type', 'field6', 'field7', 'field8', 'field9']) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') setters[key] = Number(fields[key]);
  }
  if (fields.motion !== undefined && fields.motion !== null && fields.motion !== '') { setters.field4 = Number(fields.motion); setters.field5 = Number(fields.motion); }
  if (newNameId) setters.nameString = Number(newNameId);

  const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
  const existing = tool('find-2k25-entrance-entry.js').findEntranceEntry(fs.readFileSync(ePath), entryId);
  if (!existing) {
    const tmp = `${ePath}.tmp`;
    const { execFileSync } = require('node:child_process');
    execFileSync(process.execPath, [path.join(REPO, 'tools', 'append_2k25_entrance_clone_graph.js'), ePath, tmp, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(newNameId || 0)], { encoding: 'utf8' });
    fs.renameSync(tmp, `${tmp}.done`);
    fs.renameSync(`${tmp}.done`, ePath);
  }
  const result = tool('edit-2k25-entrance-entry.js').editEntranceEntry({ inputPath: ePath, outputPath: ePath, entryId, setters });
  return { entryId, nameId: newNameId, row: result.after };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!guard(req, res)) return;
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/defaults') return json(res, 200, DEFAULTS);
    if (req.method === 'POST' && url.pathname === '/api/scan') {
      const { folder } = await body(req);
      const dir = folder || DEFAULTS.binsEntrance;
      const files = [];
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) walk(full);
          else if (e.name.toLowerCase().endsWith('.bin')) files.push({ path: full, name: e.name, size: fs.statSync(full).size });
        }
      };
      if (fs.existsSync(dir)) walk(dir);
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      return json(res, 200, { folder: dir, files });
    }
    if (req.method === 'POST' && url.pathname === '/api/upload') {
      const name = url.searchParams.get('name') || `dropped-${Date.now()}.bin`;
      const buf = await readBodyRaw(req);
      const dir = path.join(DEFAULTS.work, 'uploads');
      fs.mkdirSync(dir, { recursive: true });
      const target = path.join(dir, path.basename(name));
      fs.writeFileSync(target, buf);
      return json(res, 200, { path: target, name: path.basename(name), size: buf.length });
    }
    if (req.method === 'POST' && url.pathname === '/api/convert') {
      const { files, startId } = await body(req);
      ensureTree();
      const { convertAnimationToEntry } = tool('convert-2k19-animation-to-2k25-entry.js');
      const results = [];
      let next = Number(startId) > 0 ? Number(startId) : nextEntryId();
      for (const file of files) {
        const entryId = next++;
        try {
          const result = convertAnimationToEntry({ source19: file, tree: TREE, entryId, name: `AURORA ${entryId}`, kind: 'auto', mode: 'minimal', fresh: false });
          results.push({ entryId, source: file, kind: result.kind, ok: true });
        } catch (error) {
          results.push({ entryId, source: file, ok: false, error: error.message });
        }
      }
      return json(res, 200, { tree: TREE, results });
    }
    if (req.method === 'GET' && url.pathname === '/api/entries') {
      if (!fs.existsSync(TREE)) return json(res, 200, { entries: [] });
      const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
      if (!fs.existsSync(ePath)) return json(res, 200, { entries: [] });
      const rows = tool('locate-entrance-vectors.js').locateEntranceVectors(fs.readFileSync(ePath))[8] || [];
      const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
      const sdb = fs.existsSync(sdbPath) ? new Map(tool('sdb-read.js').readSdbRecords(fs.readFileSync(sdbPath)).map((r) => [r.id >>> 0, r.text])) : new Map();
      const entries = rows.filter((r) => r.id >= 14000).map((r) => ({ id: r.id, nameString: r.nameString, name: sdb.get(r.nameString >>> 0) || null, motion: r.field4 }));
      return json(res, 200, { entries });
    }
    if (req.method === 'POST' && url.pathname === '/api/create-entry') {
      const payload = await body(req);
      ensureTree();
      const entryId = Number(payload.entryId) > 0 ? Number(payload.entryId) : nextEntryId();
      const created = createEntryFromDire(entryId);
      return json(res, 200, { created, state: entryState(entryId) });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/entry/')) {
      const entryId = Number(url.pathname.split('/').pop());
      return json(res, 200, entryState(entryId));
    }
    if (req.method === 'POST' && url.pathname === '/api/entry') {
      const payload = await body(req);
      let converted = null;
      if (payload.animationPath) converted = convertForEntry(Number(payload.entryId), payload.animationPath);
      const written = writeEntry(payload.entryId, payload.fields || {}, payload.mode || 'minimal', payload.kind || 'entrance');
      return json(res, 200, { converted, written, state: entryState(payload.entryId) });
    }
    if (req.method === 'GET' && url.pathname === '/api/music') {
      const { readMusicList } = tool('list-2k25-options.js');
      const list = readMusicList(fs.readFileSync(path.join(DEFAULTS.extraction, 'Audio', 'MusicList.jsfb')));
      return json(res, 200, list.music.map((m) => ({ id: m.musicId, title: m.trackTitle, star: m.starName })));
    }
    if (req.method === 'POST' && url.pathname === '/api/bake') {
      const { out } = await body(req);
      const outPath = out || path.join(DEFAULTS.work, 'aurora-entry.cak');
      fs.rmSync(outPath, { force: true });
      const result = spawnSync(FTRIB, ['pack', '-i', TREE, '-o', outPath, '-v', '9.3', '--encrypt-header'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
      if (!fs.existsSync(outPath)) return json(res, 500, { error: `${result.stdout || ''}${result.stderr || ''}` });
      return json(res, 200, { out: outPath, bytes: fs.statSync(outPath).size });
    }
    if (req.method === 'POST' && url.pathname === '/api/stage') {
      const { cak, mods } = await body(req);
      const modsDir = mods || DEFAULTS.mods;
      const cakPath = cak || path.join(DEFAULTS.work, 'aurora-entry.cak');
      if (!fs.existsSync(cakPath)) return json(res, 400, { error: `CAK not found: ${cakPath}` });
      if (!insideAllowedWrite(modsDir) || !insideAllowedWrite(cakPath)) return json(res, 403, { error: 'stage paths must be inside allowed write roots' });
      const name = path.basename(cakPath);
      fs.copyFileSync(cakPath, path.join(modsDir, name));
      const manifest = { version: 1, cakOrder: [name], packageOrder: [] };
      fs.writeFileSync(path.join(modsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8' });
      // strip BOM if any
      const raw = fs.readFileSync(path.join(modsDir, 'manifest.json'));
      if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fs.writeFileSync(path.join(modsDir, 'manifest.json'), raw.subarray(3));
      return json(res, 200, { staged: path.join(modsDir, name), manifest: JSON.parse(fs.readFileSync(path.join(modsDir, 'manifest.json'), 'utf8')) });
    }
    json(res, 404, { error: 'not found' });
  } catch (error) {
    json(res, 500, { error: error.message, stack: error.stack });
  }
});

server.listen(PORT, BIND, () => console.log(`Aurora Forge Entry Studio: http://${BIND}:${PORT} (local API; loopback only)`));
