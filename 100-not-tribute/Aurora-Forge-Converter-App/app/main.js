const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

let verifiedPatreon = null;

function repoRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'aurora-tools')
    : path.resolve(__dirname, '..');
}

function nodeEnv() {
  return { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
}

function patreon() {
  return require(path.join(repoRoot(), 'tools', 'patreon-access.js'));
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
  if (!verifiedPatreon?.ok) {
    throw new Error('Patreon tier access must be verified before using converter tools.');
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

ipcMain.handle('patreon-status', async () => ({
  session: verifiedPatreon,
  config: patreon().configStatus(),
}));

ipcMain.handle('verify-patreon', async (_, args) => {
  try {
    const result = await patreon().verifyPatreonAccess(args?.email);
    verifiedPatreon = result.ok
      ? {
          ...result,
          email: String(args?.email || '').trim().toLowerCase(),
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
