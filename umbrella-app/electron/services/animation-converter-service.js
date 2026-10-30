'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function createAnimationConverterService(options) {
  const appRoot = options.appRoot;
  const userDataDir = options.userDataDir;
  const bundledToolPath = options.bundledToolPath;
  const onLog = options.onLog || (() => {});

  const workDir = path.join(userDataDir, 'animation-converter');
  const configPath = path.join(userDataDir, 'animation-converter-config.json');
  const foundryShim = path.join(workDir, 'foundry');

  function firstExisting(candidates) {
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
    return candidates[0];
  }

  function toolsDir() {
    return firstExisting([
      path.join(appRoot, '..', '..', 'animation', 'tools'),
      bundledToolPath('sl', 'animation', 'tools'),
      bundledToolPath('entry-studio', 'tools')
    ]);
  }

  function bundledSkeleton() {
    return firstExisting([
      path.join(appRoot, 'skeletons', '14000-base', 'BakeMe'),
      path.join(appRoot, '..', '..', 'umbrella-app', 'app', 'skeletons', '14000-base', 'BakeMe')
    ]);
  }

  // The bundled skeleton normally lives inside app.asar in the packaged app.
  // Electron main can read asar paths, but the converter's child Node process
  // cannot. Materialize the template into the writable work directory before
  // spawning refresh-2k26-skeleton.js.
  function copyBundledTree(from, to) {
    const stat = fs.statSync(from);
    if (stat.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      for (const name of fs.readdirSync(from)) {
        if (/^HideCtrlData\.hidelink\.jsfb$/i.test(name)) continue;
        const child = path.join(from, name);
        const childStat = fs.statSync(child);
        if (childStat.isSymbolicLink()) continue;
        copyBundledTree(child, path.join(to, name));
      }
      return;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, fs.readFileSync(from));
  }

  function materializeBundledSkeleton() {
    const template = bundledSkeleton();
    if (!template || !fs.existsSync(template)) {
      throw new Error(`Bundled 2K26 conversion skeleton was not found: ${template || '(no candidate)'}`);
    }
    const staged = path.join(workDir, 'bundled-skeleton');
    if (fs.existsSync(staged)) fs.rmSync(staged, { recursive: true, force: true });
    copyBundledTree(template, staged);
    if (!fs.existsSync(path.join(staged, 'Entrances', 'VictoryListData.jsfb'))) {
      throw new Error('Bundled 2K26 conversion skeleton is incomplete: missing Entrances/VictoryListData.jsfb');
    }
    return staged;
  }

  function readConfig() {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        game19: typeof raw.game19 === 'string' ? raw.game19 : '',
        game26: typeof raw.game26 === 'string' ? raw.game26 : '',
        output: typeof raw.output === 'string' ? raw.output : '',
        extractFolder: typeof raw.extractFolder === 'string' ? raw.extractFolder : ''
      };
    } catch (_error) {
      return { game19: '', game26: '', output: '', extractFolder: '' };
    }
  }

  function saveConfig(patch) {
    const config = readConfig();
    for (const key of ['game19', 'game26', 'output', 'extractFolder']) {
      if (patch && typeof patch[key] === 'string' && patch[key].trim()) config[key] = patch[key].trim();
    }
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    return config;
  }

  function gameVersion(folder) {
    const dir = String(folder || '');
    const known = {
      'WWE2K26_x64.exe': '2k26',
      'WWE2K25_x64.exe': '2k25',
      'WWE2K24_x64.exe': '2k24',
      'WWE2K23_x64.exe': '2k23',
      'WWE2K22_x64.exe': '2k22',
      'WWE2K20_x64.exe': '2k20',
      'WWE2K19_x64.exe': '2k19'
    };
    for (const [exe, version] of Object.entries(known)) {
      try { if (dir && fs.existsSync(path.join(dir, exe))) return { ok: true, version, exe }; } catch (_error) { /* keep looking */ }
    }
    return { ok: false };
  }

  function detectGame19() {
    const candidates = [
      'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
      'C:\\SteamLibrary\\steamapps\\common\\WWE 2K19',
      'D:\\SteamLibrary\\steamapps\\common\\WWE 2K19',
      'E:\\SteamLibrary\\steamapps\\common\\WWE 2K19'
    ];
    for (const candidate of candidates) {
      try { if (fs.existsSync(path.join(candidate, 'pac', 'evt'))) return candidate; } catch (_error) { /* keep looking */ }
    }
    return '';
  }

  function detectGame26() {
    const candidates = [
      'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
      'D:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
      'E:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K26',
      'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K26'
    ];
    for (const candidate of candidates) {
      try { if (fs.existsSync(path.join(candidate, 'WWE2K26_x64.exe'))) return candidate; } catch (_error) { /* keep looking */ }
    }
    return '';
  }

  function getDefaults() {
    const config = readConfig();
    const documents = path.join(process.env.USERPROFILE || '', 'Documents', 'AuroraForge NT100 Exports');
    return {
      ...config,
      game19: config.game19 || detectGame19(),
      game26: config.game26 || detectGame26(),
      output: config.output || path.join(documents, 'aurora-2k26-library.cak'),
      extractFolder: config.extractFolder || path.join(documents, '2k19-extract-all'),
      skeleton: bundledSkeleton(),
      tools: toolsDir(),
      toolsReady: fs.existsSync(path.join(toolsDir(), 'convert-2k19-library-to-2k25-entries.js')),
      work: workDir,
      exists: {
        game19: fs.existsSync(config.game19 || detectGame19()),
        game26: fs.existsSync(config.game26 || detectGame26()),
        skeleton: fs.existsSync(bundledSkeleton())
      }
    };
  }

  function runNode(scriptPath, args, label) {
    const script = path.join(toolsDir(), scriptPath);
    if (!fs.existsSync(script)) throw new Error(`Converter tool missing: ${scriptPath}`);
    onLog(`> ${label || scriptPath}`);
    const result = cp.spawnSync(process.execPath, [script].concat(args), {
      cwd: path.dirname(toolsDir()),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 1024,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });
    if (result.stdout) onLog(String(result.stdout).trim());
    if (result.stderr) onLog(String(result.stderr).trim());
    return result;
  }

  function ensureFoundryShim() {
    const realFoundry = [
      path.join(appRoot, '..', 'cak-foundry'),
      path.join(appRoot, '..', '..', 'cak-foundry')
    ].find((candidate) => fs.existsSync(path.join(candidate, 'scripts', 'bake-v93-cli.js')));
    if (realFoundry) return realFoundry;

    const electronSource = path.join(appRoot, '..', 'electron');
    const stagedFoundry = bundledToolPath('converter-foundry');
    const gameVersions = firstExisting([
      path.join(stagedFoundry, 'electron', 'game-versions.js'),
      bundledToolPath('sl', 'cak-foundry', 'electron', 'game-versions.js'),
      path.join(appRoot, '..', '..', 'cak-foundry', 'electron', 'game-versions.js')
    ]);
    const bakeCli = firstExisting([
      path.join(stagedFoundry, 'scripts', 'bake-v93-cli.js'),
      bundledToolPath('sl', 'cak-foundry', 'scripts', 'bake-v93-cli.js'),
      path.join(appRoot, '..', '..', 'cak-foundry', 'scripts', 'bake-v93-cli.js')
    ]);
    const helper = bundledToolPath('cak-helper', 'AuroraCakHelper.exe');
    const cakV93 = bundledToolPath('cak-v93');
    if (!fs.existsSync(gameVersions)) throw new Error('game-versions.js for the converter bake was not found.');
    if (!fs.existsSync(bakeCli)) throw new Error('bake-v93-cli.js for the converter bake was not found.');
    if (!fs.existsSync(helper)) throw new Error('AuroraCakHelper.exe for the converter was not found.');
    if (!fs.existsSync(cakV93)) throw new Error('The CAK v9.3 baker for the converter was not found.');

    if (fs.existsSync(foundryShim)) fs.rmSync(foundryShim, { recursive: true, force: true });
    fs.mkdirSync(path.join(foundryShim, 'electron'), { recursive: true });
    fs.mkdirSync(path.join(foundryShim, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(foundryShim, 'app', 'tools', 'cak-helper'), { recursive: true });
    for (const name of ['cak-reader.js', 'cak-v93-backend.js', 'archive-repackager.js', 'cak-v99-key.js']) {
      const source = path.join(electronSource, name);
      if (!fs.existsSync(source)) throw new Error(`${name} for the converter bake was not found.`);
      fs.copyFileSync(source, path.join(foundryShim, 'electron', name));
    }
    fs.copyFileSync(gameVersions, path.join(foundryShim, 'electron', 'game-versions.js'));
    fs.copyFileSync(bakeCli, path.join(foundryShim, 'scripts', 'bake-v93-cli.js'));
    fs.copyFileSync(helper, path.join(foundryShim, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe'));
    try {
      fs.symlinkSync(cakV93, path.join(foundryShim, 'app', 'tools', 'cak-v93'), 'junction');
    } catch (_error) {
      fs.cpSync(cakV93, path.join(foundryShim, 'app', 'tools', 'cak-v93'), { recursive: true });
    }
    return foundryShim;
  }

  function extract19(payload) {
    const config = readConfig();
    const game19 = (payload && payload.game19Folder) || config.game19;
    const out = (payload && payload.outFolder) || config.extractFolder;
    if (!game19 || !fs.existsSync(game19)) throw new Error('Choose your WWE 2K19 game folder first.');
    if (!out) throw new Error('Choose an extraction folder first.');
    const run = runNode('extract-2k19-animations.js', ['--game', game19, '--out', out, '--scope', (payload && payload.scope) || 'everything'], 'Extracting 2K19 files');
    if (run.status !== 0) throw new Error('2K19 extraction failed. See the log for details.');
    try { return JSON.parse(run.stdout); } catch (_error) { return { outputRoot: out }; }
  }

  function buildLibrary(payload) {
    const config = readConfig();
    const game19 = (payload && payload.game19Folder) || config.game19;
    const game26 = (payload && payload.game26Folder) || config.game26;
    const outputCak = (payload && payload.outputCak) || config.output;
    if (!game19 || !fs.existsSync(game19)) throw new Error('Choose your WWE 2K19 game folder first.');
    if (!game26 || !fs.existsSync(game26)) throw new Error('Choose your WWE 2K25/2K26 game folder first.');
    if (!outputCak) throw new Error('Choose an output CAK path first.');
    if (fs.existsSync(outputCak)) fs.rmSync(outputCak, { force: true });

    fs.mkdirSync(workDir, { recursive: true });
    const skeleton = path.join(workDir, 'skeleton');
    if (fs.existsSync(skeleton)) fs.rmSync(skeleton, { recursive: true, force: true });

    const foundry = ensureFoundryShim();
    const template = materializeBundledSkeleton();
    const refresh = runNode('refresh-2k26-skeleton.js', ['--game', game26, '--template', template, '--out', skeleton, '--foundry', foundry], 'Refreshing the registration skeleton from your own game');
    if (refresh.status !== 0) throw new Error('Skeleton refresh failed. See the log for details.');

    const extracted = path.join(path.dirname(outputCak), `${path.basename(outputCak, '.cak')}-2k19-extracted`);
    if (fs.existsSync(extracted)) fs.rmSync(extracted, { recursive: true, force: true });
    const extract = runNode('extract-2k19-animations.js', ['--game', game19, '--out', extracted, '--scope', 'all'], 'Decoding 2K19 animations');
    if (extract.status !== 0) throw new Error('2K19 extraction failed. See the log for details.');

    const convert = runNode('convert-2k19-library-to-2k25-entries.js', [
      '--skeleton', skeleton,
      '--victory', path.join(extracted, 'victory'),
      '--entrance', path.join(extracted, 'entrance'),
      '--out-cak', outputCak,
      '--game', '2k26',
      '--foundry', foundry
    ], 'Converting to new entries and baking the CAK');
    if (convert.status !== 0) throw new Error('Library conversion failed. See the log for details.');
    let validation = null;
    try { validation = JSON.parse(convert.stdout); } catch (_error) { validation = null; }
    return {
      ok: true,
      outputCak,
      bytes: fs.existsSync(outputCak) ? fs.statSync(outputCak).size : 0,
      extracted,
      skeleton,
      validation
    };
  }

  return { getDefaults, saveConfig, gameVersion, extract19, buildLibrary, materializeBundledSkeleton, _ensureFoundryShim: ensureFoundryShim };
}

module.exports = { createAnimationConverterService };
