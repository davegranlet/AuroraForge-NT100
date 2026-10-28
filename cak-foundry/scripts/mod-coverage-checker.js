#!/usr/bin/env node
'use strict';
/*
 * Aurora Forge Mod Coverage Checker (WWE 2K26)
 *
 * Traces the game process at the OS level (ETW Microsoft-Windows-Kernel-File), maps every
 * CAK read (file + offset + size) back to the concrete asset path via the Aurora CAK catalogs,
 * and reports which loaded assets came from a mod CAK vs stock, flagging:
 *   - CRITICAL : asset read from a stock bakedfile even though an active mod provides it
 *   - ATTENTION: stock (unmodded) loads inside focus namespaces (CAS/, Logo/, Characters/, ...)
 *
 * Commands:
 *   node mod-coverage-checker.js run                 start trace, wait for game session, analyze
 *   node mod-coverage-checker.js start               only start the trace
 *   node mod-coverage-checker.js stop                stop trace + convert to CSV (needs the run folder)
 *   node mod-coverage-checker.js analyze <trace.csv> analyze an existing CSV
 *   node mod-coverage-checker.js help
 *
 * Options:
 *   --game <dir>        WWE 2K26 install folder
 *   --out <dir>         report root (default: Aurora-CAK-Foundry/mod-coverage-reports)
 *   --pid <hex|dec>     force the game PID instead of auto-detecting
 *   --wait <min>        minutes to wait for the game to launch (default 20)
 *   --runtime <min>     minutes to wait for the game to exit (default 120)
 *   --focus <a,b,c>     focus path prefixes (default CAS/,Logo/,Characters/,Arena/,Entrances/)
 *
 * Requires an elevated shell for the ETW trace (logman). Analysis of existing CSVs needs no admin.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const readline = require('readline');
const { openArchive } = require('../electron/cak-reader');

const FOUNDRY = path.join(__dirname, '..');
const SESSION = 'afmodcov';

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('--') ? args[0] : 'help';
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) { opts[key] = next; i++; }
    else opts[key] = true;
  }
}
const positional = args.filter((a) => !a.startsWith('--'));
const DEFAULTS = {
  game: opts.game || 'C:/SteamLibrary/steamapps/common/WWE 2K26',
  out: opts.out || path.join(FOUNDRY, 'mod-coverage-reports'),
  focus: (opts.focus ? String(opts.focus).split(',') : ['CAS/', 'Logo/', 'Characters/', 'Arena/', 'Entrances/']),
  waitStartMin: Number(opts.wait || 20),
  waitRunMin: Number(opts.runtime || 120),
  pidOverride: opts.pid ? String(opts.pid) : null
};

function log(msg) { process.stdout.write(msg + '\n'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function stamp() { const d = new Date(); const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`; }
function runCmd(cmd, cmdArgs) {
  return cp.spawnSync(cmd, cmdArgs, { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
}
function ftToDate(ft) { return new Date(Number(ft) / 10000 - 11644473600000); }
function ftToTime(ft) { const d = ftToDate(ft); const pad = (n) => String(n).padStart(2, '0'); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtBytes(n) { if (n > 1024 * 1024 * 1024) return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB'; if (n > 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB'; if (n > 1024) return (n / 1024).toFixed(1) + ' KB'; return n + ' B'; }

function tasklistGamePid() {
  const r = runCmd('tasklist.exe', ['/FI', 'IMAGENAME eq WWE2K26_x64.exe', '/NH', '/FO', 'CSV']);
  const m = String(r.stdout || '').match(/WWE2K26_x64\.exe","(\d+)"/i);
  return m ? Number(m[1]) : null;
}
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

function startTrace(etlPath) {
  runCmd('logman.exe', ['stop', SESSION, '-ets']);
  const r = runCmd('logman.exe', ['create', 'trace', SESSION, '-p', 'Microsoft-Windows-Kernel-File', '0x1D0', '4', '-o', etlPath, '-ets']);
  const out = String(r.stdout || '') + String(r.stderr || '');
  if (/error/i.test(out) || r.status !== 0) throw new Error('logman create failed (run elevated): ' + out.trim());
  log('[trace] started session ' + SESSION + ' -> ' + etlPath);
}
function stopTrace() {
  const r = runCmd('logman.exe', ['stop', SESSION, '-ets']);
  log('[trace] stopped: ' + (String(r.stdout || '').trim() || '(no output)'));
}
function convert(etlPath, csvPath) {
  const r = runCmd('tracerpt.exe', [etlPath, '-o', csvPath, '-of', 'CSV', '-y']);
  if (r.status !== 0 || !fs.existsSync(csvPath)) throw new Error('tracerpt failed: ' + String(r.stderr || r.stdout || '').trim());
  log('[trace] converted -> ' + csvPath);
}

async function waitForGame(pidOverride) {
  log('[run] waiting for WWE2K26_x64.exe to launch (up to ' + DEFAULTS.waitStartMin + ' min)...');
  const deadline = Date.now() + DEFAULTS.waitStartMin * 60000;
  let pid = pidOverride ? Number(pidOverride) : null;
  while (!pid && Date.now() < deadline) { pid = tasklistGamePid(); if (!pid) await sleep(3000); }
  if (!pid) throw new Error('game did not launch within the wait window');
  log('[run] game running (pid ' + pid + '). Waiting for exit (up to ' + DEFAULTS.waitRunMin + ' min)...');
  const exitDeadline = Date.now() + DEFAULTS.waitRunMin * 60000;
  while (Date.now() < exitDeadline) { if (!tasklistGamePid()) { log('[run] game exited.'); return pid; } await sleep(3000); }
  throw new Error('game did not exit within the runtime window');
}

function activeModCaks(gameDir) {
  const modsDir = path.join(gameDir, 'mods');
  const list = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(modsDir, 'manifest.json'), 'utf8'));
    const order = manifest.cakOrder || manifest.cak_order || [];
    for (const name of order) if (/\.cak$/i.test(name)) list.push(path.join(modsDir, name));
  } catch (_) { /* fall back to dir scan below */ }
  if (!list.length) {
    try {
      for (const f of fs.readdirSync(modsDir)) if (/\.cak$/i.test(f)) list.push(path.join(modsDir, f));
    } catch (_) { /* no mods */ }
  }
  return [...new Set(list)];
}

function catalogFor(cakPath) {
  if (catalogCache.has(cakPath)) return catalogCache.get(cakPath);
  let entry = null;
  try {
    const session = openArchive(cakPath, {});
    const entries = session.files
      .map((f) => ({ name: (f.name || f.nativeName || '(unresolved)'), off: Number(f.offset), size: f.storedSize }))
      .filter((e) => e.name !== '(unresolved)' || true)
      .sort((a, b) => a.off - b.off);
    entry = { entries };
  } catch (err) {
    entry = { entries: [], error: err.message };
  }
  catalogCache.set(cakPath, entry);
  return entry;
}
const catalogCache = new Map();

// The ETW trace stores NT device paths like \Device\HarddiskVolume5\SteamLibrary\...
// Map them back to real local paths using the game dir and known locations.
function localizeCakPath(raw, gameDir) {
  const p = String(raw);
  const rs = p.match(/\\ResourceSync\\(.*)$/i);
  if (rs) {
    const local = path.join(String(process.env.LOCALAPPDATA), 'WWE 2K26', 'ResourceSync', ...rs[1].split('\\'));
    return fs.existsSync(local) ? local : null;
  }
  const game = p.match(/\\WWE 2K26\\(.*)$/i);
  if (game) {
    const local = path.join(gameDir, ...game[1].split('\\'));
    return fs.existsSync(local) ? local : null;
  }
  const dev = p.match(/^\\Device\\HarddiskVolume\d+\\(.*)$/i);
  if (dev) {
    for (const drive of ['C', 'D', 'E', 'F', 'G']) {
      const candidate = drive + ':\\' + dev[1];
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return fs.existsSync(p) ? p : null;
}

function overlappingAssets(entries, off, size) {
  const end = off + size;
  const out = [];
  let lo = 0, hi = entries.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (entries[mid].off + Math.max(entries[mid].size, 1) <= off) lo = mid + 1; else hi = mid; }
  for (let i = Math.max(0, lo - 1); i < entries.length; i++) {
    const e = entries[i];
    if (e.off >= end) break;
    if (e.off < end && off < e.off + Math.max(e.size, 1)) out.push(e);
  }
  if (!out.length && off < 0x1000) { /* header/catalog read */ }
  return out;
}

async function analyze(csvPath, gameDir, focusList, pidOverride, outDir) {
  log('[analyze] reading ' + csvPath);
  const creates = [];
  const reads = [];
  const pidGameCakCreates = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(csvPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.startsWith('Microsoft-Windows-Kernel-File')) continue;
    const f = line.split(',');
    const id = parseInt(f[2], 10);
    const pid = (f[9] || '').trim().toLowerCase();
    const t = Number(f[16]);
    if (id === 12) {
      const m = line.match(/,\s*"([^"]*)"\s*$/);
      if (!m) continue;
      const name = m[1];
      if (!/\.cak$/i.test(name)) continue;
      const obj = (f[19] || '').trim();
      creates.push({ pid, t, obj, name });
      if (/WWE 2K26\\/i.test(name)) pidGameCakCreates.set(pid, (pidGameCakCreates.get(pid) || 0) + 1);
    } else if (id === 15) {
      reads.push({ pid, t, obj: (f[20] || '').trim(), off: Number(BigInt((f[19] || '0x0').trim())), size: Number(BigInt((f[24] || '0x0').trim())) });
    }
  }
  let gamePid = pidOverride ? String(pidOverride).toLowerCase() : null;
  if (gamePid && !gamePid.startsWith('0x')) gamePid = '0x' + Number(gamePid).toString(16).padStart(8, '0');
  if (!gamePid) {
    let best = null, bestCount = 0;
    for (const [pid, count] of pidGameCakCreates) if (count > bestCount) { best = pid; bestCount = count; }
    gamePid = best;
  }
  if (!gamePid) throw new Error('could not identify the game process in the trace');
  log('[analyze] game pid ' + gamePid + ' (' + (pidGameCakCreates.get(gamePid) || 0) + ' CAK opens)');

  const gameCreates = creates.filter((c) => c.pid === gamePid).sort((a, b) => a.t - b.t);
  const byObj = new Map();
  for (const c of gameCreates) { if (!byObj.has(c.obj)) byObj.set(c.obj, []); byObj.get(c.obj).push(c); }
  function ownerCandidates(obj, t) {
    const list = byObj.get(obj);
    if (!list) return [];
    const names = [];
    for (let i = list.length - 1; i >= 0 && names.length < 8; i--) {
      if (list[i].t <= t) {
        if (!names.includes(list[i].name)) names.push(list[i].name);
      }
    }
    return names;
  }

  // Build the full archive set: mods first (they win exact-offset matches), then stock, then ResourceSync.
  const modCaks = activeModCaks(gameDir).map((p) => p.replace(/\\/g, '/'));
  const stockCaks = [];
  for (const f of fs.readdirSync(gameDir)) if (/^bakedfile\d+\.cak$/i.test(f)) stockCaks.push(gameDir.replace(/\\/g, '/') + '/' + f);
  const syncCaks = [];
  try {
    const rsRoot = path.join(String(process.env.LOCALAPPDATA), 'WWE 2K26', 'ResourceSync');
    for (const dir of fs.readdirSync(rsRoot)) {
      const p = path.join(rsRoot, dir, 'rs.cak');
      if (fs.existsSync(p)) syncCaks.push(p.replace(/\\/g, '/'));
    }
  } catch (_) { /* no ResourceSync */ }
  const catalogOrder = [
    ...modCaks.map((p) => ({ p, kind: 'mod' })),
    ...stockCaks.map((p) => ({ p, kind: 'stock' })),
    ...syncCaks.map((p) => ({ p, kind: 'sync' }))
  ];
  const modPaths = new Set();
  for (const mod of modCaks) for (const e of catalogFor(mod).entries) modPaths.add(e.name.toLowerCase());

  function findExact(entries, off, size) {
    let lo = 0, hi = entries.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const e = entries[mid];
      if (e.off < off) lo = mid + 1;
      else if (e.off > off) hi = mid - 1;
      else return (e.size === size) ? e : null;
    }
    return null;
  }

  const assets = new Map();
  let gameReads = 0, cakReads = 0, cakMetaReads = 0;
  const caksTouched = new Set();
  const catalogOpened = new Map();
  for (const { p, kind } of catalogOrder) {
    const cat = catalogFor(p);
    catalogOpened.set(p, cat.error ? 'error:' + cat.error : cat.entries.length + ' entries');
  }
  for (const r of reads) {
    if (r.pid !== gamePid) continue;
    gameReads++;
    let hit = null;
    const candidates = ownerCandidates(r.obj, r.t)
      .filter((name) => /\.cak$/i.test(name))
      .map((name) => {
        const local = localizeCakPath(name, gameDir);
        if (!local) return null;
        const cakPath = local.replace(/\\/g, '/');
        const kind = /\/mods\//i.test(cakPath) ? 'mod' : (/resourcesync/i.test(cakPath) ? 'sync' : 'stock');
        return { cakPath, kind, cat: catalogFor(local) };
      })
      .filter((c) => c && !c.cat.error);
    // Phase 1+2: handle-verified candidates (exact first, then containment)
    for (const c of candidates) {
      const exact = findExact(c.cat.entries, r.off, r.size);
      if (exact) { hit = { cakPath: c.cakPath, kind: c.kind, entry: exact }; break; }
    }
    if (!hit) {
      for (const c of candidates) {
        const e = c.cat.entries.find((x) => x.off <= r.off && r.off + r.size <= x.off + Math.max(x.size, 1));
        if (e) { hit = { cakPath: c.cakPath, kind: c.kind, entry: e }; break; }
      }
    }
    // Phase 3: strict mod-only exact fingerprint (catches reads whose handles were recycled away)
    if (!hit) {
      for (const { p, kind } of catalogOrder) {
        if (kind !== 'mod') continue;
        const cat = catalogFor(p);
        if (cat.error) continue;
        const e = findExact(cat.entries, r.off, r.size);
        if (e) { hit = { cakPath: p, kind, entry: e }; break; }
      }
    }
    // Phase 3b: stock/sync containment only when exactly one archive contains the range
    if (!hit) {
      let sole = null, count = 0;
      for (const { p, kind } of catalogOrder) {
        const cat = catalogFor(p);
        if (cat.error) continue;
        const e = cat.entries.find((x) => x.off <= r.off && r.off + r.size <= x.off + Math.max(x.size, 1));
        if (e) { count++; sole = { cakPath: p, kind, entry: e }; if (count > 1) break; }
      }
      if (count === 1) hit = sole;
    }
    if (!hit) { cakMetaReads++; continue; }
    cakReads++;
    caksTouched.add(hit.cakPath.toLowerCase());
    const key = hit.entry.name.toLowerCase() + '|' + hit.cakPath.toLowerCase();
    let a = assets.get(key);
    if (!a) { a = { path: hit.entry.name, cak: hit.cakPath, kind: hit.kind, reads: 0, bytes: 0, first: r.t, last: r.t }; assets.set(key, a); }
    a.reads++;
    a.bytes += r.size;
    if (r.t < a.first) a.first = r.t;
    if (r.t > a.last) a.last = r.t;
  }

  const modHits = [], critical = [], attention = [], syncReads = [];
  for (const a of assets.values()) {
    const lower = a.path.toLowerCase();
    const isArchiveMetadata = /\.tdb$/i.test(a.path);
    if (a.kind === 'mod') modHits.push(a);
    else if (a.kind === 'sync') syncReads.push(a);
    else if (!isArchiveMetadata && modPaths.has(lower)) critical.push(a);
    else attention.push(a);
  }
  const focusMatch = (p) => focusList.some((f) => p.toLowerCase().startsWith(String(f).toLowerCase()));
  const focusAttention = attention.filter((a) => focusMatch(a.path));
  const sortTime = (x, y) => x.first - y.first;
  modHits.sort(sortTime); critical.sort(sortTime); focusAttention.sort(sortTime);

  const folderSummary = new Map();
  for (const a of [...modHits, ...focusAttention]) {
    const parts = a.path.split('/');
    const folder = parts.slice(0, Math.min(3, parts.length - 1)).join('/') || a.path;
    let s = folderSummary.get(folder);
    if (!s) { s = { folder, mod: 0, stock: 0 }; folderSummary.set(folder, s); }
    if (a.kind === 'mod') s.mod++; else s.stock++;
  }

  const result = {
    when: new Date().toISOString(),
    gamePid,
    csv: csvPath,
    gameReads, cakReads, cakMetaReads,
    catalogs: [...catalogOpened.entries()].map(([cak, info]) => ({ cak, info })),
    activeMods: modCaks.map((p) => p.replace(/\\/g, '/')),
    counts: { modHits: modHits.length, critical: critical.length, attention: attention.length, focusAttention: focusAttention.length },
    modHits, critical, focusAttention,
    folderSummary: [...folderSummary.values()].sort((a, b) => (b.mod + b.stock) - (a.mod + a.stock))
  };

  ensureDir(outDir);
  const jsonPath = path.join(outDir, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf8');
  const htmlPath = path.join(outDir, 'report.html');
  fs.writeFileSync(htmlPath, renderHtml(result, focusList), 'utf8');

  log('');
  log('==== Mod Coverage Summary ====');
  log('game pid            : ' + gamePid);
  log('game file reads     : ' + gameReads);
  log('CAK reads           : ' + cakReads + '  (header/catalog: ' + cakMetaReads + ')');
  const catalogIssues = [...catalogOpened.entries()].filter(([, info]) => String(info).startsWith('error:'));
  log('assets resolved     : ' + assets.size);
  log('MOD HITS            : ' + modHits.length);
  log('CRITICAL (stock read though mod provides the path): ' + critical.length);
  log('stock loads in focus namespaces: ' + focusAttention.length + '  (of ' + attention.length + ' unmodded total)');
  log('report: ' + htmlPath);
  log('json  : ' + jsonPath);
  if (critical.length) {
    log('');
    log('CRITICAL:');
    for (const a of critical.slice(0, 20)) log('  ' + a.path + '  <- ' + a.cak.split('/').pop() + '  reads=' + a.reads + '  first=' + ftToTime(a.first));
  }
  if (catalogIssues.length) {
    log('');
    log('catalog open problems (first ' + Math.min(5, catalogIssues.length) + '):');
    let n = 0;
    for (const [cak, info] of catalogIssues) { if (n++ >= 5) break; log('  ' + cak.split('/').pop() + ': ' + info); }
  }
  log('');
  log('Top focus namespaces (mod/stock):');
  for (const s of result.folderSummary.slice(0, 15)) log('  ' + String(s.mod).padStart(4) + ' mod / ' + String(s.stock).padStart(4) + ' stock   ' + s.folder);
  return result;
}

function renderHtml(r, focusList) {
  const row = (a) => `<tr><td>${escapeHtml(a.path)}</td><td>${escapeHtml(a.cak.split('/').pop())}</td><td class="n">${a.reads}</td><td class="n">${fmtBytes(a.bytes)}</td><td>${ftToTime(a.first)}</td><td>${ftToTime(a.last)}</td></tr>`;
  const table = (list, empty) => list.length
    ? `<table><thead><tr><th>Asset</th><th>CAK</th><th>Reads</th><th>Bytes</th><th>First</th><th>Last</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table>`
    : `<p class="empty">${empty}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Aurora Forge - Mod Coverage Report</title>
<style>
 body{font-family:Segoe UI,Arial,sans-serif;background:#14171c;color:#e6e6e6;margin:24px}
 h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:26px 0 8px;color:#9fd0ff}
 .sub{color:#9aa4b2;font-size:12px;margin-bottom:18px}
 .cards{display:flex;gap:12px;flex-wrap:wrap;margin:14px 0}
 .card{background:#1e232b;border:1px solid #2c3440;border-radius:8px;padding:10px 14px;min-width:150px}
 .card b{display:block;font-size:20px} .card span{color:#9aa4b2;font-size:11px}
 .critical{color:#ff6b6b} .good{color:#7ee787}
 table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:8px}
 th,td{border:1px solid #2c3440;padding:4px 8px;text-align:left;vertical-align:top}
 th{background:#1e232b;color:#9fd0ff;position:sticky;top:0}
 td.n{text-align:right} tr:nth-child(even){background:#191d24}
 .empty{color:#9aa4b2;font-size:12px}
 details{margin-top:18px} summary{cursor:pointer;color:#9fd0ff;font-size:14px}
 .wrap{max-height:70vh;overflow:auto;border:1px solid #2c3440;border-radius:6px;padding:8px}
</style></head><body>
<h1>Aurora Forge - Mod Coverage Report</h1>
<div class="sub">generated ${escapeHtml(r.when)} &middot; game pid ${escapeHtml(r.gamePid)} &middot; trace ${escapeHtml(r.csv)}<br>
active mods: ${r.activeMods.map((m) => escapeHtml(m.split('/').pop())).join(', ') || '(none)'} &middot; focus: ${escapeHtml(focusList.join(', '))}</div>
<div class="cards">
 <div class="card"><b>${r.counts.modHits}</b><span>MOD HITS (served from mod CAK)</span></div>
 <div class="card"><b class="${r.counts.critical ? 'critical' : 'good'}">${r.counts.critical}</b><span>CRITICAL (mod path read from stock)</span></div>
 <div class="card"><b>${r.counts.focusAttention}</b><span>stock loads in focus namespaces</span></div>
 <div class="card"><b>${r.cakReads}</b><span>CAK reads analyzed</span></div>
</div>
<h2>CRITICAL - stock read though an active mod provides the path</h2>
${table(r.critical, 'None. Every path an active mod provides was read from the mod CAK.')}
<h2>MOD HITS - served from a mod CAK</h2>
${table(r.modHits, 'No mod CAK assets were read in this capture.')}
<h2>Stock loads in focus namespaces (${escapeHtml(focusList.join(', '))})</h2>
${table(r.focusAttention, 'None.')}
<h2>Namespace summary</h2>
<table><thead><tr><th>Namespace</th><th>Mod</th><th>Stock</th></tr></thead><tbody>
${r.folderSummary.map((s) => `<tr><td>${escapeHtml(s.folder)}</td><td class="n">${s.mod}</td><td class="n">${s.stock}</td></tr>`).join('')}
</tbody></table>
<details><summary>Raw asset list (JSON)</summary><div class="wrap"><pre>${escapeHtml(JSON.stringify({ modHits: r.modHits, critical: r.critical, focusAttention: r.focusAttention }, null, 2))}</pre></div></details>
</body></html>`;
}

async function main() {
  if (command === 'help') {
    log('Mod Coverage Checker - see header of this file for usage.');
    return;
  }
  if (command === 'start') {
    const outDir = opts.dir ? String(opts.dir) : path.join(DEFAULTS.out, stamp());
    ensureDir(outDir);
    startTrace(path.join(outDir, 'trace.etl'));
    log('[trace] stop with: node mod-coverage-checker.js stop --dir "' + outDir + '"');
    return;
  }
  if (command === 'stop') {
    const outDir = opts.dir ? String(opts.dir) : null;
    if (!outDir) throw new Error('stop requires --dir <run folder>');
    stopTrace();
    await sleep(1500);
    convert(path.join(outDir, 'trace.etl'), path.join(outDir, 'trace.csv'));
    await analyze(path.join(outDir, 'trace.csv'), DEFAULTS.game, DEFAULTS.focus, DEFAULTS.pidOverride, outDir);
    return;
  }
  if (command === 'analyze') {
    const csv = positional[1];
    if (!csv || !fs.existsSync(csv)) throw new Error('analyze requires an existing CSV path');
    const outDir = opts.out2 ? String(opts.out2) : path.join(DEFAULTS.out, 'analyze-' + stamp());
    await analyze(csv, DEFAULTS.game, DEFAULTS.focus, DEFAULTS.pidOverride, outDir);
    return;
  }
  if (command === 'run') {
    const outDir = path.join(DEFAULTS.out, stamp());
    ensureDir(outDir);
    const etl = path.join(outDir, 'trace.etl');
    startTrace(etl);
    const pid = await waitForGame(DEFAULTS.pidOverride);
    stopTrace();
    await sleep(1500);
    const csv = path.join(outDir, 'trace.csv');
    convert(etl, csv);
    await analyze(csv, DEFAULTS.game, DEFAULTS.focus, pid ? String(pid) : DEFAULTS.pidOverride, outDir);
    return;
  }
  log('Unknown command "' + command + '". Use: run | start | stop | analyze | help');
}

main().catch((err) => { console.error('ERROR: ' + err.message); process.exit(1); });
