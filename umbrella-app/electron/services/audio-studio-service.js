'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

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

  function readMusicListFromCak(cakPath) {
    if (typeof openArchive !== 'function' || typeof recoverPayload !== 'function' || typeof derivePayloadKey !== 'function') return null;
    if (!fs.existsSync(cakPath)) return null;
    const session = openArchive(cakPath, {});
    const file = (session.files || [])[0];
    if (!file) return null;
    const fd = fs.openSync(cakPath, 'r');
    try {
      const stored = Buffer.alloc(file.storedSize);
      fs.readSync(fd, stored, 0, stored.length, Number(file.offset));
      return recoverPayload(stored, derivePayloadKey(session.key, file.storedSize, file.offset));
    } finally {
      fs.closeSync(fd);
    }
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
      exists: {
        gameFolder: fs.existsSync(config.gameFolder || ''),
        modsFolder: fs.existsSync(config.modsFolder || ''),
        musicListSource: fs.existsSync(effectiveList),
        bundledMusicList: fs.existsSync(bundledMusicListPath()),
        ffmpegPath: fs.existsSync(config.ffmpegPath || '')
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
    const source = effectiveMusicList();
    if (!source || !fs.existsSync(source)) {
      return { ok: false, error: 'No MusicList.jsfb source is available.', rows: [] };
    }
    const run = runNode(toolPath('edit-2k25-music-list.js'), ['--in', source, '--list']);
    if (run.status !== 0) throw new Error(`MusicList read failed: ${(run.stderr || run.stdout || '').trim()}`);
    const parsed = JSON.parse(run.stdout);
    const rows = parsed.music || [];
    return {
      ok: true,
      source,
      bundled: source === bundledMusicListPath(),
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

    const report = { wems: [], rows: [], package: null, cak: null, manifest: null, musicList: null };

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

    const packageName = String((payload && payload.packageName) || MUSIC_PACKAGE_NAME).replace(/[^A-Za-z0-9_.-]/g, '_');
    const soundDir = path.join(config.gameFolder, 'sound');
    fs.mkdirSync(soundDir, { recursive: true });
    const packagePath = path.join(soundDir, packageName.endsWith('.pck') ? packageName : `${packageName}.pck`);
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
    const cakEntry = path.basename(report.cak.path);
    const packageEntry = path.basename(packagePath);
    if (!manifest.cakOrder.includes(cakEntry)) manifest.cakOrder.push(cakEntry);
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
