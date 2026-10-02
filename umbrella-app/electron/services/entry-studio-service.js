'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const CONFIG_KEYS = ['extraction', 'binsEntrance', 'binsVictory', 'gameRoot', 'mods'];
const LEGACY_DEFAULTS = {
  extraction: 'C:\\Games\\2k25-extraction',
  binsEntrance: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-beta2-library-2k19-extracted\\entrance',
  binsVictory: 'C:\\AuroraForge-Aug26\\_work\\beta2-output\\aurora-beta2-library-2k19-extracted\\victory',
  gameRoot: 'C:\\WWE 2K25 Saturday Nights Main Event',
  mods: 'C:\\WWE 2K25 Saturday Nights Main Event\\mods'
};

function createEntryStudioService(options) {
  const appRoot = options.appRoot;
  const userDataDir = options.userDataDir;
  const bundledToolPath = options.bundledToolPath;

  const configPath = path.join(userDataDir, 'entry-studio-config.json');
  const workDir = path.join(userDataDir, 'entry-studio');
  const uploadsDir = path.join(workDir, 'uploads');
  const TREE = path.join(workDir, 'BakeMe');

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

  function ftrbPath() {
    return bundledToolPath('cak-v93', 'FTribTool.exe');
  }

  function readConfig() {
    let stored = {};
    try { stored = JSON.parse(fs.readFileSync(configPath, 'utf8')) || {}; } catch (_error) { stored = {}; }
    const config = {};
    for (const key of CONFIG_KEYS) {
      config[key] = typeof stored[key] === 'string' && stored[key].trim() ? stored[key].trim() : LEGACY_DEFAULTS[key];
    }
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
    const tools = toolsDir();
    const ftrb = ftrbPath();
    return {
      ...config,
      work: workDir,
      tree: TREE,
      tools,
      ftrb,
      toolsReady: fs.existsSync(tools),
      ftrbReady: fs.existsSync(ftrb),
      treeReady: fs.existsSync(path.join(TREE, 'Entrances', 'EntranceListData.jsfb')),
      exists: {
        extraction: fs.existsSync(config.extraction),
        binsEntrance: fs.existsSync(config.binsEntrance),
        binsVictory: fs.existsSync(config.binsVictory),
        gameRoot: fs.existsSync(config.gameRoot),
        mods: fs.existsSync(config.mods)
      }
    };
  }

  const toolCache = {};
  function tool(name) {
    if (!toolCache[name]) toolCache[name] = require(path.join(toolsDir(), name));
    return toolCache[name];
  }

  function runNode(scriptPath, args) {
    const config = readConfig();
    return cp.spawnSync(process.execPath, [scriptPath].concat(args), {
      cwd: path.dirname(toolsDir()),
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        AURORA_FTRIB: ftrbPath(),
        AURORA_GAME_ROOT: config.gameRoot
      }
    });
  }

  function ensureTree() {
    const config = readConfig();
    const { stageStockTree, ensureSdbWinner } = tool('convert-2k19-animation-to-2k25-entry.js');
    fs.mkdirSync(TREE, { recursive: true });
    stageStockTree(TREE, config.extraction);
    ensureSdbWinner(TREE, workDir);
    return TREE;
  }

  function scanBins(folder) {
    const config = readConfig();
    const dir = folder || config.binsEntrance;
    const files = [];
    const walk = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.toLowerCase().endsWith('.bin')) files.push({ path: full, name: entry.name, size: fs.statSync(full).size });
      }
    };
    if (dir && fs.existsSync(dir)) walk(dir);
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return { folder: dir, files };
  }

  function addFiles(paths) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    const added = [];
    for (const source of paths || []) {
      if (!source || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
      if (!source.toLowerCase().endsWith('.bin')) continue;
      const target = path.join(uploadsDir, path.basename(source));
      fs.copyFileSync(source, target);
      added.push({ path: target, name: path.basename(source), size: fs.statSync(target).size });
    }
    return { files: added };
  }

  function listEntries() {
    if (!fs.existsSync(TREE)) return { entries: [] };
    const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
    if (!fs.existsSync(ePath)) return { entries: [] };
    const rows = tool('locate-entrance-vectors.js').locateEntranceVectors(fs.readFileSync(ePath))[8] || [];
    const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
    const sdb = fs.existsSync(sdbPath)
      ? new Map(tool('sdb-read.js').readSdbRecords(fs.readFileSync(sdbPath)).map((r) => [r.id >>> 0, r.text]))
      : new Map();
    const entries = rows.filter((r) => r.id >= 14000).map((r) => ({
      id: r.id,
      nameString: r.nameString,
      name: sdb.get(r.nameString >>> 0) || null,
      motion: r.field4
    }));
    return { entries };
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
    const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
    if (fs.existsSync(sdbPath) && state.entrance && state.entrance.nameString) {
      try {
        const record = tool('sdb-read.js').findSdbRecord(fs.readFileSync(sdbPath), state.entrance.nameString);
        state.name = record ? record.text : null;
      } catch (_error) { state.name = null; }
    }
    return state;
  }

  function nextEntryId() {
    const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
    const rows = tool('locate-entrance-vectors.js').locateEntranceVectors(fs.readFileSync(ePath)).flat();
    const taken = new Set(rows.map((r) => r.id).filter((v) => Number.isSafeInteger(v)));
    let id = 14000;
    while (taken.has(id)) id += 1;
    return id;
  }

  function readDireVictoryScalars(vPath) {
    const vbuf = fs.readFileSync(vPath);
    const u16r = (at) => vbuf.readUInt16LE(at);
    const u32r = (at) => vbuf.readUInt32LE(at);
    const i32r = (at) => vbuf.readInt32LE(at);
    const fAr = (t, f) => {
      const v = t - i32r(t);
      const s = v + 4 + f * 2;
      if (s + 2 > v + u16r(v)) return null;
      const rel = u16r(s);
      return rel ? t + rel : null;
    };
    const oAr = (t, f) => { const at = fAr(t, f); return at === null ? null : at + u32r(at); };
    const vroot = u32r(0);
    const vvec = oAr(oAr(vroot, 0), 0);
    const vcount = u32r(vvec);
    let direVictory = null;
    for (let i = 0; i < vcount; i += 1) {
      const slot = vvec + 4 + i * 4;
      const t = slot + u32r(slot);
      const idA = fAr(t, 0);
      if (idA && u16r(idA) === 1) {
        const get = (f, read) => { const at = fAr(t, f); return at === null ? undefined : read(at); };
        direVictory = { someId: get(4, u32r), face: get(5, u32r) };
        break;
      }
    }
    return { direVictory, vcount, vvec, u32r, u16r, fAr };
  }

  function createEntryFromDire(entryId) {
    ensureTree();
    const dire = { nameString: 949807537 };
    const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
    const existing = tool('find-2k25-entrance-entry.js').findEntranceEntry(fs.readFileSync(ePath), entryId);
    if (!existing) {
      const tmp = `${ePath}.clone.tmp`;
      const out = runNode(path.join(toolsDir(), 'append_2k25_entrance_clone_graph.js'), [ePath, tmp, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(dire.nameString)]);
      if (out.status !== 0) throw new Error(`entrance clone failed: ${out.stderr || out.stdout}`);
      fs.renameSync(tmp, ePath);
    }

    const vPath = path.join(TREE, 'Entrances', 'VictoryListData.jsfb');
    const { direVictory, vcount, vvec, u32r, u16r, fAr } = readDireVictoryScalars(vPath);
    let alreadyVictory = false;
    for (let i = 0; i < vcount; i += 1) {
      const slot = vvec + 4 + i * 4;
      const t = slot + u32r(slot);
      const idA = fAr(t, 0);
      if (idA && u16r(idA) === entryId) { alreadyVictory = true; break; }
    }
    if (!alreadyVictory) {
      const args = [vPath, vPath, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(dire.nameString)];
      if (direVictory && direVictory.someId !== undefined) args.push('--some-id', String(direVictory.someId));
      if (direVictory && direVictory.face !== undefined) args.push('--face', String(direVictory.face));
      const out = runNode(path.join(toolsDir(), 'append_2k25_victory_entry.js'), args);
      if (out.status !== 0) throw new Error(`victory clone failed: ${out.stderr || out.stdout}`);
    }
    return { entryId, nameString: dire.nameString, clonedFrom: 1, files: ['Entrances/EntranceListData.jsfb', 'Entrances/VictoryListData.jsfb'] };
  }

  function convertForEntry(entryId, source19) {
    ensureTree();
    const config = readConfig();
    const { buildEntranceAssets } = tool('convert-2k19-animation-to-2k25-entry.js');
    const assets = buildEntranceAssets({ source19, entryId, extraction: config.extraction, outputRoot: TREE });
    const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
    tool('edit-2k25-entrance-entry.js').editEntranceEntry({ inputPath: ePath, outputPath: ePath, entryId, setters: { field4: entryId } });
    return { entryId, clips: assets.clips, adefs: assets.adefs, phases: assets.phases };
  }

  function writeEntry(entryId, fields, mode, kind) {
    ensureTree();
    let newNameId = fields.nameString;
    if (fields.name) {
      const sdbPath = path.join(TREE, 'Sdb', 'ENG.sdb');
      const out = runNode(path.join(toolsDir(), 'sdb-name.js'), [sdbPath, sdbPath, '--text', String(fields.name)]);
      if (out.status !== 0) throw new Error(`sdb-name failed: ${out.stderr || out.stdout}`);
      newNameId = JSON.parse(out.stdout).id;
    }
    const setters = {};
    for (const key of ['type', 'field6', 'field7', 'field8', 'field9']) {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') setters[key] = Number(fields[key]);
    }
    if (fields.motion !== undefined && fields.motion !== null && fields.motion !== '') {
      setters.field4 = Number(fields.motion);
      setters.field5 = Number(fields.motion);
    }
    if (newNameId) setters.nameString = Number(newNameId);

    const ePath = path.join(TREE, 'Entrances', 'EntranceListData.jsfb');
    const existing = tool('find-2k25-entrance-entry.js').findEntranceEntry(fs.readFileSync(ePath), entryId);
    if (!existing) {
      const tmp = `${ePath}.tmp`;
      const out = runNode(path.join(toolsDir(), 'append_2k25_entrance_clone_graph.js'), [ePath, tmp, '--entry-id', String(entryId), '--clone-id', '1', '--name-string', String(newNameId || 0)]);
      if (out.status !== 0) throw new Error(`entrance clone failed: ${out.stderr || out.stdout}`);
      fs.renameSync(tmp, ePath);
    }
    const result = tool('edit-2k25-entrance-entry.js').editEntranceEntry({ inputPath: ePath, outputPath: ePath, entryId, setters });
    return { entryId, nameId: newNameId, row: result.after };
  }

  function convertFiles(payload) {
    const files = (payload && payload.files) || [];
    ensureTree();
    const { convertAnimationToEntry } = tool('convert-2k19-animation-to-2k25-entry.js');
    const results = [];
    let next = Number(payload && payload.startId) > 0 ? Number(payload.startId) : nextEntryId();
    for (const file of files) {
      const entryId = next;
      next += 1;
      try {
        const result = convertAnimationToEntry({ source19: file, tree: TREE, entryId, name: `AURORA ${entryId}`, kind: 'auto', mode: 'minimal', fresh: false });
        results.push({ entryId, source: file, kind: result.kind, ok: true });
      } catch (error) {
        results.push({ entryId, source: file, ok: false, error: error.message });
      }
    }
    return { tree: TREE, results };
  }

  function musicList() {
    const config = readConfig();
    const { readMusicList } = tool('list-2k25-options.js');
    const list = readMusicList(fs.readFileSync(path.join(config.extraction, 'Audio', 'MusicList.jsfb')));
    return list.music.map((m) => ({ id: m.musicId, title: m.trackTitle, star: m.starName }));
  }

  function bake(payload) {
    const outPath = (payload && payload.out) || path.join(workDir, 'aurora-entry.cak');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.rmSync(outPath, { force: true });
    const result = cp.spawnSync(ftrbPath(), ['pack', '-i', TREE, '-o', outPath, '-v', '9.3', '--encrypt-header'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
    if (!fs.existsSync(outPath)) throw new Error(`${result.stdout || ''}${result.stderr || ''}` || 'bake failed');
    return { out: outPath, bytes: fs.statSync(outPath).size };
  }

  function stage(payload) {
    const config = readConfig();
    const modsDir = (payload && payload.mods) || config.mods;
    const cakPath = (payload && payload.cak) || path.join(workDir, 'aurora-entry.cak');
    if (!fs.existsSync(cakPath)) throw new Error(`CAK not found: ${cakPath}`);
    fs.mkdirSync(modsDir, { recursive: true });
    const name = path.basename(cakPath);
    fs.copyFileSync(cakPath, path.join(modsDir, name));
    const manifest = { version: 1, cakOrder: [name], packageOrder: [] };
    fs.writeFileSync(path.join(modsDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const raw = fs.readFileSync(path.join(modsDir, 'manifest.json'));
    if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) fs.writeFileSync(path.join(modsDir, 'manifest.json'), raw.subarray(3));
    return { staged: path.join(modsDir, name), manifest: JSON.parse(fs.readFileSync(path.join(modsDir, 'manifest.json'), 'utf8')) };
  }

  function createEntry(payload) {
    ensureTree();
    const entryId = Number(payload && payload.entryId) > 0 ? Number(payload.entryId) : nextEntryId();
    const created = createEntryFromDire(entryId);
    return { created, state: entryState(entryId) };
  }

  function getEntry(entryId) {
    return entryState(Number(entryId));
  }

  function writeEntryFromPayload(payload) {
    const entryId = Number(payload && payload.entryId);
    let converted = null;
    if (payload && payload.animationPath) converted = convertForEntry(entryId, payload.animationPath);
    const written = writeEntry(entryId, (payload && payload.fields) || {}, (payload && payload.mode) || 'minimal', (payload && payload.kind) || 'entrance');
    return { converted, written, state: entryState(entryId) };
  }

  return {
    getDefaults,
    saveConfig,
    scanBins,
    addFiles,
    listEntries,
    getEntry,
    createEntry,
    writeEntry: writeEntryFromPayload,
    convertFiles,
    musicList,
    bake,
    stage
  };
}

module.exports = { createEntryStudioService };
