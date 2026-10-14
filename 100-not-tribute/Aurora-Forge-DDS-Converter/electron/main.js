const { app, BrowserWindow, Menu, shell, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { pathToFileURL } = require('url');
const cakReader = require('./cak-reader');
const cak20Reader = require('./cak20-reader');
const archiveRepackager = require('./archive-repackager');
const motion19Analyzer = require('../scripts/analyze-2k19-motion');
const { createGameInstallRegistry } = require('./services/game-install-registry');
const { createOperationJournal } = require('./services/operation-journal');
const { createCapabilityRegistry } = require('./services/capability-registry');
const { createSecureLoaderManager } = require('./services/secure-loader-manager');
const { createSecureLoaderReleaseService } = require('./services/secure-loader-release');
const { createLoaderDiagnostics } = require('./services/loader-diagnostics');
const { createCakCollisionService } = require('./services/cak-collision-service');
const { createModManifestManager } = require('./services/mod-manifest-manager');
const secureDataCtrlLinkManifest = require('../app/data/compatibility/secure-datacrtllink.json');

const APP_ROOT = path.join(__dirname, '..', 'app');
const START_PAGE = process.env.AURORA_START_PAGE || 'index.html';
const WINDOW_TITLE = process.env.AURORA_WINDOW_TITLE || 'Aurora Forge';
const STANDALONE_TOOL = process.env.AURORA_STANDALONE_TOOL || '';
if (STANDALONE_TOOL) {
  app.setName(WINDOW_TITLE);
  app.setPath('userData', path.join(app.getPath('appData'), WINDOW_TITLE));
}
const DEFAULT_PROJECTS_DIR_NAME = 'Aurora Forge Projects';
const DEFAULT_EXPORTS_DIR_NAME = 'Aurora Forge Exports';
let lastDdsConverterOutputDir = '';
let lastBuiltCakPath = '';
let lastBuiltCakSource = '';
let currentCakSession = null;
let lastCakOutputDir = '';
let currentPac19Archive = '';
let lastPac19OutputDir = '';
let lastCak20OutputDir = '';
let selectedSecureLoaderSource = '';
let workshopServiceCache = null;
const MOD_SUITE_BAKEME_ROOTS = Object.freeze([
  'Animation', 'AnimSystem', 'Arena', 'Audio', 'Belts', 'Characters', 'CreateShow',
  'Cutscene', 'Entrances', 'Environment', 'GMMode', 'Hide', 'Logo', 'MatchCreator',
  'MoveData', 'Movies', 'MSC', 'Particle', 'Props', 'Roster', 'Rules', 'Sdb',
  'SharedGameplay', 'Stable', 'UI'
]);
const MOD_SUITE_RECOGNIZED_EXTENSIONS = Object.freeze(new Set([
  '.adefs', '.bk2', '.cak', '.clip', '.clips', '.dds', '.hkt', '.hpl', '.jsfb',
  '.jmtl', '.json', '.mcd', '.mdl', '.mtls', '.ogg', '.pck', '.png', '.txt',
  '.wem', '.wav', '.ycl'
]));
const DDS_FORMATS = Object.freeze({
  R8_UNORM: 61,
  R8G8_UNORM: 49,
  R8G8B8A8_UNORM: 28,
  R8G8B8A8_UNORM_SRGB: 29,
  B8G8R8A8_UNORM: 87,
  B8G8R8X8_UNORM: 88,
  B8G8R8A8_UNORM_SRGB: 91,
  B8G8R8X8_UNORM_SRGB: 93,
  BC1_UNORM: 71,
  BC1_UNORM_SRGB: 72,
  BC2_UNORM: 74,
  BC2_UNORM_SRGB: 75,
  BC3_UNORM: 77,
  BC3_UNORM_SRGB: 78,
  BC4_UNORM: 80,
  BC4_SNORM: 81,
  BC5_UNORM: 83,
  BC5_SNORM: 84,
  BC6H_UF16: 95,
  BC6H_SF16: 96,
  BC7_UNORM: 98,
  BC7_UNORM_SRGB: 99
});
const DXGI_TO_FORMAT = Object.freeze(Object.fromEntries(Object.entries(DDS_FORMATS).map(([name, value]) => [value, name])));
const FOURCC_TO_FORMAT = Object.freeze({ DXT1: 'BC1_UNORM', DXT3: 'BC2_UNORM', DXT5: 'BC3_UNORM', ATI1: 'BC4_UNORM', BC4U: 'BC4_UNORM', ATI2: 'BC5_UNORM', BC5U: 'BC5_UNORM' });
const TOOL_DEFINITIONS = Object.freeze({
  projectsFolder: { label: 'Projects folder', kind: 'directory' },
  exportsFolder: { label: 'Exports folder', kind: 'directory' },
  gameFolder: { label: 'WWE 2K26 game folder', kind: 'directory' },
  game19Folder: { label: 'WWE 2K19 game folder', kind: 'directory' },
  game20Folder: { label: 'WWE 2K20 game folder', kind: 'directory' },
  cakeView: { label: 'CakeView', kind: 'file' },
  tribute: { label: 'Tribute', kind: 'file' },
  blender: { label: 'Blender', kind: 'file' },
  imageEditor: { label: 'Image editor', kind: 'file' },
  texconv: { label: 'DirectXTex texconv', kind: 'file' },
  audioEditor: { label: 'Audio editor', kind: 'file' },
  videoTool: { label: 'Video/BK2 tool', kind: 'file' },
  modsFolder: { label: 'Mod workspace folder', kind: 'directory' },
  backupFolder: { label: 'Backup folder', kind: 'directory' }
});

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wwe2k26',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true
    }
  }
]);

function sanitizeName(name) {
  return String(name || 'New Project')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'New Project';
}

function defaultProjectsPath() {
  const configured = readToolConfig().projectsFolder;
  return configured || path.join(app.getPath('documents'), DEFAULT_PROJECTS_DIR_NAME);
}

function defaultExportsPath() {
  const configured = readToolConfig().exportsFolder;
  return configured || path.join(app.getPath('documents'), DEFAULT_EXPORTS_DIR_NAME);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isWwe2K26Running() {
  if (process.platform !== 'win32') return false;
  try {
    const result = cp.spawnSync('tasklist.exe', ['/FI', 'IMAGENAME eq WWE2K26_x64.exe', '/NH', '/FO', 'CSV'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    return result.status === 0 && /WWE2K26_x64\.exe/i.test(String(result.stdout || ''));
  } catch (_error) { return true; }
}

function workshopServices() {
  if (workshopServiceCache) return workshopServiceCache;
  const registry = createGameInstallRegistry(path.join(app.getPath('userData'), 'aurora-workshop.json'));
  const journal = createOperationJournal(app.getPath('userData'));
  const capabilities = createCapabilityRegistry({ installRegistry: registry, manifest: secureDataCtrlLinkManifest, isGameRunning: isWwe2K26Running, cakHelperPath, directXTexPath: () => bundledToolPath('texconv', 'texconv.exe') });
  const loader = createSecureLoaderManager({ installRegistry: registry, capabilityRegistry: capabilities, journal, manifest: secureDataCtrlLinkManifest, isGameRunning: isWwe2K26Running });
  const releases = createSecureLoaderReleaseService({ userDataPath: app.getPath('userData'), manifest: secureDataCtrlLinkManifest, sha256: capabilities.sha256, helperPath: path.join(__dirname, 'helpers', 'secure-loader-zip.ps1') });
  const diagnostics = createLoaderDiagnostics({ installRegistry: registry });
  const collisions = createCakCollisionService({ installRegistry: registry, openArchive: cakReader.openArchive, readDictionary: readCakDictionary });
  const modManifest = createModManifestManager({ installRegistry: registry, journal, isGameRunning: isWwe2K26Running });
  workshopServiceCache = { registry, journal, capabilities, loader, releases, diagnostics, collisions, modManifest };
  return workshopServiceCache;
}

function auditModSuiteFolder(selectedPath) {
  const selected = path.resolve(String(selectedPath || ''));
  if (!selected || !fs.existsSync(selected) || !fs.statSync(selected).isDirectory()) throw new Error('The selected audit folder is unavailable.');
  const childBakeMe = path.join(selected, 'BakeMe');
  const root = fs.existsSync(childBakeMe) && fs.statSync(childBakeMe).isDirectory() ? childBakeMe : selected;
  const knownRoots = new Set(MOD_SUITE_BAKEME_ROOTS.map((name) => name.toLowerCase()));
  const roots = [];
  const extensions = {};
  let totalFiles = 0;
  let totalDirectories = 0;
  let totalBytes = 0;
  const maxEntries = 100000;

  function walkAudit(directory, rootRecord) {
    if (totalFiles + totalDirectories >= maxEntries) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (totalFiles + totalDirectories >= maxEntries) break;
      const fullPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        totalDirectories += 1;
        walkAudit(fullPath, rootRecord);
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        const extension = path.extname(entry.name).toLowerCase() || '[no extension]';
        totalFiles += 1;
        totalBytes += stat.size;
        rootRecord.files += 1;
        rootRecord.bytes += stat.size;
        extensions[extension] = (extensions[extension] || 0) + 1;
      }
    }
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const record = { name: entry.name, recognized: entry.isDirectory() && knownRoots.has(entry.name.toLowerCase()), files: 0, bytes: 0 };
    if (entry.isDirectory()) {
      totalDirectories += 1;
      walkAudit(path.join(root, entry.name), record);
    } else if (entry.isFile()) {
      const fullPath = path.join(root, entry.name);
      const stat = fs.statSync(fullPath);
      const extension = path.extname(entry.name).toLowerCase() || '[no extension]';
      record.files = 1;
      record.bytes = stat.size;
      totalFiles += 1;
      totalBytes += stat.size;
      extensions[extension] = (extensions[extension] || 0) + 1;
    }
    roots.push(record);
  }
  const recognizedRoots = roots.filter((item) => item.recognized).map((item) => item.name);
  const unrecognizedRoots = roots.filter((item) => !item.recognized).map((item) => item.name);
  const unknownExtensions = Object.keys(extensions).filter((extension) => extension !== '[no extension]' && !MOD_SUITE_RECOGNIZED_EXTENSIONS.has(extension));
  const notes = [];
  if (root !== selected) notes.push('A BakeMe child folder was detected and audited instead of the surrounding project folder.');
  if (!recognizedRoots.length) notes.push('No recognized WWE 2K26 BakeMe roots were found. Confirm that the correct staging folder was selected.');
  if (unrecognizedRoots.length) notes.push('Unrecognized top-level entries are not automatically unsafe, but should be documented before packaging.');
  if (unknownExtensions.length) notes.push('Unrecognized extensions found: ' + unknownExtensions.sort().join(', ') + '.');
  if (totalFiles + totalDirectories >= maxEntries) notes.push('The audit stopped at the 100,000-entry safety limit.');
  if (!notes.length) notes.push('The folder uses recognized roots and file types. This structural check does not prove that binary records or IDs are correct.');
  return { path: root, selectedPath: selected, scannedAt: new Date().toISOString(), totalFiles, totalDirectories, totalBytes, roots, recognizedRoots, unrecognizedRoots, extensions, notes };
}

function toolConfigPath() {
  return path.join(app.getPath('userData'), 'aurora-external-tools.json');
}

function readCakDictionary() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'data', 'cak-known-paths.json'), 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch (_error) { return {}; }
}

function resolveOodlePath(archivePath = '') {
  const config = readToolConfig();
  const candidates = [
    config.gameFolder ? path.join(config.gameFolder, 'oo2core_9_win64.dll') : '',
    archivePath ? path.join(path.dirname(archivePath), 'oo2core_9_win64.dll') : ''
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || '';
}

function bundledToolPath(...parts) {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'app', 'tools', ...parts);
    if (fs.existsSync(unpacked)) return unpacked;
  }
  return path.join(APP_ROOT, 'tools', ...parts);
}

function cakHelperPath() {
  return bundledToolPath('cak-helper', 'AuroraCakHelper.exe');
}

function pac19HelperPath() {
  return bundledToolPath('pac19-helper', 'AuroraPac19Helper.exe');
}

function pac19GameFolder() {
  const configured = readToolConfig().game19Folder || '';
  if (configured && fs.existsSync(configured)) return configured;
  const normalSteamPath = 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19';
  return fs.existsSync(normalSteamPath) ? normalSteamPath : '';
}

function pac19OodlePath(archivePath = '') {
  const candidates = [];
  const gameFolder = pac19GameFolder();
  if (gameFolder) candidates.push(path.join(gameFolder, 'oo2core_6_win64.dll'));
  let cursor = archivePath ? path.dirname(path.resolve(archivePath)) : '';
  for (let level = 0; cursor && level < 6; level += 1) {
    candidates.push(path.join(cursor, 'oo2core_6_win64.dll'));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || '';
}

function cak20GameFolder() {
  const configured = readToolConfig().game20Folder || '';
  if (configured && fs.existsSync(configured)) return configured;
  const normalSteamPath = 'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE2K20';
  return fs.existsSync(normalSteamPath) ? normalSteamPath : '';
}

function cak20OodlePath() {
  const gameFolder = cak20GameFolder();
  const candidate = gameFolder ? path.join(gameFolder, 'oo2core_7_win64.dll') : '';
  return candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : '';
}

function cak20ArchiveSummary() {
  const gameFolder = cak20GameFolder();
  if (!gameFolder || !fs.existsSync(gameFolder) || !fs.statSync(gameFolder).isDirectory()) return [];
  return fs.readdirSync(gameFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.cak$/i.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(gameFolder, entry.name);
      const header = Buffer.alloc(4);
      const fd = fs.openSync(fullPath, 'r');
      try { fs.readSync(fd, header, 0, 4, 0); } finally { fs.closeSync(fd); }
      const signature = header.toString('ascii');
      return { name: entry.name, path: fullPath, bytes: fs.statSync(fullPath).size, signature };
    })
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
}

function openCak20Sessions() {
  const archives = cak20ArchiveSummary().filter((archive) => archive.signature === 'FDIR');
  return archives.map((archive) => cak20Reader.openArchive(archive.path));
}

function safeCak20RelativePath(file) {
  const fallback = `Unresolved/${String(file.id).padStart(6, '0')}.bin`;
  const normalized = String(file.name || fallback).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || path.isAbsolute(normalized) || normalized.split('/').includes('..')) return fallback;
  return normalized;
}

function cak20FileSummary(session, file) {
  const expected = cak20Reader.expectedFirstWord(file);
  return {
    archiveName: session.archiveName,
    id: file.id,
    name: safeCak20RelativePath(file),
    type: file.type || path.extname(file.name || '').replace('.', '').toUpperCase() || 'RAW',
    storedSize: file.storedSize,
    offset: file.offset,
    extractable: Boolean(file.extractable && expected),
    decodeRule: expected ? expected.source : 'coming-soon'
  };
}

function runPac19Helper(request) {
  const helper = pac19HelperPath();
  if (!fs.existsSync(helper)) throw new Error('The WWE 2K19 PAC helper has not been built. Run npm run build:pac19-helper, then reopen Aurora Forge.');
  const folder = fs.mkdtempSync(path.join(app.getPath('temp'), 'aurora-pac19-'));
  const requestPath = path.join(folder, 'request.json');
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  return new Promise((resolve, reject) => {
    cp.execFile(helper, [requestPath], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      fs.rmSync(folder, { recursive: true, force: true });
      if (error) return reject(new Error(String(stderr || stdout || error.message).trim()));
      try { resolve(JSON.parse(String(stdout || '').trim())); }
      catch (parseError) { reject(new Error(`The PAC helper returned an unreadable response: ${parseError.message}`)); }
    });
  });
}

function readToolConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(toolConfigPath(), 'utf8'));
    const clean = {};
    Object.keys(TOOL_DEFINITIONS).forEach((id) => {
      if (raw && typeof raw[id] === 'string' && raw[id].trim()) clean[id] = raw[id].trim();
    });
    return clean;
  } catch (_error) {
    return {};
  }
}

function writeToolConfig(config) {
  const clean = {};
  Object.keys(TOOL_DEFINITIONS).forEach((id) => {
    if (config && typeof config[id] === 'string' && config[id].trim()) clean[id] = config[id].trim();
  });
  ensureDir(path.dirname(toolConfigPath()));
  fs.writeFileSync(toolConfigPath(), JSON.stringify(clean, null, 2) + '\n', 'utf8');
  return clean;
}

function assertKnownToolId(id) {
  if (!Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, id)) {
    throw new Error('Unknown external tool identifier.');
  }
}

function toolConfigForRenderer() {
  const config = readToolConfig();
  const result = {};
  Object.keys(TOOL_DEFINITIONS).forEach((id) => {
    const configuredPath = config[id] || '';
    result[id] = {
      id,
      label: TOOL_DEFINITIONS[id].label,
      kind: TOOL_DEFINITIONS[id].kind,
      path: configuredPath,
      exists: Boolean(configuredPath && fs.existsSync(configuredPath))
    };
  });
  return result;
}

function findCaseInsensitiveEntry(directory, matcher) {
  if (!directory || !fs.existsSync(directory)) return '';
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const match = entries.find(matcher);
  return match ? path.join(directory, match.name) : '';
}

function findOnPath(executableName) {
  try {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    const result = cp.spawnSync(locator, [executableName], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) return '';
    const first = String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
    return first && fs.existsSync(first) ? path.resolve(first) : '';
  } catch (_error) {
    return '';
  }
}

function resolveTexconvPath() {
  if (process.platform !== 'win32') return { path: '', source: '', reason: 'DirectXTex texconv is Windows-only. Prompt building, projects, exports, reference tools, and CAK catalog browsing remain available on Linux.' };
  const configured = readToolConfig().texconv || '';
  if (configured && fs.existsSync(configured) && fs.statSync(configured).isFile()) {
    return { path: configured, source: 'Setup' };
  }
  const bundled = bundledToolPath('texconv', 'texconv.exe');
  if (fs.existsSync(bundled) && fs.statSync(bundled).isFile()) {
    return { path: bundled, source: 'Included Microsoft DirectXTex converter' };
  }
  const discovered = findOnPath('texconv.exe') || findOnPath('texconv');
  return discovered ? { path: discovered, source: 'Windows PATH' } : { path: '', source: '' };
}

function readFourCC(buffer, offset) {
  return buffer.toString('ascii', offset, offset + 4).replace(/\0/g, '').trim();
}

function inspectDdsFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 128 || buffer.toString('ascii', 0, 4) !== 'DDS ') throw new Error('Not a valid DDS file: ' + path.basename(filePath));
  const height = buffer.readUInt32LE(12);
  const width = buffer.readUInt32LE(16);
  const mipmaps = Math.max(1, buffer.readUInt32LE(28) || 1);
  const fourCC = readFourCC(buffer, 84);
  let dxgiFormat = null;
  let format = FOURCC_TO_FORMAT[fourCC] || '';
  let certainty = format ? 'legacy-inferred' : 'unknown';
  if (fourCC === 'DX10') {
    if (buffer.length < 148) throw new Error('DDS DX10 header is incomplete: ' + path.basename(filePath));
    dxgiFormat = buffer.readUInt32LE(128);
    format = DXGI_TO_FORMAT[dxgiFormat] || '';
    certainty = format ? 'exact' : 'unknown';
  }
  return { path: filePath, name: path.basename(filePath), width, height, mipmaps, fourCC: fourCC || 'none', dxgiFormat, format, certainty };
}

function inspectPngFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) throw new Error('Not a valid PNG file: ' + path.basename(filePath));
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function runNativeProcess(executable, args) {
  return new Promise((resolve, reject) => {
    const isCommandScript = /\.(cmd|bat)$/i.test(executable);
    const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
    const command = isCommandScript ? (process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe') : executable;
    const processArgs = isCommandScript ? ['/d', '/s', '/c', [quote(executable), ...args.map(quote)].join(' ')] : args;
    const child = cp.spawn(command, processArgs, { windowsHide: true, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function assertExistingFiles(paths, extension) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 250) throw new Error('Choose between 1 and 250 input files.');
  return paths.map((candidate) => {
    const resolved = path.resolve(String(candidate || ''));
    if (path.extname(resolved).toLowerCase() !== extension) throw new Error('Unexpected input type: ' + path.basename(resolved));
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error('Input file was not found: ' + path.basename(resolved));
    return resolved;
  });
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function uniquePath(baseDir, baseName) {
  let candidate = path.join(baseDir, baseName);
  if (!fs.existsSync(candidate)) return candidate;
  for (let i = 2; i < 1000; i += 1) {
    candidate = path.join(baseDir, `${baseName} ${i}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not create a unique project folder name.');
}

function defaultReferenceModelsPath() {
  return path.join(app.getPath('documents'), 'Aurora Forge Reference Models');
}

function safeInsideAllowedRoots(filePath) {
  const allowedRoots = [defaultProjectsPath(), app.getPath('documents'), app.getPath('desktop')];
  return allowedRoots.some((rootPath) => isPathInside(filePath, rootPath));
}

function assertProjectJsonShape(project) {
  if (!project || typeof project !== 'object') throw new Error('Project JSON must be an object.');
  const candidate = project.project || project;
  if (!candidate || typeof candidate !== 'object') throw new Error('Project JSON missing project object.');
  if (!candidate.name && !project.name) throw new Error('Project JSON missing project name.');
  return true;
}

function registerAppProtocol() {
  protocol.handle('wwe2k26', async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname || '/index.html');
    if (pathname === '/' || pathname === '') pathname = '/index.html';
    if (url.hostname && url.hostname !== 'app') pathname = '/' + url.hostname + pathname;
    const filePath = path.normalize(path.join(APP_ROOT, pathname));
    if (!isPathInside(filePath, APP_ROOT)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!fs.existsSync(filePath)) {
      return new Response('Not found: ' + pathname, { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: WINDOW_TITLE,
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 720,
    icon: path.join(APP_ROOT, 'assets', 'img', 'app-icon.ico'),
    backgroundColor: '#11131a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadURL(`wwe2k26://app/${START_PAGE}`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('wwe2k26://')) {
      event.preventDefault();
      if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    }
  });

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Home', click: () => mainWindow.loadURL('wwe2k26://app/index.html') },
        { label: 'Projects', click: () => mainWindow.loadURL('wwe2k26://app/project-manager.html') },
        { label: 'Prompt Builders', click: () => mainWindow.loadURL('wwe2k26://app/creative-studios.html') },
        { label: 'Tools', click: () => mainWindow.loadURL('wwe2k26://app/tools.html') },
        { label: 'Tutorials', click: () => mainWindow.loadURL('wwe2k26://app/tutorials.html') },
        { label: 'Setup', click: () => mainWindow.loadURL('wwe2k26://app/setup.html') },
        { label: 'About', click: () => mainWindow.loadURL('wwe2k26://app/about.html') },
        { type: 'separator' },
        { label: 'Open Default Projects Folder', click: () => { ensureDir(defaultProjectsPath()); shell.openPath(defaultProjectsPath()); } },
        { label: 'Open Default Exports Folder', click: () => { ensureDir(defaultExportsPath()); shell.openPath(defaultExportsPath()); } },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
    {
      label: 'Help',
      submenu: [
        { label: 'Tutorials', click: () => mainWindow.loadURL('wwe2k26://app/tutorials.html') },
        { type: 'separator' },
        { label: 'About', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: 'About Aurora Forge', message: 'Aurora Forge', detail: 'Version 1.7.5 · Prompt Builder Edition\nA WWE 2K26 prompt-building and workflow-preparation workspace. Aurora Forge prepares prompts and handoff packs; your chosen AI creates the result.' }) }
      ]
    }
  ];
  Menu.setApplicationMenu(STANDALONE_TOOL ? null : Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  ensureDir(defaultProjectsPath());
  ensureDir(defaultExportsPath());
  registerAppProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('desktop:get-app-info', async () => ({
  name: app.getName(),
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  platform: process.platform,
  userDataPath: app.getPath('userData'),
  defaultProjectsPath: defaultProjectsPath(),
  defaultExportsPath: defaultExportsPath()
}));

ipcMain.handle('desktop:choose-project-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose Aurora Forge project folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  return { ok: true, path: result.filePaths[0] };
});

ipcMain.handle('desktop:open-default-projects-folder', async () => {
  ensureDir(defaultProjectsPath());
  const error = await shell.openPath(defaultProjectsPath());
  return { ok: !error, error };
});

ipcMain.handle('desktop:open-default-exports-folder', async () => {
  ensureDir(defaultExportsPath());
  const error = await shell.openPath(defaultExportsPath());
  return { ok: !error, error };
});

ipcMain.handle('desktop:get-tool-config', async () => toolConfigForRenderer());

ipcMain.handle('desktop:choose-tool-path', async (_event, toolId) => {
  assertKnownToolId(toolId);
  const definition = TOOL_DEFINITIONS[toolId];
  const result = await dialog.showOpenDialog({
    title: 'Choose ' + definition.label,
    properties: definition.kind === 'directory' ? ['openDirectory', 'createDirectory'] : ['openFile'],
    filters: definition.kind === 'file'
      ? [{ name: 'Applications', extensions: ['exe', 'cmd', 'bat'] }, { name: 'All files', extensions: ['*'] }]
      : undefined
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const selectedPath = path.resolve(result.filePaths[0]);
  if (!fs.existsSync(selectedPath)) throw new Error('Selected path does not exist.');
  const stat = fs.statSync(selectedPath);
  if (definition.kind === 'directory' && !stat.isDirectory()) throw new Error('A folder is required for this entry.');
  if (definition.kind === 'file' && !stat.isFile()) throw new Error('An executable file is required for this entry.');
  const config = readToolConfig();
  config[toolId] = selectedPath;
  writeToolConfig(config);
  return { ok: true, tool: toolConfigForRenderer()[toolId] };
});

ipcMain.handle('desktop:clear-tool-path', async (_event, toolId) => {
  assertKnownToolId(toolId);
  const config = readToolConfig();
  delete config[toolId];
  writeToolConfig(config);
  return { ok: true, tool: toolConfigForRenderer()[toolId] };
});

ipcMain.handle('desktop:open-configured-tool', async (_event, toolId) => {
  assertKnownToolId(toolId);
  const config = readToolConfig();
  const configuredPath = config[toolId];
  if (!configuredPath || !fs.existsSync(configuredPath)) throw new Error('Configure this tool or folder first.');
  const error = await shell.openPath(configuredPath);
  return { ok: !error, error };
});

ipcMain.handle('desktop:check-cakehook', async () => {
  const config = readToolConfig();
  const gameFolder = config.gameFolder || '';
  const folderExists = Boolean(gameFolder && fs.existsSync(gameFolder) && fs.statSync(gameFolder).isDirectory());
  if (!folderExists) {
    return {
      ok: false,
      gameFolder,
      checks: [],
      summary: 'Choose the WWE 2K26 game folder first.'
    };
  }
  const gameExe = findCaseInsensitiveEntry(gameFolder, (entry) => entry.isFile() && /^wwe2k26.*\.exe$/i.test(entry.name));
  const loaderDll = findCaseInsensitiveEntry(gameFolder, (entry) => entry.isFile() && /^dinput8\.dll$/i.test(entry.name));
  const pluginsFolder = findCaseInsensitiveEntry(gameFolder, (entry) => entry.isDirectory() && /^plugins$/i.test(entry.name));
  const checks = [
    { id: 'gameExe', label: 'WWE 2K26 executable', found: Boolean(gameExe), path: gameExe },
    { id: 'loaderDll', label: 'dinput8.dll loader', found: Boolean(loaderDll), path: loaderDll },
    { id: 'pluginsFolder', label: 'Plugins folder', found: Boolean(pluginsFolder), path: pluginsFolder }
  ];
  const foundCount = checks.filter((item) => item.found).length;
  return {
    ok: foundCount === checks.length,
    gameFolder,
    checks,
    summary: foundCount + ' of ' + checks.length + ' expected CakeHook/game entries detected.'
  };
});

ipcMain.handle('desktop:dds-converter-status', async () => {
  const resolved = resolveTexconvPath();
  return { ready: Boolean(resolved.path), path: resolved.path, source: resolved.source, reason: resolved.reason || '' };
});

ipcMain.handle('desktop:cak-explorer-status', async () => {
  const config = readToolConfig();
  const gameFolder = config.gameFolder || '';
  const helper = cakHelperPath();
  const oodle = resolveOodlePath();
  let archives = [];
  if (gameFolder && fs.existsSync(gameFolder) && fs.statSync(gameFolder).isDirectory()) {
    archives = fs.readdirSync(gameFolder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.cak$/i.test(entry.name))
      .map((entry) => ({ name: entry.name, path: path.join(gameFolder, entry.name), bytes: fs.statSync(path.join(gameFolder, entry.name)).size }))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  }
  return { ready: process.platform === 'win32' && fs.existsSync(helper), extractionSupported: process.platform === 'win32', platform: process.platform, gameFolder, oodle, archives, dictionaryEntries: Object.keys(readCakDictionary()).length };
});

ipcMain.handle('desktop:cak-explorer-choose-archive', async () => {
  const config = readToolConfig();
  const result = await dialog.showOpenDialog({
    title: 'Choose a WWE 2K26 CAK archive',
    defaultPath: config.gameFolder || undefined,
    properties: ['openFile'],
    filters: [{ name: 'WWE 2K archives', extensions: ['cak'] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  return { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:cak-explorer-open', async (_event, archivePath) => {
  const selected = path.resolve(String(archivePath || ''));
  const siblingArchives = fs.readdirSync(path.dirname(selected), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^bakedfile\d+\.cak$/i.test(entry.name))
    .map((entry) => path.join(path.dirname(selected), entry.name));
  const dictionary = { ...readCakDictionary(), ...cakReader.buildNativeDictionary(siblingArchives) };
  currentCakSession = cakReader.openArchive(selected, dictionary);
  return { ok: true, summary: cakReader.publicSummary(currentCakSession), results: cakReader.searchFiles(currentCakSession, { scope: 'resolved' }) };
});

ipcMain.handle('desktop:cak-explorer-open-all', async () => {
  const gameFolder = readToolConfig().gameFolder || '';
  if (!gameFolder || !fs.existsSync(gameFolder) || !fs.statSync(gameFolder).isDirectory()) throw new Error('Choose the WWE 2K26 game folder at the top of the extractor first.');
  const archivePaths = fs.readdirSync(gameFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^bakedfile\d+\.cak$/i.test(entry.name))
    .map((entry) => path.join(gameFolder, entry.name))
    .sort((left, right) => path.basename(left).localeCompare(path.basename(right), undefined, { numeric: true }));
  if (!archivePaths.length) throw new Error('No .cak archives were found in the configured WWE 2K26 game folder.');
  const dictionary = { ...readCakDictionary(), ...cakReader.buildNativeDictionary(archivePaths) };
  const sessions = [];
  const rejectedArchives = [];
  for (const archivePath of archivePaths) {
    try { sessions.push(cakReader.openArchive(archivePath, dictionary)); }
    catch (error) { rejectedArchives.push({ archive: path.basename(archivePath), error: error.message }); }
  }
  if (!sessions.length) throw new Error('Every CAK archive was rejected by the safety checks. No archive was opened.');
  const files = [];
  const folders = [];
  for (const session of sessions) {
    const folderOffset = folders.length;
    folders.push(...session.folders.map((folder) => ({ ...folder, archiveName: session.archiveName })));
    for (const file of session.files) files.push({
      ...file,
      id: files.length,
      sourceId: file.id,
      sourceArchivePath: session.archivePath,
      sourceArchiveName: session.archiveName,
      sourceArchiveKey: session.key,
      folderIndex: folderOffset + file.folderIndex
    });
  }
  currentCakSession = {
    archiveName: `All ${sessions.length} game archives`,
    archivePath: gameFolder,
    archiveSize: sessions.reduce((sum, session) => sum + session.archiveSize, 0),
    files,
    folders,
    sessions,
    keyRecovered: sessions.some((session) => session.keyRecovered),
    warnings: [
      ...sessions.flatMap((session) => session.warnings.map((warning) => `${session.archiveName}: ${warning}`)),
      ...rejectedArchives.map((item) => `${item.archive}: rejected safely — ${item.error}`)
    ]
  };
  return { ok: true, archiveCount: sessions.length, rejectedArchives, summary: cakReader.publicSummary(currentCakSession), results: cakReader.searchFiles(currentCakSession, { scope: 'all' }) };
});

ipcMain.handle('desktop:cak-explorer-search', async (_event, options) => {
  if (!currentCakSession) throw new Error('Open a CAK archive first.');
  return cakReader.searchFiles(currentCakSession, options || {});
});

ipcMain.handle('desktop:cak-explorer-choose-output', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose a separate extraction folder', properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const selected = path.resolve(result.filePaths[0]);
  const gameFolder = readToolConfig().gameFolder || '';
  if (gameFolder && (selected.toLowerCase() === path.resolve(gameFolder).toLowerCase() || selected.toLowerCase().startsWith(path.resolve(gameFolder).toLowerCase() + path.sep))) {
    throw new Error('Choose an extraction folder outside the WWE 2K26 game folder.');
  }
  return { ok: true, path: selected };
});

ipcMain.handle('desktop:cak-explorer-extract', async (event, payload) => {
  if (process.platform !== 'win32') throw new Error('Native CAK extraction is currently Windows-only because WWE 2K26 supplies a Windows Oodle library. Linux can still browse and search the archive catalog safely.');
  if (!currentCakSession) throw new Error('Open a CAK archive first.');
  const ids = [...new Set(payload && payload.all ? currentCakSession.files.filter((file) => file && file.extractable !== false).map((file) => Number(file.id)) : (Array.isArray(payload && payload.ids) ? payload.ids.map(Number) : []))];
  if (!ids.length || (!(payload && payload.all) && ids.length > 5000)) throw new Error('Choose between 1 and 5,000 files per extraction job.');
  const outputRoot = path.resolve(String(payload && payload.outputRoot || ''));
  if (!fs.existsSync(outputRoot) || !fs.statSync(outputRoot).isDirectory()) throw new Error('Choose a valid extraction folder.');
  const config = readToolConfig();
  if (config.gameFolder && (outputRoot.toLowerCase() === path.resolve(config.gameFolder).toLowerCase() || outputRoot.toLowerCase().startsWith(path.resolve(config.gameFolder).toLowerCase() + path.sep))) throw new Error('Extraction into the game folder is blocked.');
  const files = ids.map((id) => currentCakSession.files[id]).filter(Boolean);
  if (files.length !== ids.length) throw new Error('One or more selected entries no longer exist. Reopen the archive.');
  if (files.some((file) => !file.extractable)) throw new Error('One or more selected catalog entries store their payload in another archive and cannot be extracted from this CAK alone.');
  const unresolvedPayloads = files.filter((file) => !file.nameResolved);
  if (payload && payload.all && unresolvedPayloads.length) throw new Error(`Extract All requires 100% real-name coverage. ${unresolvedPayloads.length.toLocaleString()} stored payload(s) still lack their genuine virtual paths, so nothing was extracted.`);
  const totalBytes = files.reduce((sum, file) => sum + file.expandedSize, 0);
  if (!(payload && payload.all) && totalBytes > 20 * 1024 * 1024 * 1024) throw new Error('This extraction job is larger than 20 GB. Choose a smaller group.');
  if (typeof fs.statfsSync === 'function') {
    const storage = fs.statfsSync(outputRoot);
    const freeBytes = Number(storage.bavail) * Number(storage.bsize);
    if (freeBytes < totalBytes + 64 * 1024 * 1024) throw new Error('The output drive does not have enough free space for this extraction job.');
  }
  const oodlePath = resolveOodlePath(files[0].sourceArchivePath || currentCakSession.archivePath);
  if (files.some((file) => file.compressed) && !oodlePath) throw new Error('oo2core_9_win64.dll was not found. Choose the WWE 2K26 game folder at the top of the extractor.');
  const helper = cakHelperPath();
  if (!fs.existsSync(helper)) throw new Error('The included Aurora Forge extraction helper is missing.');
  const groups = new Map();
  for (const file of files) {
    const archivePath = file.sourceArchivePath || currentCakSession.archivePath;
    if (!groups.has(archivePath)) groups.set(archivePath, []);
    groups.get(archivePath).push(file);
  }
  const results = [];
  const archiveGroups = [...groups.entries()];
  const sendProgress = (details) => { if (!event.sender.isDestroyed()) event.sender.send('desktop:cak-extraction-progress', details); };
  sendProgress({ phase: 'extracting', processed: 0, total: files.length, succeeded: 0, failed: 0, archiveIndex: 0, archiveCount: archiveGroups.length, archive: '' });
  for (const [groupIndex, [archivePath, archiveFiles]] of archiveGroups.entries()) {
    for (let start = 0; start < archiveFiles.length; start += 500) {
      const batch = archiveFiles.slice(start, start + 500);
      const request = {
        archivePath,
        oodlePath: resolveOodlePath(archivePath),
        outputRoot,
        archiveKey: batch[0].sourceArchiveKey === undefined ? currentCakSession.key : batch[0].sourceArchiveKey,
        overwrite: Boolean(payload && payload.overwrite),
        entries: batch.map((file) => ({ id: file.sourceId === undefined ? file.id : file.sourceId, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks }))
      };
      const requestPath = path.join(app.getPath('temp'), `aurora-cak-${process.pid}-${Date.now()}-${results.length}.json`);
      fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
      try {
        const run = await runNativeProcess(helper, [requestPath]);
        let parsed;
        try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (_error) { throw new Error((run.stderr || run.stdout || 'The extraction helper returned no readable report.').trim()); }
        results.push(...(parsed.results || []).map((item) => ({ ok: Boolean(item.Ok), id: item.Id, archive: path.basename(archivePath), path: item.Path || '', bytes: item.Bytes || 0, error: item.Error || '' })));
      } finally { try { fs.unlinkSync(requestPath); } catch (_error) {} }
      sendProgress({ phase: 'extracting', processed: Math.min(results.length, files.length), total: files.length, succeeded: results.filter((item) => item.ok).length, failed: results.filter((item) => !item.ok).length, archiveIndex: groupIndex + 1, archiveCount: archiveGroups.length, archive: path.basename(archivePath) });
    }
  }
    const succeeded = results.filter((item) => item.ok).length;
    lastCakOutputDir = outputRoot;
    const report = [
      '**Readability note:** I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.', '',
      'Aurora Forge CAK Extraction Report', '',
      'Archive source: ' + currentCakSession.archivePath,
      'Output: ' + outputRoot,
      `Requested: ${files.length}`, `Succeeded: ${succeeded}`, `Failed: ${results.length - succeeded}`, '',
      ...results.map((item) => item.ok ? `OK  ${item.archive || currentCakSession.archiveName}  ${item.id}  ${item.bytes} bytes  ${item.path}` : `FAILED  ${item.archive || currentCakSession.archiveName}  ${item.id}  ${item.error}`)
    ].join('\n');
    const reportPath = path.join(outputRoot, 'Aurora_Forge_Extraction_Report.txt');
    if (fs.existsSync(reportPath)) fs.appendFileSync(reportPath, '\n' + report.split('\n').slice(2).join('\n') + '\n', 'utf8');
    else fs.writeFileSync(reportPath, report + '\n', 'utf8');
    const successfulKeys = new Set(results.filter((item) => item.ok).map((item) => `${String(item.archive || '').toLowerCase()}::${Number(item.id)}`));
    const newManifestEntries = files.filter((file) => successfulKeys.has(`${path.basename(file.sourceArchivePath || currentCakSession.archivePath).toLowerCase()}::${Number(file.sourceId === undefined ? file.id : file.sourceId)}`)).map((file) => {
      const folder = currentCakSession.folders[file.folderIndex];
      return { relativePath: file.name, fileHash: file.hash, folderIndex: file.folderIndex, folderHash: folder && folder.hash || '', type: file.type, nameResolved: Boolean(file.nameResolved), sourceArchive: path.basename(file.sourceArchivePath || currentCakSession.archivePath) };
    });
    const extractionManifest = {
      readabilityNote: 'I ran this document through an “explain like I am five” chatbot to improve readability, explainability, and usability. The chatbot helped present the material; it did not originate Aurora Forge, DataCtrlLink, their functionality, or the underlying development work.',
      schema: 'aurora-forge-cak-extraction-manifest/v1',
      purpose: 'Preserves original CAK file and folder hashes while presenting usable extracted names. Later archives win same-path collisions.',
      entries: newManifestEntries
    };
    const extractionManifestPath = path.join(outputRoot, '.aurora-cak-manifest.json');
    if (fs.existsSync(extractionManifestPath)) {
      const existing = JSON.parse(fs.readFileSync(extractionManifestPath, 'utf8'));
      if (existing.schema !== extractionManifest.schema || !Array.isArray(existing.entries)) throw new Error('The existing Aurora CAK extraction manifest is malformed or unsupported.');
      const merged = new Map(existing.entries.map((entry) => [String(entry.relativePath || '').toLowerCase(), entry]));
      for (const entry of newManifestEntries) merged.set(entry.relativePath.toLowerCase(), entry);
      extractionManifest.entries = [...merged.values()];
    }
    fs.writeFileSync(extractionManifestPath, JSON.stringify(extractionManifest, null, 2) + '\n', 'utf8');
    sendProgress({ phase: 'complete', processed: results.length, total: files.length, succeeded, failed: results.length - succeeded, archiveIndex: archiveGroups.length, archiveCount: archiveGroups.length, archive: '' });
    return { ok: succeeded === results.length, succeeded, failed: results.length - succeeded, total: results.length, outputRoot, results };
});

ipcMain.handle('desktop:cak-explorer-open-output', async () => {
  if (!lastCakOutputDir || !fs.existsSync(lastCakOutputDir)) throw new Error('No extraction output folder is available yet.');
  const error = await shell.openPath(lastCakOutputDir);
  return { ok: !error, error };
});

ipcMain.handle('desktop:pac19-status', async () => {
  const gameFolder = pac19GameFolder();
  const helper = pac19HelperPath();
  const oodle = pac19OodlePath();
  const executable = gameFolder ? path.join(gameFolder, 'WWE2K19_x64.exe') : '';
  const ready = Boolean(gameFolder && fs.existsSync(executable) && oodle && fs.existsSync(helper));
  return {
    ready, gameFolder, oodle, helperReady: fs.existsSync(helper),
    message: ready
      ? 'WWE 2K19, its Oodle library, and the Aurora Forge PAC helper are ready.'
      : !fs.existsSync(helper)
        ? 'The PAC helper source is present but its executable still needs to be compiled.'
        : !gameFolder ? 'Choose your WWE 2K19 installation folder.' : 'The selected folder must contain WWE2K19_x64.exe and oo2core_6_win64.dll.'
  };
});

ipcMain.handle('desktop:pac19-choose-game-folder', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the WWE 2K19 game folder', defaultPath: pac19GameFolder() || undefined, properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const selected = path.resolve(result.filePaths[0]);
  if (!fs.existsSync(path.join(selected, 'WWE2K19_x64.exe')) || !fs.existsSync(path.join(selected, 'oo2core_6_win64.dll'))) throw new Error('Choose the folder containing WWE2K19_x64.exe and oo2core_6_win64.dll.');
  const config = readToolConfig();
  config.game19Folder = selected;
  writeToolConfig(config);
  return { ok: true, path: selected };
});

ipcMain.handle('desktop:pac19-choose-archive', async () => {
  const gameFolder = pac19GameFolder();
  const result = await dialog.showOpenDialog({
    title: 'Choose a WWE 2K19 PAC', defaultPath: gameFolder ? path.join(gameFolder, 'pac') : undefined, properties: ['openFile'],
    filters: [{ name: 'WWE PAC archives', extensions: ['pac'] }, { name: 'All files', extensions: ['*'] }]
  });
  return result.canceled || !result.filePaths[0] ? { ok: false } : { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:pac19-open', async (_event, archivePath) => {
  const selected = path.resolve(String(archivePath || ''));
  const response = await runPac19Helper({ action: 'inspect', archivePath: selected });
  currentPac19Archive = selected;
  return response;
});

ipcMain.handle('desktop:pac19-choose-output', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose a separate extraction folder', defaultPath: lastPac19OutputDir || app.getPath('documents'), properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  lastPac19OutputDir = path.resolve(result.filePaths[0]);
  return { ok: true, path: lastPac19OutputDir };
});

ipcMain.handle('desktop:pac19-extract', async (_event, payload) => {
  if (!currentPac19Archive) throw new Error('Open a PAC before extracting files.');
  const outputRoot = path.resolve(String(payload?.outputRoot || ''));
  const response = await runPac19Helper({ action: 'extract', archivePath: currentPac19Archive, oodlePath: pac19OodlePath(currentPac19Archive), outputRoot, entryIds: payload?.entryIds || [], overwrite: Boolean(payload?.overwrite) });
  lastPac19OutputDir = outputRoot;
  return response;
});

ipcMain.handle('desktop:pac19-open-output', async () => {
  if (!lastPac19OutputDir || !fs.existsSync(lastPac19OutputDir)) throw new Error('No PAC output folder is available yet.');
  const error = await shell.openPath(lastPac19OutputDir);
  if (error) throw new Error(error);
  return { ok: true };
});

ipcMain.handle('desktop:pac19-choose-replacement', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the edited replacement file', properties: ['openFile'], filters: [{ name: 'All files', extensions: ['*'] }] });
  return result.canceled || !result.filePaths[0] ? { ok: false } : { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:pac19-replace', async (_event, payload) => {
  if (!currentPac19Archive) throw new Error('Open a PAC before building a replacement.');
  const parsed = path.parse(currentPac19Archive);
  const result = await dialog.showSaveDialog({ title: 'Save the rebuilt PAC as a new file', defaultPath: path.join(parsed.dir, `${parsed.name}_aurora${parsed.ext || '.pac'}`), filters: [{ name: 'WWE PAC archives', extensions: ['pac'] }] });
  if (result.canceled || !result.filePath) return { ok: false };
  const outputPath = result.filePath.toLowerCase().endsWith('.pac') ? result.filePath : result.filePath + '.pac';
  const response = await runPac19Helper({ action: 'replace', archivePath: currentPac19Archive, oodlePath: pac19OodlePath(currentPac19Archive), entryId: payload?.entryId, replacementPath: payload?.replacementPath, outputPath });
  lastPac19OutputDir = path.dirname(outputPath);
  return response;
});

ipcMain.handle('desktop:pac19-analyze-motion', async () => {
  const selected = await dialog.showOpenDialog({
    title: 'Choose a folder containing decoded WWE 2K19 motion files',
    defaultPath: lastPac19OutputDir || app.getPath('documents'),
    properties: ['openDirectory']
  });
  if (selected.canceled || !selected.filePaths[0]) return { ok: false };
  const inputPath = path.resolve(selected.filePaths[0]);
  const report = motion19Analyzer.analyzeTarget(inputPath);
  const destination = await dialog.showSaveDialog({
    title: 'Save the read-only motion analysis report',
    defaultPath: path.join(inputPath, 'Aurora_Forge_WWE2K19_Motion_Analysis.json'),
    filters: [{ name: 'JSON report', extensions: ['json'] }]
  });
  if (destination.canceled || !destination.filePath) return { ok: false };
  const outputPath = destination.filePath.toLowerCase().endsWith('.json') ? destination.filePath : destination.filePath + '.json';
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return { ok: true, outputPath, accepted: report.accepted, rejected: report.rejected };
});

ipcMain.handle('desktop:cak20-status', async () => {
  const gameFolder = cak20GameFolder();
  const executable = gameFolder ? path.join(gameFolder, 'WWE2K20_x64.exe') : '';
  const oodle = cak20OodlePath();
  const archives = cak20ArchiveSummary();
  const installReady = Boolean(gameFolder && fs.existsSync(executable) && oodle && archives.length);
  return {
    ready: installReady,
    engineReady: installReady,
    rebuildReady: false,
    gameFolder,
    executable: fs.existsSync(executable) ? executable : '',
    oodle,
    archives,
    message: installReady
      ? 'WWE 2K20 is detected. Load the decoded CAK file list, choose an output folder, and extract verified file families.'
      : !gameFolder
        ? 'Choose your WWE 2K20 installation folder.'
        : 'The selected folder must contain WWE2K20_x64.exe, oo2core_7_win64.dll, and bakedfile*.cak archives.'
  };
});

ipcMain.handle('desktop:cak20-list-files', async (_event, options) => {
  const query = String(options && options.query || '').trim().toLowerCase();
  const archiveFilter = String(options && options.archiveName || '').trim().toLowerCase();
  const sessions = openCak20Sessions();
  const items = [];
  let totalDecoded = 0;
  let totalMatches = 0;
  let extractableMatches = 0;
  for (const session of sessions) {
    totalDecoded += session.files.length;
    if (archiveFilter && session.archiveName.toLowerCase() !== archiveFilter) continue;
    for (const file of session.files) {
      const summary = cak20FileSummary(session, file);
      if (query && !summary.name.toLowerCase().includes(query) && !summary.type.toLowerCase().includes(query)) continue;
      totalMatches += 1;
      if (summary.extractable) extractableMatches += 1;
      if (items.length < 500) items.push(summary);
    }
  }
  return {
    ok: true,
    archives: sessions.map((session) => cak20Reader.publicSummary(session)),
    items,
    totalDecoded,
    totalMatches,
    extractableMatches,
    totalShown: items.length,
    truncated: totalMatches > items.length
  };
});

ipcMain.handle('desktop:cak20-choose-output', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose a separate WWE 2K20 extraction folder', properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const selected = path.resolve(result.filePaths[0]);
  const gameFolder = cak20GameFolder();
  if (gameFolder && isPathInside(selected, gameFolder)) throw new Error('Choose an extraction folder outside the WWE 2K20 game folder.');
  lastCak20OutputDir = selected;
  return { ok: true, path: selected };
});

ipcMain.handle('desktop:cak20-extract', async (_event, payload) => {
  const outputRoot = path.resolve(String(payload && payload.outputRoot || lastCak20OutputDir || ''));
  if (!outputRoot || !fs.existsSync(outputRoot) || !fs.statSync(outputRoot).isDirectory()) throw new Error('Choose a valid extraction folder.');
  const gameFolder = cak20GameFolder();
  if (gameFolder && isPathInside(outputRoot, gameFolder)) throw new Error('Extraction into the WWE 2K20 game folder is blocked.');
  const extractAll = Boolean(payload && payload.all);
  const selected = Array.isArray(payload && payload.entries) ? payload.entries : [];
  if (!extractAll && (!selected.length || selected.length > 5000)) throw new Error('Choose between 1 and 5,000 files per extraction job.');
  const wanted = extractAll ? null : new Map(selected.map((entry) => [`${String(entry.archiveName || '').toLowerCase()}::${Number(entry.id)}`, entry]));
  const sessions = openCak20Sessions();
  const results = [];
  let requested = extractAll ? 0 : selected.length;
  let totalBytes = 0;
  for (const session of sessions) {
    for (const file of session.files) {
      const key = `${session.archiveName.toLowerCase()}::${file.id}`;
      if (wanted && !wanted.has(key)) continue;
      const expected = cak20Reader.expectedFirstWord(file);
      if (extractAll && (!file.extractable || !expected)) continue;
      if (extractAll) requested += 1;
      if (!file.extractable || !expected) {
        results.push({ ok: false, archive: session.archiveName, id: file.id, error: 'This entry needs one more decode rule before extraction.' });
        continue;
      }
      totalBytes += file.storedSize;
      const relative = safeCak20RelativePath(file);
      const targetPath = path.resolve(outputRoot, relative);
      if (!isPathInside(targetPath, outputRoot)) throw new Error('A selected file tried to write outside the output folder.');
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      if (fs.existsSync(targetPath) && !(payload && payload.overwrite)) {
        results.push({ ok: false, archive: session.archiveName, id: file.id, path: targetPath, error: 'File already exists. Enable overwrite or choose another folder.' });
        continue;
      }
      const data = cak20Reader.extractFile(session, file);
      fs.writeFileSync(targetPath, data);
      results.push({ ok: true, archive: session.archiveName, id: file.id, path: targetPath, bytes: data.length, rule: file.decodeSeedSource || '' });
    }
  }
  if (extractAll && requested < 1) throw new Error('No verified WWE 2K20 files are available to extract yet.');
  const missing = requested - results.length;
  for (let index = 0; index < missing; index += 1) results.push({ ok: false, error: 'One selected entry was not found. Refresh the list and try again.' });
  const succeeded = results.filter((item) => item.ok).length;
  lastCak20OutputDir = outputRoot;
  const report = [
    'Aurora Forge WWE 2K20 CAK Extraction Report', '',
    'Game folder: ' + gameFolder,
    'Output: ' + outputRoot,
    `Requested: ${requested}`, `Succeeded: ${succeeded}`, `Failed: ${results.length - succeeded}`, '',
    ...results.map((item) => item.ok ? `OK  ${item.archive}  ${item.id}  ${item.bytes} bytes  ${item.path}` : `FAILED  ${item.archive || ''}  ${item.id || ''}  ${item.error}`)
  ].join('\n');
  fs.writeFileSync(path.join(outputRoot, 'Aurora_Forge_WWE2K20_Extraction_Report.txt'), report + '\n', 'utf8');
  return { ok: succeeded === results.length, succeeded, failed: results.length - succeeded, total: results.length, outputRoot, results };
});

ipcMain.handle('desktop:cak20-open-output', async () => {
  if (!lastCak20OutputDir || !fs.existsSync(lastCak20OutputDir)) throw new Error('No WWE 2K20 extraction output folder is available yet.');
  const error = await shell.openPath(lastCak20OutputDir);
  return { ok: !error, error };
});

ipcMain.handle('desktop:cak20-choose-game-folder', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the WWE 2K20 game folder', defaultPath: cak20GameFolder() || undefined, properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths[0]) return { ok: false };
  const selected = path.resolve(result.filePaths[0]);
  const exe = path.join(selected, 'WWE2K20_x64.exe');
  const oodle = path.join(selected, 'oo2core_7_win64.dll');
  const archives = fs.existsSync(selected) && fs.statSync(selected).isDirectory()
    ? fs.readdirSync(selected, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.cak$/i.test(entry.name))
    : [];
  if (!fs.existsSync(exe) || !fs.existsSync(oodle) || !archives.length) {
    throw new Error('Choose the folder containing WWE2K20_x64.exe, oo2core_7_win64.dll, and bakedfile*.cak archives.');
  }
  const config = readToolConfig();
  config.game20Folder = selected;
  writeToolConfig(config);
  return { ok: true, path: selected };
});

ipcMain.handle('desktop:repackager-choose-source', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the BakeMe folder to package', properties: ['openDirectory'] });
  return result.canceled || !result.filePaths.length ? { ok: false } : { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:repackager-build', async (_event, sourceRoot) => {
  const source = path.resolve(String(sourceRoot || ''));
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) throw new Error('Choose a readable BakeMe folder first.');
  const result = await dialog.showSaveDialog({ title: 'Save the new CAK archive', defaultPath: path.basename(source).replace(/^bakeme(?:_|-)?/i, '') || 'AuroraForge-Mod', filters: [{ name: 'WWE 2K26 CAK archive', extensions: ['cak'] }] });
  if (result.canceled || !result.filePath) return { ok: false };
  const built = archiveRepackager.buildCak(source, result.filePath.endsWith('.cak') ? result.filePath : result.filePath + '.cak', { oodlePath: resolveOodlePath(), helperPath: cakHelperPath() });
  lastBuiltCakPath = built.outputPath;
  lastBuiltCakSource = source;
  return { ok: true, ...built };
});

ipcMain.handle('desktop:repackager-verify', async () => {
  if (!lastBuiltCakPath || !fs.existsSync(lastBuiltCakPath)) throw new Error('Build a new CAK first.');
  if (!lastBuiltCakSource || !fs.existsSync(lastBuiltCakSource)) throw new Error('The BakeMe source folder is no longer available for byte-for-byte verification.');
  const expected = archiveRepackager.prepareScanPayloads(archiveRepackager.scanBakeFolder(lastBuiltCakSource), { oodlePath: resolveOodlePath(), helperPath: cakHelperPath() });
  return { ok: true, ...archiveRepackager.verifyCak(lastBuiltCakPath, expected), outputPath: lastBuiltCakPath };
});

ipcMain.handle('desktop:repackager-open-output', async () => {
  if (!lastBuiltCakPath || !fs.existsSync(lastBuiltCakPath)) throw new Error('Build a new CAK first.');
  const error = await shell.openPath(path.dirname(lastBuiltCakPath));
  return { ok: !error, error };
});

ipcMain.handle('desktop:dds-converter-choose-inputs', async (_event, mode) => {
  const normalizedMode = mode === 'png-to-dds' ? 'png-to-dds' : 'dds-to-png';
  const extension = normalizedMode === 'png-to-dds' ? 'png' : 'dds';
  const result = await dialog.showOpenDialog({
    title: normalizedMode === 'png-to-dds' ? 'Choose PNG files to convert' : 'Choose DDS files to convert',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: extension.toUpperCase() + ' textures', extensions: [extension] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const paths = assertExistingFiles(result.filePaths, '.' + extension);
  return { ok: true, paths, names: paths.map((item) => path.basename(item)) };
});

ipcMain.handle('desktop:dds-converter-choose-folder', async (_event, mode) => {
  const normalizedMode = mode === 'png-to-dds' ? 'png-to-dds' : 'dds-to-png';
  const extension = normalizedMode === 'png-to-dds' ? 'png' : 'dds';
  const result = await dialog.showOpenDialog({
    title: `Choose a folder containing ${extension.toUpperCase()} files`,
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const folder = path.resolve(result.filePaths[0]);
  const paths = fs.readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.' + extension)
    .map((entry) => path.join(folder, entry.name))
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  if (!paths.length) throw new Error(`No ${extension.toUpperCase()} files were found in that folder.`);
  return { ok: true, folder, paths, names: paths.map((item) => path.basename(item)) };
});

ipcMain.handle('desktop:dds-converter-choose-output', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose a separate output folder', properties: ['openDirectory', 'createDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  return { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:dds-converter-choose-reference-folder', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose folder containing original DDS textures', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  return { ok: true, path: path.resolve(result.filePaths[0]) };
});

ipcMain.handle('desktop:dds-converter-run', async (_event, payload) => {
  const resolvedTool = resolveTexconvPath();
  if (!resolvedTool.path) throw new Error('The included DirectXTex converter could not be found. You can select another texconv.exe in Setup.');
  const mode = payload && payload.mode === 'png-to-dds' ? 'png-to-dds' : 'dds-to-png';
  const inputExtension = mode === 'png-to-dds' ? '.png' : '.dds';
  const inputs = assertExistingFiles(payload && payload.inputPaths, inputExtension);
  const outputValue = String(payload && payload.outputDir || '').trim();
  if (!outputValue) throw new Error('Choose a separate output folder.');
  const outputDir = path.resolve(outputValue);
  if (!fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) throw new Error('Choose a valid output folder.');
  const duplicateNames = inputs.map((item) => path.basename(item).toLowerCase()).filter((name, index, all) => all.indexOf(name) !== index);
  if (duplicateNames.length) throw new Error('Selected files contain duplicate names from different folders. Convert each same-name group separately.');
  const overwrite = Boolean(payload && payload.overwrite);
  const referenceFolder = payload && payload.referenceFolder ? path.resolve(String(payload.referenceFolder)) : '';
  if (referenceFolder && (!fs.existsSync(referenceFolder) || !fs.statSync(referenceFolder).isDirectory())) throw new Error('The original DDS reference folder was not found.');
  if (referenceFolder && outputDir.toLowerCase() === referenceFolder.toLowerCase()) throw new Error('Choose an output folder that is separate from the original DDS reference folder.');
  const requestedFormat = String(payload && payload.manualFormat || '').toUpperCase();
  if (requestedFormat && !Object.prototype.hasOwnProperty.call(DDS_FORMATS, requestedFormat)) throw new Error('The selected DDS format is not allowed.');
  const mipMode = ['match', 'full', 'none'].includes(payload && payload.mipMode) ? payload.mipMode : 'match';
  const results = [];

  for (const inputPath of inputs) {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputExtension = mode === 'png-to-dds' ? '.dds' : '.png';
    const expectedOutput = path.join(outputDir, baseName + outputExtension);
    let reference = null;
    let format = '';
    let mipmaps = mipMode === 'none' ? 1 : 0;
    let note = '';
    try {
      if (fs.existsSync(expectedOutput) && !overwrite) throw new Error('Output already exists. Enable overwrite or choose another folder.');
      const args = ['-nologo'];
      if (overwrite) args.push('-y');
      if (mode === 'dds-to-png') {
        args.push('-ft', 'png', '-o', outputDir, inputPath);
      } else {
        const png = inspectPngFile(inputPath);
        if (referenceFolder) {
          const referencePath = path.join(referenceFolder, baseName + '.dds');
          if (fs.existsSync(referencePath)) {
            reference = inspectDdsFile(referencePath);
            if (path.resolve(expectedOutput).toLowerCase() === path.resolve(referencePath).toLowerCase()) {
              throw new Error('Output folder cannot overwrite the original DDS reference folder.');
            }
            if (png.width !== reference.width || png.height !== reference.height) {
              throw new Error(`PNG is ${png.width}x${png.height}; original DDS is ${reference.width}x${reference.height}. Resize or correct the PNG first.`);
            }
            format = reference.format;
            if (!format) throw new Error('Original DDS format is not recognized. Choose a manual format after checking the original.');
            if (mipMode === 'match') mipmaps = reference.mipmaps;
            if (reference.certainty === 'legacy-inferred') note = 'Legacy FourCC mapped to ' + format + '; verify color-space expectations.';
          }
        }
        if (!format) {
          format = requestedFormat;
          if (!format) throw new Error('No matching original DDS was found. Choose a manual output format.');
          if (mipMode === 'match') mipmaps = 0;
          note = referenceFolder ? 'No same-name original DDS found; manual format used.' : 'Manual format used.';
        }
        if (format.startsWith('BC') && (png.width % 4 !== 0 || png.height % 4 !== 0)) {
          throw new Error(`BC-compressed DDS textures require width and height divisible by 4. This PNG is ${png.width}x${png.height}.`);
        }
        args.push('-ft', 'dds', '-f', format, '-m', String(mipmaps), '-o', outputDir, inputPath);
      }
      const run = await runNativeProcess(resolvedTool.path, args);
      if (run.code !== 0) throw new Error((run.stderr || run.stdout || 'texconv returned an error.').trim());
      const created = fs.existsSync(expectedOutput);
      if (!created) throw new Error('texconv finished but the expected output file was not found.');
      results.push({ ok: true, input: inputPath, output: expectedOutput, format: format || 'PNG', mipmaps: mode === 'png-to-dds' ? mipmaps : null, reference, note });
    } catch (error) {
      results.push({ ok: false, input: inputPath, output: expectedOutput, format, mipmaps: mode === 'png-to-dds' ? mipmaps : null, reference, error: error.message, note });
    }
  }
  lastDdsConverterOutputDir = outputDir;
  const succeeded = results.filter((item) => item.ok).length;
  return { ok: succeeded === results.length, succeeded, failed: results.length - succeeded, total: results.length, tool: resolvedTool, outputDir, results };
});

ipcMain.handle('desktop:dds-converter-open-output', async () => {
  if (!lastDdsConverterOutputDir || !fs.existsSync(lastDdsConverterOutputDir)) throw new Error('No converter output folder is available yet.');
  const error = await shell.openPath(lastDdsConverterOutputDir);
  return { ok: !error, error };
});

ipcMain.handle('desktop:open-reference-models-folder', async () => {
  const modelRoot = defaultReferenceModelsPath();
  ensureDir(modelRoot);
  ensureDir(path.join(modelRoot, 'MCDS'));
  ensureDir(path.join(modelRoot, 'MTLS'));
  const readmePath = path.join(modelRoot, 'README.txt');
  if (!fs.existsSync(readmePath)) fs.writeFileSync(readmePath, [
    'Aurora Forge Reference Models',
    '',
    'Place downloaded reference-model folders in the matching locations:',
    '- MCD files and their character folders: MCDS/',
    '- MTLS reference files and folders: MTLS/',
    '',
    'Aurora Forge treats these as read-only reference points. Keep original downloads unchanged.'
  ].join('\n') + '\n', 'utf8');
  const error = await shell.openPath(modelRoot);
  return { ok: !error, path: modelRoot, error };
});

ipcMain.handle('desktop:save-text-file', async (_event, payload) => {
  const defaultName = sanitizeName(payload && payload.defaultName ? payload.defaultName : 'wwe2k26-note.txt');
  const result = await dialog.showSaveDialog({
    title: 'Save text file',
    defaultPath: path.join(defaultProjectsPath(), defaultName),
    filters: [{ name: 'Text files', extensions: ['txt'] }, { name: 'All files', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false };
  fs.writeFileSync(result.filePath, String(payload && payload.text ? payload.text : ''), 'utf8');
  return { ok: true, path: result.filePath };
});

ipcMain.handle('desktop:create-project-folder', async (_event, payload) => {
  const root = defaultProjectsPath();
  ensureDir(root);
  const projectName = sanitizeName(payload && payload.name ? payload.name : 'New Luchador Mask Project');
  const projectPath = uniquePath(root, projectName);
  ensureDir(projectPath);
  const projectType = payload && payload.type ? payload.type : 'lmask';
  const folders = projectType === 'complete_caw'
    ? ['00_Backups', '01_References', '02_Model', '03_Textures', '04_Attire', '05_Audio', '06_Profiles_JSON', '07_Ready_To_Bake', '08_Test_Builds', '09_Screenshots']
    : ['approved-images', 'profiles', 'prompts', 'handoff-packs', 'outputs', 'exports', 'notes'];
  folders.forEach((folder) => ensureDir(path.join(projectPath, folder)));
  const project = {
    app: 'Aurora Forge',
    release: '1.7.5 Prompt Builder Edition',
    name: projectName,
    type: projectType,
    notes: payload && payload.notes ? payload.notes : '',
    created_at: new Date().toISOString(),
    expected_lmask_outputs: ['mask_color.png', 'mask_mask1.png', 'mask_nrm.png']
  };
  fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(project, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(projectPath, 'README_PROJECT.txt'), [
    'Aurora Forge Project',
    '',
    'Project: ' + projectName,
    'Type: ' + project.type,
    '',
    'Created folders:',
    ...folders.map((folder) => '- ' + folder),
    '',
    'Suggested workflow:',
    '1. Keep untouched source and extracted files in a separate backup.',
    '2. Store project profiles, prompts, working images, DDS files, and reports in their matching folders.',
    '3. Use the Creator Suite plan and the current Knowledgebase workflow for the selected project type.',
    '4. Put final-chat handoff ZIPs in handoff-packs/.',
    '5. Put final PNG outputs in outputs/.',
    '',
    'Expected Luchador Mask outputs:',
    '- mask_color.png',
    '- mask_mask1.png',
    '- mask_nrm.png',
    '',
    'Notes:',
    project.notes
  ].join('\n') + '\n', 'utf8');
  await shell.openPath(projectPath);
  return { ok: true, projectPath };
});


ipcMain.handle('desktop:save-project-json', async (_event, payload) => {
  const project = payload && payload.project ? payload.project : {};
  assertProjectJsonShape(project);
  const defaultName = sanitizeName(payload && payload.defaultName ? payload.defaultName : 'project.json').replace(/\s+/g, '-').toLowerCase();
  let targetPath = payload && payload.existingPath ? String(payload.existingPath) : '';
  if (!targetPath) {
    const result = await dialog.showSaveDialog({
      title: 'Save Aurora Forge project.json',
      defaultPath: path.join(defaultProjectsPath(), defaultName.endsWith('.json') ? defaultName : defaultName + '.json'),
      filters: [{ name: 'Project JSON', extensions: ['json'] }, { name: 'All files', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePath) return { ok: false };
    targetPath = result.filePath;
  }
  if (!safeInsideAllowedRoots(targetPath)) throw new Error('Selected save path is outside the allowed local document/desktop roots.');
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, JSON.stringify(project, null, 2) + '\n', 'utf8');
  return { ok: true, path: targetPath };
});

ipcMain.handle('desktop:open-project-json', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Open Aurora Forge project.json',
    defaultPath: defaultProjectsPath(),
    properties: ['openFile'],
    filters: [{ name: 'Project JSON', extensions: ['json'] }, { name: 'All files', extensions: ['*'] }]
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const filePath = result.filePaths[0];
  const raw = fs.readFileSync(filePath, 'utf8');
  const project = JSON.parse(raw);
  assertProjectJsonShape(project);
  return { ok: true, path: filePath, project };
});

ipcMain.handle('desktop:mod-suite-create-workspace', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose where to create the Aurora Forge mod workspace',
    defaultPath: defaultProjectsPath(),
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const parent = path.resolve(result.filePaths[0]);
  const workspace = uniquePath(parent, 'Aurora Forge WWE 2K26 Mod');
  const bakeMe = path.join(workspace, 'BakeMe');
  const supportFolders = ['00_Backups', '01_Source_References', '02_Working_Files', '03_Profiles_JSON', '04_Audit_Reports', '05_Test_Builds', '06_Release_Package'];
  ensureDir(workspace);
  supportFolders.forEach((folder) => ensureDir(path.join(workspace, folder)));
  MOD_SUITE_BAKEME_ROOTS.forEach((folder) => ensureDir(path.join(bakeMe, folder)));
  const manifest = {
    app: 'Aurora Forge',
    schema: 'aurora-forge-mod-suite-workspace-v1',
    game: 'WWE 2K26',
    created_at: new Date().toISOString(),
    status: 'planning',
    bake_me_roots: MOD_SUITE_BAKEME_ROOTS,
    validation: { clean_baseline_recorded: false, source_backup_complete: false, structural_audit_passed: false, cak_verified: false, in_game_test_passed: false },
    notes: []
  };
  fs.writeFileSync(path.join(workspace, 'aurora-forge-mod-suite.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(workspace, 'README_WORKSPACE.txt'), [
    'AURORA FORGE WWE 2K26 MOD WORKSPACE', '',
    'This workspace contains no WWE game assets. Add only files you extracted or created lawfully.', '',
    'Safety order:',
    '1. Put untouched references and tool exports outside BakeMe and preserve a separate backup.',
    '2. Store editable work in 02_Working_Files and portable profiles in 03_Profiles_JSON.',
    '3. Put only final staged paths under BakeMe.',
    '4. Run the Mod Suite BakeMe audit before building a CAK.',
    '5. Build a new CAK; do not overwrite an installed archive.',
    '6. Record controlled in-game results in 04_Audit_Reports.', '',
    'A structurally valid folder does not prove that an ID, hash, JSFB record, animation, or save edit is correct.'
  ].join('\n') + '\n', 'utf8');
  const openError = await shell.openPath(workspace);
  return { ok: !openError, path: workspace, error: openError };
});

ipcMain.handle('desktop:mod-suite-choose-audit-folder', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose a BakeMe or mod workspace folder to audit', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  return { ok: true, report: auditModSuiteFolder(result.filePaths[0]) };
});

ipcMain.handle('desktop:mod-suite-open-folder', async (_event, folderPath) => {
  const target = path.resolve(String(folderPath || ''));
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error('The selected folder is unavailable.');
  const error = await shell.openPath(target);
  return { ok: !error, path: target, error };
});

ipcMain.handle('desktop:workshop-capabilities', async () => workshopServices().capabilities.summarize());

ipcMain.handle('desktop:workshop-choose-wwe2k26', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose your WWE 2K26 installation', properties: ['openDirectory'] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const root = path.resolve(result.filePaths[0]);
  const executable = path.join(root, secureDataCtrlLinkManifest.hostExecutable);
  if (!fs.existsSync(executable) || !fs.lstatSync(executable).isFile() || fs.lstatSync(executable).isSymbolicLink()) throw new Error('That folder does not contain a regular WWE2K26_x64.exe file.');
  const executableSha256 = workshopServices().capabilities.sha256(executable);
  workshopServices().registry.set('wwe2k26', root, executableSha256 === secureDataCtrlLinkManifest.gameExeSha256 ? { lastVerifiedExeSha256: executableSha256 } : {});
  return { ok: true, capabilities: workshopServices().capabilities.summarize() };
});

ipcMain.handle('desktop:workshop-choose-secure-loader', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the verified Secure DataCtrlLink dinput8.dll', properties: ['openFile'], filters: [{ name: 'Secure DataCtrlLink', extensions: ['dll'] }] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const selected = path.resolve(result.filePaths[0]);
  const stat = fs.lstatSync(selected);
  if (!stat.isFile() || stat.isSymbolicLink() || path.basename(selected).toLowerCase() !== 'dinput8.dll') throw new Error('Select the regular release file named dinput8.dll.');
  const sha256 = workshopServices().capabilities.sha256(selected);
  if (sha256 !== secureDataCtrlLinkManifest.dllSha256) throw new Error('Selection blocked: this DLL checksum is not the reviewed v1.0.0 release checksum.');
  selectedSecureLoaderSource = selected;
  return { ok: true, name: path.basename(selected), sha256, version: secureDataCtrlLinkManifest.loaderVersion };
});

ipcMain.handle('desktop:workshop-choose-secure-loader-zip', async () => {
  const result = await dialog.showOpenDialog({ title: 'Choose the reviewed Secure DataCtrlLink v1.0.0 release ZIP', properties: ['openFile'], filters: [{ name: 'Secure DataCtrlLink release', extensions: ['zip'] }] });
  if (result.canceled || !result.filePaths.length) return { ok: false };
  const staged = workshopServices().releases.validateAndStage(result.filePaths[0]);
  workshopServices().releases.cleanupStagedDll(selectedSecureLoaderSource);
  selectedSecureLoaderSource = staged.dllPath;
  return { ok: true, zipSha256: staged.zipSha256, dllSha256: staged.dllSha256, version: staged.version, entryCount: staged.entryCount };
});

ipcMain.handle('desktop:workshop-download-secure-loader', async (_event, request) => {
  if (!request || request.confirm !== true || Object.keys(request).some((key) => key !== 'confirm')) throw new Error('Explicit download confirmation is required.');
  const staged = await workshopServices().releases.downloadAndStage();
  workshopServices().releases.cleanupStagedDll(selectedSecureLoaderSource);
  selectedSecureLoaderSource = staged.dllPath;
  return { ok: true, zipSha256: staged.zipSha256, dllSha256: staged.dllSha256, version: staged.version, entryCount: staged.entryCount };
});

ipcMain.handle('desktop:workshop-install-secure-loader', async (_event, request) => {
  if (!request || request.confirm !== true || Object.keys(request).some((key) => key !== 'confirm')) throw new Error('Explicit install confirmation is required.');
  if (!selectedSecureLoaderSource) throw new Error('Choose and verify the Secure DataCtrlLink release DLL first.');
  const installedSource = selectedSecureLoaderSource;
  const operation = workshopServices().loader.install(installedSource);
  selectedSecureLoaderSource = '';
  workshopServices().releases.cleanupStagedDll(installedSource);
  return { ok: true, operation, capabilities: workshopServices().capabilities.summarize() };
});

ipcMain.handle('desktop:workshop-rollback-secure-loader', async (_event, request) => {
  if (!request || request.confirm !== true || typeof request.operationId !== 'string' || Object.keys(request).some((key) => !['confirm', 'operationId'].includes(key))) throw new Error('A verified operation and explicit rollback confirmation are required.');
  const operation = workshopServices().loader.rollback(request.operationId);
  return { ok: true, operation, capabilities: workshopServices().capabilities.summarize() };
});

ipcMain.handle('desktop:workshop-journal', async () => workshopServices().journal.list(50));
ipcMain.handle('desktop:workshop-redacted-report', async () => workshopServices().journal.redactedReport(workshopServices().capabilities.summarize()));
ipcMain.handle('desktop:workshop-loader-diagnostics', async () => workshopServices().diagnostics.read());
ipcMain.handle('desktop:workshop-cak-collisions', async () => workshopServices().collisions.scan());
ipcMain.handle('desktop:workshop-mod-manifest', async () => workshopServices().modManifest.read());
ipcMain.handle('desktop:workshop-save-mod-manifest', async (_event, request) => workshopServices().modManifest.save(request));
