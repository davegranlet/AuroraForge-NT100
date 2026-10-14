const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const http = require('node:http');

// GPU-less hosts (VPS/Docker/headless): software rendering by default on Linux
// (AURORA_FORGE_GPU=1 re-enables hardware acceleration); any platform can force
// software rendering with AURORA_FORGE_DISABLE_GPU=1.
const softwareRendering = (process.platform === 'linux' && process.env.AURORA_FORGE_GPU !== '1') || process.env.AURORA_FORGE_DISABLE_GPU === '1';
if (softwareRendering) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
}
if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox');
}

let verifiedPatreon = null;
// A revoked account is sticky for the process lifetime: once the verifier
// answers "banned", no converter action may run again in this session, and no
// cached session may be reused.
let bannedPatreon = null;
const PATREON_CALLBACK_PORT = 53702;
const MAIN_APP_SESSION_MAX_AGE_MS = 15 * 60 * 1000;

function repoRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'aurora-tools')
    : path.resolve(__dirname, '..');
}

function nodeEnv() {
  return { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
}

function gameRegistry() {
  const candidates = [
    path.join(process.resourcesPath, 'Aurora-CAK-Foundry', 'electron', 'game-versions.js'),
    path.resolve(__dirname, '..', '..', 'Aurora-CAK-Foundry', 'electron', 'game-versions.js')
  ];
  for (const candidate of candidates) {
    try { if (fs.existsSync(candidate)) return require(candidate); } catch (_error) { /* keep looking */ }
  }
  return null;
}

function detectGameFolder(gameId) {
  const registry = gameRegistry();
  if (registry) {
    try { const hit = registry.findInstall(gameId); if (hit) return hit.root; } catch (_error) { /* fall back below */ }
  }
  return null;
}

function detect2k26Folder() {
  const detected = detectGameFolder('2k26');
  if (detected) return detected;
  const candidates = [
    'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
    'D:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
    'E:\\SteamLibrary\\steamapps\\common\\WWE 2K26',
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K26',
    'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K26'
  ];
  for (const candidate of candidates) {
    try { if (fs.existsSync(path.join(candidate, 'WWE2K26_x64.exe'))) return candidate; } catch (_error) { /* ignore */ }
  }
  return null;
}

function detect2k19Folder() {
  const detected = detectGameFolder('2k19');
  if (detected) return detected;
  const candidates = [
    'C:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
    'D:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
    'E:\\Program Files (x86)\\Steam\\steamapps\\common\\WWE 2K19',
    'C:\\SteamLibrary\\steamapps\\common\\WWE 2K19',
    'D:\\SteamLibrary\\steamapps\\common\\WWE 2K19',
    'E:\\SteamLibrary\\steamapps\\common\\WWE 2K19'
  ];
  for (const candidate of candidates) {
    try { if (fs.existsSync(path.join(candidate, 'pac', 'evt'))) return candidate; } catch (_error) { /* ignore */ }
  }
  return null;
}

function detectGameInstalls() {
  const registry = gameRegistry();
  if (registry) {
    try { return registry.detectInstalls(); } catch (_error) { /* fall through */ }
  }
  const only = detect2k26Folder();
  return only ? { '2k26': { id: '2k26', label: 'WWE 2K26', root: only } } : {};
}

function bundledSkeleton() {
  const candidates = [
    path.join(process.resourcesPath, 'aurora-tools', 'skeletons', '14000-base', 'BakeMe'),
    path.resolve(__dirname, '..', '..', 'umbrella-app', 'app', 'skeletons', '14000-base', 'BakeMe'),
    path.resolve(__dirname, '..', '..', '..', '_work', '14000-compat-v103', 'BakeMe')
  ];
  for (const candidate of candidates) {
    try { if (candidate && fs.existsSync(path.join(candidate, 'Entrances', 'VictoryListData.jsfb'))) return candidate; } catch (_error) { /* ignore */ }
  }
  return null;
}

async function refresh2k26Skeleton(repo, event, options) {
  const settings = options || {};
  const game26 = settings.game26Folder || detect2k26Folder();
  if (!game26) return { ok: false, err: 'Choose your WWE 2K25/2K26 game folder so the registration skeleton can be built from your own game files.' };
  const template = settings.template || bundledSkeleton() || settings.skeleton || null;
  if (!template) return { ok: false, err: 'No base skeleton is available to refresh.' };
  const out = path.join(app.getPath('userData'), 'skeletons', '14000-2k26', 'BakeMe');
  fs.rmSync(out, { recursive: true, force: true });
  const run = await runNode(repo, [
    path.join(repo, 'tools', 'refresh-2k26-skeleton.js'),
    '--game', game26,
    '--template', template,
    '--out', out,
  ], event);
  if (run.code !== 0) return { ok: false, code: run.code, out: run.out, err: run.err || 'Skeleton refresh failed.' };
  let report = null;
  try { report = JSON.parse(run.out); } catch (_error) { /* keep the raw report */ }
  return { ok: true, skeleton: out, template, game26, report };
}

function patreon() {
  return require(path.join(repoRoot(), 'tools', 'patreon-access.js'));
}

// Private owner build: the marker lives inside app.asar, so an end user cannot
// unlock a public build by dropping a file beside it.
function ownerBuild() {
  try {
    const { isOwnerBuild } = require(path.join(repoRoot(), 'tools', 'owner-build.js'));
    const trustedDirs = [];
    // Packaged app root (inside app.asar) is read-only to end users, so the
    // marker there cannot be added to a public build without repacking.
    try { trustedDirs.push(app.getAppPath()); } catch (_error) { /* ignore */ }
    return isOwnerBuild(process.env, trustedDirs);
  } catch (_error) {
    return false;
  }
}

function mainAppAccessSession() {
  const encoded = process.env.AURORA_FORGE_MAIN_ACCESS || '';
  if (!encoded) return null;
  try {
    const raw = Buffer.from(encoded, 'base64url').toString('utf8');
    const session = JSON.parse(raw);
    if (!session || session.ok !== true || session.mainApp !== true || session.method !== 'main_app_session') return null;
    if (session.app !== 'Aurora Forge' || session.build !== 'Beta3') return null;
    const issuedAt = Date.parse(session.issuedAt || '');
    const expiresAt = Date.parse(session.expiresAt || '');
    if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null;
    if (Date.now() - issuedAt > MAIN_APP_SESSION_MAX_AGE_MS) return null;
    return {
      ok: true,
      owner: false,
      mainApp: true,
      method: 'main_app_session',
      app: 'Aurora Forge',
      build: 'Beta3',
      verifiedAt: session.verifiedAt || session.issuedAt,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
    };
  } catch (_error) {
    return null;
  }
}

async function startPatreonOAuthLogin() {
  const config = patreon().readConfig();
  const verifyUrl = config.verifyUrl || (process.env.AURORA_PATREON_DISABLE_DEFAULT_VERIFY_URL ? '' : patreon().DEFAULT_VERIFY_URL);
  if (!verifyUrl) {
    throw new Error('Remote Patreon verifier is required for secure OAuth login.');
  }
  const state = crypto.randomBytes(24).toString('hex');
  let markReady;
  let rejectReady;
  let callbackServer;
  const callbackReady = new Promise((resolve, reject) => {
    markReady = resolve;
    rejectReady = reject;
  });
  const callbackPromise = new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname !== '/patreon-callback') {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Not found.');
          return;
        }
        const returnedState = url.searchParams.get('state');
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        if (returnedState !== state) {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Aurora Forge Patreon login failed: invalid state. You can close this tab.');
          reject(new Error('Patreon OAuth state mismatch.'));
          server.close();
          return;
        }
        if (error) {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Aurora Forge Patreon login was cancelled or denied. You can close this tab.');
          reject(new Error(`Patreon OAuth error: ${error}`));
          server.close();
          return;
        }
        if (!code) {
          res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Aurora Forge Patreon login failed: missing code. You can close this tab.');
          reject(new Error('Patreon OAuth callback did not include a code.'));
          server.close();
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><title>Aurora Forge</title><body style="font-family:Segoe UI,Arial,sans-serif;background:#07131f;color:#e6f3ff"><h1>Patreon login complete</h1><p>You can close this tab and return to Aurora Forge.</p></body>');
        resolve({ code });
        server.close();
      } catch (error) {
        reject(error);
        server.close();
      }
    });
    callbackServer = server;
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Patreon login timed out.'));
    }, 120000);
    server.on('close', () => clearTimeout(timer));
    server.on('error', error => {
      rejectReady(error);
      reject(error);
    });
    server.listen(PATREON_CALLBACK_PORT, '127.0.0.1', () => {
      markReady({ redirectUri: `http://127.0.0.1:${PATREON_CALLBACK_PORT}/patreon-callback` });
    });
  });
  callbackPromise.catch(() => {});
  const { redirectUri } = await callbackReady;
  const loginUrl = patreon().buildOAuthStartUrl({ verifyUrl, redirectUri, state, releaseChallenge: patreon().currentReleaseChallenge ? patreon().currentReleaseChallenge() : undefined });
  try {
    await shell.openExternal(loginUrl);
  } catch (error) {
    callbackServer?.close();
    throw error;
  }
  const { code } = await callbackPromise;
  return patreon().remoteOAuthVerify({
    verifyUrl,
    code,
    redirectUri,
    state,
    machineId: patreon().computeMachineId(),
    appVersion: app.getVersion(),
  });
}

function createWindow() {
  const w = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: '#07131f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  w.loadFile(path.join(__dirname, 'index.html'));
}

function runNode(repo, args, e) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, args, { cwd: repo, env: nodeEnv() });
    let out = '';
    let err = '';
    p.stdout.on('data', b => {
      out += b.toString();
      e?.sender.send('convert-log', b.toString());
    });
    p.stderr.on('data', b => {
      err += b.toString();
      e?.sender.send('convert-log', b.toString());
    });
    p.on('close', code => resolve({ code, out, err }));
  });
}

function requireAccess() {
  if (ownerBuild()) return;
  if (bannedPatreon) {
    throw new Error('Access to Aurora Forge has been revoked for this account.');
  }
  if (mainAppAccessSession()) return;
  if (!verifiedPatreon?.ok) {
    throw new Error('Patreon tier access must be verified before using converter tools.');
  }
  if (verifiedPatreon.expiresAt && Date.parse(verifiedPatreon.expiresAt) <= Date.now()) {
    verifiedPatreon = null;
    throw new Error('Patreon verification expired. Sign in again to continue.');
  }
  const verifiedAt = Date.parse(verifiedPatreon.verifiedAt || verifiedPatreon.issuedAt || '');
  if (!Number.isNaN(verifiedAt) && Date.now() - verifiedAt > patreon().REMOTE_SESSION_MAX_AGE_MS) {
    verifiedPatreon = null;
    throw new Error('Patreon verification is too old. Sign in again to continue.');
  }
}

ipcMain.handle('pick-file', async (_, filters) => {
  const r = await dialog.showOpenDialog({ properties: ['openFile'], filters });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('pick-save', async () => {
  const r = await dialog.showSaveDialog({
    defaultPath: 'aurora-converted.yanm20.bin',
    filters: [{ name: 'YANM20 animation', extensions: ['bin', 'yanm20'] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('pick-clips-save', async () => {
  const r = await dialog.showSaveDialog({
    defaultPath: 'aurora-2k25-replace-candidate.clips',
    filters: [{ name: 'WWE 2K25 clips', extensions: ['clips'] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('pick-cak-save', async () => {
  const r = await dialog.showSaveDialog({
    defaultPath: 'aurora-2k25-replace-mod.cak',
    filters: [{ name: 'WWE 2K25 mod CAK', extensions: ['cak'] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('pick-directory', async () => {
  const r = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('pick-fbx-save', async () => {
  const r = await dialog.showSaveDialog({
    defaultPath: 'aurora-2k19-preview.fbx',
    filters: [{ name: 'FBX preview', extensions: ['fbx'] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle('patreon-status', async () => {
  if (ownerBuild()) {
    const { ownerSession } = require(path.join(repoRoot(), 'tools', 'owner-build.js'));
    return {
      session: ownerSession(),
      banned: false,
      owner: true,
      config: { configured: true, mode: 'owner', missing: [], verifyUrl: null, allowedTierIds: [], campaignId: null },
    };
  }
  const mainAppSession = mainAppAccessSession();
  if (mainAppSession && !bannedPatreon) {
    return {
      session: mainAppSession,
      banned: false,
      owner: false,
      mainApp: true,
      config: { configured: true, mode: 'main_app_session', missing: [], verifyUrl: null, allowedTierIds: [], campaignId: null },
    };
  }
  return {
    session: bannedPatreon || verifiedPatreon,
    banned: Boolean(bannedPatreon),
    owner: false,
    config: patreon().configStatus(),
  };
});

ipcMain.handle('editor-suite-status', async () => {
  const repo = repoRoot();
  const suite = require(path.join(repo, 'tools', 'pipeline-editor-suite.js'));
  return {
    beta: 'Beta3',
    active: suite.findPipelineEditors('active'),
    coming: suite.findPipelineEditors('coming'),
  };
});

ipcMain.handle('verify-patreon', async (_, args) => {
  try {
    const mainAppSession = mainAppAccessSession();
    if (mainAppSession && !bannedPatreon) return mainAppSession;
    const result = await startPatreonOAuthLogin();
    if (result.code === 'banned' || result.terminal) {
      bannedPatreon = result;
      verifiedPatreon = null;
      return result;
    }
    bannedPatreon = null;
    verifiedPatreon = result.ok
      ? {
          ...result,
          verifiedAt: new Date().toISOString(),
        }
      : null;
    return result;
  } catch (error) {
    verifiedPatreon = null;
    return { ok: false, code: 'api_error', reason: error.message };
  }
});

ipcMain.handle('convert', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'aurora-converter.js'),
      '--from', '19',
      '--to', '20',
      '--source', args.source,
      '--reference', args.reference,
      '--output', args.output,
      '--section', String(args.section || 0),
    ],
    e,
  );

  if (r.code !== 0) {
    return { ...r, ok: false };
  }

  try {
    const output = path.resolve(args.output);
    const buffer = fs.readFileSync(output);
    const { decodeSection } = require(path.join(repo, 'tools', 'yanm20-reader.js'));
    const decoded = decodeSection(buffer);
    const tracks = decoded.records.filter(record => record.type === 0x2100);
    if (!tracks.length || !tracks.every(record => record.streamA.length > 0 && record.streamB.length > 0)) {
      throw new Error('read-back validation found an incomplete motion stream');
    }
    return {
      ...r,
      ok: true,
      validation: {
        output,
        bytes: buffer.length,
        records: decoded.records.length,
        tracks: tracks.length,
        allTracksHaveTwoStreams: true,
      },
    };
  } catch (error) {
    return { ...r, ok: false, err: `Output was written but read-back validation failed: ${error.message}` };
  }
});


ipcMain.handle('build-package', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const id = String(args.id || '6100');
  const outputRoot = path.resolve(args.outputRoot);
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'build-2k19-to-2k20-victory-package.js'),
      '--source19', args.source19,
      '--fop19', args.fop19,
      '--referenceActs20', args.referenceActs20,
      '--referenceEvd20', args.referenceEvd20,
      '--outputRoot', outputRoot,
      '--id', id,
    ],
    e,
  );

  if (r.code !== 0) {
    return { ...r, ok: false };
  }

  try {
    const actsOutput = path.join(outputRoot, 'Root', 'Animation', 'Victory', `${id}.acts`);
    const evdOutput = path.join(outputRoot, 'Root', 'Animation', 'Victory', `${id}.evd`);
    const actsBuffer = fs.readFileSync(actsOutput);
    const evdBuffer = fs.readFileSync(evdOutput);
    const { parse } = require(path.join(repo, 'tools', 'amym-container.js'));
    const { decodeSection } = require(path.join(repo, 'tools', 'yanm20-reader.js'));
    const { readEvd } = require(path.join(repo, 'tools', 'evd-reader.js'));
    const container = parse(actsBuffer);
    const decoded = decodeSection(actsBuffer.subarray(37212));
    const tracks = decoded.records.filter(record => record.type === 0x2100);
    const evd = readEvd(evdBuffer);
    if (!tracks.length || !tracks.every(record => record.streamA.length > 0 && record.streamB.length > 0)) {
      throw new Error('read-back validation found an incomplete ACTS motion stream');
    }
    if (evd.motionId !== Number(id)) {
      throw new Error(`EVD read-back motion id ${evd.motionId} did not match ${id}`);
    }
    return {
      ...r,
      ok: true,
      validation: {
        outputRoot,
        actsOutput,
        evdOutput,
        actsBytes: actsBuffer.length,
        evdBytes: evdBuffer.length,
        amymEntries: container.entryCount,
        records: decoded.records.length,
        tracks: tracks.length,
        allTracksHaveTwoStreams: true,
        evdMotionId: evd.motionId,
        evdInternalName: evd.internalName,
        evdPayloadBytes: evd.payload.length,
      },
    };
  } catch (error) {
    return { ...r, ok: false, err: `Package was written but read-back validation failed: ${error.message}` };
  }
});

ipcMain.handle('build-2k25-replace', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'build-2k19-to-2k25-replace-clips.js'),
      '--source19', args.source19,
      '--template25', args.template25,
      '--record', String(args.recordIndex || 'auto'),
      '--out', args.output,
      ...(args.legsStock ? ['--legs-stock'] : []),
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `Replace output was written but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('build-2k25-replace-cak', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'build-2k19-to-2k25-replace-cak.js'),
      '--source19', args.source19,
      '--template25', args.template25,
      '--record', String(args.recordIndex || 'auto'),
      '--virtual-path', args.virtualPath,
      '--out-cak', args.outputCak,
      ...(args.workRoot ? ['--work-root', args.workRoot] : []),
      ...(args.foundryRoot ? ['--foundry', args.foundryRoot] : []),
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `CAK was built but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('build-2k25-new-entry', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'convert-2k19-to-2k25-new-entry.js'),
      '--source19', args.source19,
      '--skeleton', args.skeleton,
      '--id', String(args.id || 14000),
      '--record', String(args.recordIndex || 'auto'),
      '--out-cak', args.outputCak,
      ...(args.workRoot ? ['--work-root', args.workRoot] : []),
      ...(args.foundryRoot ? ['--foundry', args.foundryRoot] : []),
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `New-entry CAK was built but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('build-2k25-library', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'convert-2k19-library-to-2k25-entries.js'),
      '--skeleton', args.skeleton,
      '--victory', args.victoryFolder || '',
      '--entrance', args.entranceFolder || '',
      '--out-cak', args.outputCak,
      ...(args.foundryRoot ? ['--foundry', args.foundryRoot] : []),
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `Library CAK was built but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('build-2k25-library-from-game', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const outputCak = args.outputCak;
  let skeleton = args.skeleton;
  let skeletonRefresh = null;
  if (args.refreshSkeleton !== false) {
    skeletonRefresh = await refresh2k26Skeleton(repo, e, {
      game26Folder: args.game26Folder,
      template: args.refreshTemplate,
      skeleton: args.skeleton
    });
    if (skeletonRefresh.ok) skeleton = skeletonRefresh.skeleton;
  }
  const skeletonUsable = Boolean(skeleton) && fs.existsSync(path.join(skeleton, 'Entrances', 'VictoryListData.jsfb'));
  if (!skeletonUsable) {
    return { ok: false, stage: 'skeleton', skeletonRefresh, err: 'The registration skeleton could not be prepared. Choose your WWE 2K25/2K26 game folder and try again — the skeleton is built from that game on your PC.' };
  }
  const extracted = path.join(path.dirname(outputCak), `${path.basename(outputCak, '.cak')}-2k19-extracted`);

  const ex = await runNode(repo, [
    path.join(repo, 'tools', 'extract-2k19-animations.js'),
    '--game', args.game19Folder,
    '--out', extracted,
    '--scope', args.scope || 'all',
  ], e);
  if (ex.code !== 0) return { ...ex, ok: false, stage: 'extract' };
  let extractValidation;
  try { extractValidation = JSON.parse(ex.out); }
  catch (error) { return { ...ex, ok: false, stage: 'extract', err: `Extraction finished but its report could not be parsed: ${error.message}` }; }
  if (!extractValidation.decoded) return { ...ex, ok: false, stage: 'extract', err: 'No 2K19 animations were decoded from that folder.' };

  const lib = await runNode(repo, [
    path.join(repo, 'tools', 'convert-2k19-library-to-2k25-entries.js'),
    '--skeleton', skeleton,
    '--victory', path.join(extracted, 'victory'),
    '--entrance', path.join(extracted, 'entrance'),
    '--out-cak', outputCak,
    ...(args.foundryRoot ? ['--foundry', args.foundryRoot] : []),
  ], e);
  if (lib.code !== 0) return { ...lib, ok: false, stage: 'convert', extraction: extractValidation, skeletonRefresh };
  try {
    return { ...lib, ok: true, extraction: extractValidation, skeletonRefresh, validation: JSON.parse(lib.out) };
  } catch (error) {
    return { ...lib, ok: false, stage: 'convert', extraction: extractValidation, skeletonRefresh, err: `Library CAK was built but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('refresh-2k26-skeleton', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }
  return refresh2k26Skeleton(repoRoot(), e, args || {});
});

ipcMain.handle('wizard-defaults', async () => {
  let game19 = null;
  let game26 = null;
  try { game19 = detect2k19Folder(); } catch (_error) { /* ignore */ }
  try { game26 = detect2k26Folder(); } catch (_error) { /* ignore */ }
  const exportsDir = path.join(app.getPath('documents'), 'AuroraForge NT100 Exports');
  return {
    ok: true,
    game19: game19 || '',
    game26: game26 || '',
    skeleton: bundledSkeleton() || '',
    output: path.join(exportsDir, 'aurora-library.cak'),
    extractFolder: path.join(exportsDir, '2k19-extract-all')
  };
});

ipcMain.handle('game-folder-version', async (_event, folder) => {
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
    try {
      if (dir && fs.existsSync(path.join(dir, exe))) return { ok: true, version, exe };
    } catch (_error) { /* keep looking */ }
  }
  return { ok: false };
});

ipcMain.handle('detect-games', async () => {
  try {
    return { ok: true, installs: detectGameInstalls() };
  } catch (error) {
    return { ok: false, err: error.message };
  }
});

ipcMain.handle('extract-2k19-animations', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  if (!args.outFolder) return { ok: false, err: 'Choose an extraction folder first.' };
  const repo = repoRoot();
  const outFolder = path.resolve(args.outFolder);
  if (fs.existsSync(outFolder)) {
    return { ok: false, err: `Extraction folder already exists: ${outFolder}. Choose a new folder so nothing is overwritten.` };
  }

  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'extract-2k19-animations.js'),
      '--game', args.game19Folder,
      '--out', outFolder,
      '--scope', args.scope || 'everything',
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `Extraction finished but its report could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('export-models', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const r = await runNode(
    repo,
    [
      path.join(repo, 'tools', 'export-supported-game-models.js'),
      '--game', args.game,
      '--source-root', args.sourceRoot,
      '--output-root', args.outputRoot,
    ],
    e,
  );
  if (r.code !== 0) return { ...r, ok: false };
  try {
    return { ...r, ok: true, validation: JSON.parse(r.out) };
  } catch (error) {
    return { ...r, ok: false, err: `Model export finished but validation JSON could not be parsed: ${error.message}` };
  }
});

ipcMain.handle('export-fbx', async (e, args) => {
  try {
    requireAccess();
  } catch (error) {
    return { ok: false, code: 'access_denied', err: error.message };
  }

  const repo = repoRoot();
  const ir = path.join(app.getPath('temp'), `aurora-motion-${Date.now()}.json`);
  const r = await runNode(repo, [path.join(repo, 'tools', 'export-yanm-ir.js'), args.source], e);
  if (r.code !== 0) {
    return { ...r, ok: false };
  }

  try {
    fs.writeFileSync(ir, r.out);
  } catch (error) {
    return { ok: false, code: 'io_error', err: error.message };
  }

  const blender = process.platform === 'win32'
    ? 'D:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe'
    : 'blender';
  const b = await new Promise(resolve => {
    const p = spawn(blender, [
      '--background',
      '--python', path.join(repo, 'blender_addon', 'aurora_2k19_fbx_export.py'),
      '--',
      '--ir', ir,
      '--output', args.output,
    ], { cwd: repo });
    let out = '';
    let err = '';
    p.stdout.on('data', x => {
      out += x.toString();
      e.sender.send('convert-log', x.toString());
    });
    p.stderr.on('data', x => {
      err += x.toString();
      e.sender.send('convert-log', x.toString());
    });
    p.on('close', code => resolve({ code, out, err }));
  });

  try {
    fs.unlinkSync(ir);
  } catch {}

  return { ...b, ok: b.code === 0 };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
