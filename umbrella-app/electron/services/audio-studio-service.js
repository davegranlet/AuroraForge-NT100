'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { readMusicListFromCak: readMusicListFromCakModule } = require('./music-cak');

const CONFIG_KEYS = ['gameFolder', 'modsFolder', 'musicListSource', 'ffmpegPath'];
const MIN_CUSTOM_MUSIC_ID = 3000;
const MUSIC_CAK_NAME = 'CustomMusic.cak';
const MUSIC_PACKAGE_NAME = 'Custom_Music.pck';

function createAudioStudioService(options) {
  const appRoot = options.appRoot;
  const userDataDir = options.userDataDir;
  const bundledToolPath = options.bundledToolPath;
  const buildCak = options.buildCak;
  const verifyCak = options.verifyCak;
  const openArchive = options.openArchive;
  const recoverPayload = options.recoverPayload;
  const derivePayloadKey = options.derivePayloadKey;

  const configPath = path.join(userDataDir, 'audio-studio-config.json');
  const workDir = path.join(userDataDir, 'audio-studio');
  const importsDir = path.join(workDir, 'imports');
  const wemsDir = path.join(workDir, 'wems');
  const treeDir = path.join(workDir, 'cak-tree');

  function firstExisting(candidates) {
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
    return candidates[0];
  }

  function toolsDir() {
    return firstExisting([
      bundledToolPath('entry-studio', 'tools'),
      path.join(appRoot, '..', '..', 'animation', 'tools')
    ]);
  }

  function toolPath(name) {
    return path.join(toolsDir(), name);
  }

  function bundledMusicListPath() {
    return path.join(appRoot, 'data', 'audio', 'MusicList.jsfb');
  }

  let ffmpegCheckCache = null;
  function ffmpegAvailable() {
    if (ffmpegCheckCache !== null) return ffmpegCheckCache;
    const config = readConfig();
    const candidate = config.ffmpegPath || (process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    try {
      const run = cp.spawnSync(candidate, ['-version'], { encoding: 'utf8', timeout: 15000 });
      ffmpegCheckCache = !run.error && run.status === 0;
    } catch (_error) {
      ffmpegCheckCache = false;
    }
    return ffmpegCheckCache;
  }

  function workingMusicListPath() {
    return path.join(workDir, 'MusicList.working.jsfb');
  }

  function effectiveMusicList() {
    const config = readConfig();
    if (config.musicListSource && fs.existsSync(config.musicListSource)) return config.musicListSource;
    return bundledMusicListPath();
  }

  function ensureWorkingCopy() {
    const base = effectiveMusicList();
    if (!base || !fs.existsSync(base)) throw new Error('No MusicList.jsfb base is available.');
    fs.mkdirSync(workDir, { recursive: true });
    fs.copyFileSync(base, workingMusicListPath());
    return { base, working: workingMusicListPath(), bundled: base === bundledMusicListPath(), source: base === bundledMusicListPath() ? 'bundled default' : base };
  }

  function musicCakPath() {
    const config = readConfig();
    const modsFolder = config.modsFolder || (config.gameFolder ? path.join(config.gameFolder, 'mods') : '');
    if (!modsFolder) throw new Error('Choose your WWE 2K26 game folder first.');
    return path.join(modsFolder, MUSIC_CAK_NAME);
  }

  function timestamp() {
    return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  }

  function ensureMusicAddonEnabled(gameFolder) {
    const pluginsDir = path.join(gameFolder, 'Plugins');
    const addonsPath = path.join(pluginsDir, 'addons.txt');
    const addonName = 'AuroraForge.CustomMusicLoader.ftrib';
    if (!fs.existsSync(addonsPath)) return { ok: false, reason: 'Plugins/addons.txt not found (install the loader first)' };
    const lines = fs.readFileSync(addonsPath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.includes(addonName)) return { ok: true, changed: false };
    if (!fs.existsSync(path.join(pluginsDir, addonName))) return { ok: false, reason: addonName + ' is missing from Plugins' };
    const backup = `${addonsPath}.${timestamp()}.before-music-enable.bak`;
    fs.copyFileSync(addonsPath, backup);
    lines.push(addonName);
    fs.writeFileSync(addonsPath, lines.join('\n') + '\n', 'utf8');
    return { ok: true, changed: true, backup };
  }

  function removeStaleMusicCaks(modsFolder) {
    const removed = [];
    if (!fs.existsSync(modsFolder)) return removed;
    for (const name of fs.readdirSync(modsFolder)) {
      if (!/custommusic/i.test(name)) continue;
      if (name.toLowerCase() === MUSIC_CAK_NAME.toLowerCase()) continue;
      if (!/\.cak$/i.test(name)) continue;
      try {
        fs.renameSync(path.join(modsFolder, name), path.join(modsFolder, name + '.stale-bak'));
        removed.push(name);
      } catch (_error) { /* leave it in place */ }
    }
    return removed;
  }

  function readMusicListFromCak(cakPath) {
    return readMusicListFromCakModule({ openArchive, recoverPayload, derivePayloadKey }, cakPath);
  }

  function ensureWorkingCopyFromExistingCak() {
    const existing = musicCakPath();
    if (!fs.existsSync(existing)) return null;
    try {
      const recovered = readMusicListFromCak(existing);
      if (!recovered || recovered.length < 16 || recovered.subarray(4, 8).toString('latin1') !== 'Musi') return null;
      fs.mkdirSync(workDir, { recursive: true });
      fs.writeFileSync(workingMusicListPath(), recovered);
      return { base: existing, working: workingMusicListPath(), bundled: false, source: 'existing ' + MUSIC_CAK_NAME };
    } catch (_error) {
      return null;
    }
  }

  function readConfig() {
    let stored = {};
    try { stored = JSON.parse(fs.readFileSync(configPath, 'utf8')) || {}; } catch (_error) { stored = {}; }
    const config = {};
    for (const key of CONFIG_KEYS) {
      config[key] = typeof stored[key] === 'string' && stored[key].trim() ? stored[key].trim() : '';
    }
    if (!config.modsFolder && config.gameFolder) config.modsFolder = path.join(config.gameFolder, 'mods');
    return config;
  }

  function saveConfig(patch) {
    const config = readConfig();
    if (patch && typeof patch === 'object') {
      for (const key of CONFIG_KEYS) {
        if (typeof patch[key] === 'string' && patch[key].trim()) config[key] = patch[key].trim();
      }
    }
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    return config;
  }

  function getDefaults() {
    const config = readConfig();
    const effectiveList = effectiveMusicList();
    return {
      ...config,
      musicListSource: effectiveList,
      bundledMusicList: bundledMusicListPath(),
      musicListSourceIsBundled: effectiveList === bundledMusicListPath(),
      work: workDir,
      tools: toolsDir(),
      toolsReady: fs.existsSync(toolPath('build-music-pck.js')) && fs.existsSync(toolPath('build-wem.js')) && fs.existsSync(toolPath('edit-2k25-music-list.js')),
      ffmpegReady: ffmpegAvailable(),
      exists: {
        gameFolder: fs.existsSync(config.gameFolder || ''),
        modsFolder: fs.existsSync(config.modsFolder || ''),
        musicListSource: fs.existsSync(effectiveList),
        bundledMusicList: fs.existsSync(bundledMusicListPath()),
        ffmpegPath: ffmpegAvailable()
      }
    };
  }

  function runNode(script, args) {
    return cp.spawnSync(process.execPath, [script].concat(args), {
      cwd: path.dirname(toolsDir()),
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });
  }

  function listMusic() {
    let buffer = null;
    let source = '';
    let fromCak = false;
    try {
      const existing = musicCakPath();
      if (fs.existsSync(existing)) {
        buffer = readMusicListFromCak(existing);
        if (buffer) { source = existing; fromCak = true; }
      }
    } catch (_error) { buffer = null; }
    if (!buffer) {
      source = effectiveMusicList();
      if (!source || !fs.existsSync(source)) {
        return { ok: false, error: 'No MusicList.jsfb source is available.', rows: [] };
      }
      buffer = fs.readFileSync(source);
    }
    const { readMusicList } = require(path.join(toolsDir(), 'edit-2k25-music-list.js'));
    const rows = readMusicList(buffer).records;
    return {
      ok: true,
      source,
      fromCak,
      bundled: !fromCak && source === bundledMusicListPath(),
      count: rows.length,
      stockCount: rows.filter((row) => row.musicId < MIN_CUSTOM_MUSIC_ID).length,
      customCount: rows.filter((row) => row.musicId >= MIN_CUSTOM_MUSIC_ID).length,
      rows
    };
  }

  function addFiles(paths) {
    fs.mkdirSync(importsDir, { recursive: true });
    const added = [];
    for (const source of paths || []) {
      if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
      const target = path.join(importsDir, path.basename(source));
      fs.copyFileSync(source, target);
      added.push({ path: target, name: path.basename(source), size: fs.statSync(target).size });
    }
    return { files: added };
  }

  function encodeWem(sourcePath, musicId) {
    fs.mkdirSync(wemsDir, { recursive: true });
    const output = path.join(wemsDir, `${1080000000 + (Number(musicId) - MIN_CUSTOM_MUSIC_ID)}.wem`);
    const args = [toolPath('build-wem.js'), '--in', sourcePath, '--out', output];
    const config = readConfig();
    if (config.ffmpegPath) args.push('--ffmpeg', config.ffmpegPath);
    const run = runNode(toolPath('build-wem.js'), args.slice(1));
    if (run.status !== 0) throw new Error(`WEM encode failed for ${path.basename(sourcePath)}: ${(run.stderr || run.stdout || '').trim()}`);
    return output;
  }

  function nextFreeMusicId(existingIds) {
    let id = MIN_CUSTOM_MUSIC_ID;
    const taken = new Set(existingIds || []);
    while (taken.has(id)) id += 1;
    return id;
  }

  function build(payload) {
    const config = readConfig();
    if (!config.gameFolder || !fs.existsSync(config.gameFolder)) throw new Error('Choose your WWE 2K26 game folder first.');
    const modsFolder = config.modsFolder || path.join(config.gameFolder, 'mods');
    const tracks = (payload && payload.tracks) || [];
    if (!tracks.length) throw new Error('Add at least one custom track first.');
    const baseCopy = ensureWorkingCopyFromExistingCak() || ensureWorkingCopy();
    const addon = ensureMusicAddonEnabled(config.gameFolder);
    const removedStaleCaks = removeStaleMusicCaks(modsFolder);

    const report = { wems: [], rows: [], package: null, cak: null, manifest: null, musicList: null, addon, removedStaleCaks };

    const existing = listMusic().rows.map((row) => row.musicId);
    const usedIds = new Set(existing);
    const wemEntries = [];
    const rows = [];
    for (const track of tracks) {
      if (!track || !track.sourcePath || !fs.existsSync(track.sourcePath)) throw new Error(`Missing audio file: ${track && track.sourcePath}`);
      let musicId = Number(track.musicId);
      if (!Number.isSafeInteger(musicId) || musicId < MIN_CUSTOM_MUSIC_ID) {
        musicId = nextFreeMusicId([...usedIds]);
      }
      usedIds.add(musicId);
      const wem = encodeWem(track.sourcePath, musicId);
      report.wems.push({ musicId, wem, bytes: fs.statSync(wem).size });
      wemEntries.push({ id: 1080000000 + (musicId - MIN_CUSTOM_MUSIC_ID), path: wem });
      rows.push({
        musicId,
        trackTitle: String(track.trackTitle || path.basename(track.sourcePath, path.extname(track.sourcePath))),
        starName: String(track.starName || 'CUSTOM MUSIC'),
        type: Number.isSafeInteger(Number(track.type)) ? Number(track.type) : 4,
        cuePoint: Number(track.cuePoint) || 0
      });
    }

    const { readMusicList, removeMusicRows } = require(path.join(toolsDir(), 'edit-2k25-music-list.js'));
    const preRows = readMusicList(fs.readFileSync(baseCopy.working)).records;
    const pruneIds = preRows
      .filter((row) => row.musicId >= MIN_CUSTOM_MUSIC_ID)
      .filter((row) => !fs.existsSync(path.join(wemsDir, `${1080000000 + (row.musicId - MIN_CUSTOM_MUSIC_ID)}.wem`)))
      .map((row) => row.musicId);
    if (pruneIds.length) {
      fs.writeFileSync(baseCopy.working, removeMusicRows(fs.readFileSync(baseCopy.working), pruneIds));
    }
    report.prunedRows = pruneIds;

    const packageName = String((payload && payload.packageName) || MUSIC_PACKAGE_NAME).replace(/[^A-Za-z0-9_.-]/g, '_');
    const soundDir = path.join(config.gameFolder, 'sound');
    fs.mkdirSync(soundDir, { recursive: true });
    const packagePath = path.join(soundDir, packageName.endsWith('.pck') ? packageName : `${packageName}.pck`);
    const baseRows = readMusicList(fs.readFileSync(baseCopy.working)).records;
    const allCustomIds = new Set([
      ...baseRows.filter((row) => row.musicId >= MIN_CUSTOM_MUSIC_ID).map((row) => row.musicId),
      ...rows.map((row) => row.musicId)
    ]);
    const missingWems = [];
    for (const musicId of allCustomIds) {
      const wemId = 1080000000 + (musicId - MIN_CUSTOM_MUSIC_ID);
      const wemPath = path.join(wemsDir, `${wemId}.wem`);
      if (fs.existsSync(wemPath)) {
        if (!wemEntries.some((entry) => entry.id === wemId)) wemEntries.push({ id: wemId, path: wemPath });
      } else {
        missingWems.push(musicId);
      }
    }
    report.missingWems = missingWems;
    const pckArgs = [toolPath('build-music-pck.js'), '--out', packagePath];
    for (const entry of wemEntries) pckArgs.push('--map', `${entry.id}=${entry.path}`);
    const pckRun = runNode(toolPath('build-music-pck.js'), pckArgs.slice(1));
    if (pckRun.status !== 0) throw new Error(`Package build failed: ${(pckRun.stderr || pckRun.stdout || '').trim()}`);
    report.package = { path: packagePath, bytes: fs.statSync(packagePath).size };

    const editedListPath = path.join(workDir, 'MusicList.jsfb');
    fs.mkdirSync(workDir, { recursive: true });
    const listArgs = [toolPath('edit-2k25-music-list.js'), '--in', baseCopy.working, '--out', editedListPath];
    for (const row of rows) listArgs.push('--add', `${row.musicId}=${row.trackTitle}=${row.starName}=${row.cuePoint}=${row.type}`);
    const listRun = runNode(toolPath('edit-2k25-music-list.js'), listArgs.slice(1));
    if (listRun.status !== 0) throw new Error(`MusicList edit failed: ${(listRun.stderr || listRun.stdout || '').trim()}`);
    report.rows = rows;
    report.musicList = {
      base: baseCopy.base,
      baseSource: baseCopy.source,
      baseIsBundled: baseCopy.bundled,
      workingCopy: baseCopy.working,
      edited: editedListPath,
      bakedInto: null
    };

    const cakPath = musicCakPath();
    fs.rmSync(treeDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(treeDir, 'Audio'), { recursive: true });
    fs.copyFileSync(editedListPath, path.join(treeDir, 'Audio', 'MusicList.jsfb'));
    fs.mkdirSync(path.dirname(cakPath), { recursive: true });
    const built = buildCak(treeDir, cakPath);
    report.cak = { path: built.outputPath || cakPath, bytes: fs.statSync(built.outputPath || cakPath).size };
    if (typeof verifyCak === 'function') report.cak.verified = Boolean(verifyCak(built.outputPath || cakPath));
    if (report.musicList) report.musicList.bakedInto = report.cak.path;

    const manifestPath = path.join(modsFolder, 'manifest.json');
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    let manifest = { version: 1, cakOrder: [], packageOrder: [] };
    try {
      const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (existingManifest && Array.isArray(existingManifest.cakOrder)) manifest.cakOrder = existingManifest.cakOrder.slice();
      if (existingManifest && Array.isArray(existingManifest.packageOrder)) manifest.packageOrder = existingManifest.packageOrder.slice();
    } catch (_error) { /* start fresh */ }
    manifest.cakOrder = manifest.cakOrder.filter((name) => !/custommusic/i.test(String(name)));
    const cakEntry = path.basename(report.cak.path);
    const packageEntry = path.basename(packagePath);
    manifest.cakOrder.unshift(cakEntry);
    if (!manifest.packageOrder.includes(packageEntry)) manifest.packageOrder.push(packageEntry);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const raw = fs.readFileSync(manifestPath);
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fs.writeFileSync(manifestPath, raw.subarray(3));
    report.manifest = { path: manifestPath, cakOrder: manifest.cakOrder, packageOrder: manifest.packageOrder };
    return report;
  }

  return {
    getDefaults,
    saveConfig,
    listMusic,
    addFiles,
    encodeWem,
    build
  };
}

module.exports = { createAudioStudioService, MIN_CUSTOM_MUSIC_ID };
