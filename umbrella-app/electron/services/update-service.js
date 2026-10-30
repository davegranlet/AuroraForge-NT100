'use strict';

const { autoUpdater } = require('electron-updater');

function createUpdateService(options) {
  const app = options.app;
  const dialog = options.dialog;
  const getWindow = options.getWindow || (() => null);
  const log = options.log || (() => {});

  let initialized = false;
  let manualCheck = false;
  let status = { state: 'idle', version: app.getVersion(), message: '' };

  function window() {
    try { return getWindow() || null; } catch (_error) { return null; }
  }

  function updateStatus(next, extra = {}) {
    status = { ...status, ...next, ...extra, at: new Date().toISOString() };
    log('update: ' + status.state + (status.message ? ' - ' + status.message : ''));
    return status;
  }

  function show(options) {
    const win = window();
    return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
  }

  async function promptDownload(info) {
    const result = await show({
      type: 'info',
      title: 'AuroraForge NT100 update available',
      message: `AuroraForge NT100 ${info.version} is available.`,
      detail: `You are running ${app.getVersion()}. Download the update now? The update will install when the app restarts.`,
      buttons: ['Download update', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) {
      try {
        await autoUpdater.downloadUpdate();
      } catch (error) {
        updateStatus('error', { message: String(error.message || error) });
        await show({ type: 'error', title: 'Update download failed', message: 'The update could not be downloaded.', detail: String(error.message || error) });
      }
    }
  }

  async function promptInstall(info) {
    const result = await show({
      type: 'info',
      title: 'AuroraForge NT100 update ready',
      message: `AuroraForge NT100 ${info.version} has been downloaded.`,
      detail: 'Restart AuroraForge NT100 to install the update.',
      buttons: ['Restart and install', 'Later'],
      defaultId: 0,
      cancelId: 1
    });
    if (result.response === 0) autoUpdater.quitAndInstall(false, true);
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (!app.isPackaged) {
      updateStatus('dev', { message: 'Automatic updates are active in packaged builds.' });
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.logger = {
      info: (message) => log('updater: ' + message),
      warn: (message) => log('updater warning: ' + message),
      error: (message) => log('updater error: ' + message),
      debug: () => {}
    };

    autoUpdater.on('checking-for-update', () => updateStatus('checking'));
    autoUpdater.on('update-available', (info) => {
      updateStatus('available', { latestVersion: info.version });
      promptDownload(info).catch((error) => log('update prompt failed: ' + String(error.message || error)));
    });
    autoUpdater.on('update-not-available', (info) => {
      updateStatus('current', { latestVersion: info.version });
      if (manualCheck) {
        show({
          type: 'info',
          title: 'AuroraForge NT100 is up to date',
          message: `You are running the latest version (${app.getVersion()}).`
        }).catch(() => {});
      }
    });
    autoUpdater.on('download-progress', (progress) => {
      updateStatus('downloading', { percent: Number(progress.percent.toFixed(1)), transferred: progress.transferred, total: progress.total });
    });
    autoUpdater.on('update-downloaded', (info) => {
      updateStatus('downloaded', { latestVersion: info.version });
      promptInstall(info).catch((error) => log('install prompt failed: ' + String(error.message || error)));
    });
    autoUpdater.on('error', (error) => {
      updateStatus('error', { message: String(error.message || error) });
      if (manualCheck) {
        show({
          type: 'error',
          title: 'Update check failed',
          message: 'AuroraForge NT100 could not check for updates.',
          detail: String(error.message || error)
        }).catch(() => {});
      }
    });
  }

  async function check(payload = {}) {
    init();
    if (!app.isPackaged) {
      updateStatus('dev', { message: 'Automatic updates are active in packaged builds.' });
      if (payload.manual) {
        await show({
          type: 'info',
          title: 'Updates',
          message: 'Automatic updates are active in packaged builds.',
          detail: 'Run the packaged application to check GitHub Releases for updates.'
        });
      }
      return { ok: false, reason: 'not-packaged', version: app.getVersion() };
    }
    manualCheck = Boolean(payload.manual);
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, version: app.getVersion(), latestVersion: result?.updateInfo?.version || null };
    } catch (error) {
      updateStatus('error', { message: String(error.message || error) });
      return { ok: false, error: String(error.message || error), version: app.getVersion() };
    } finally {
      manualCheck = false;
    }
  }

  async function download() {
    init();
    if (!app.isPackaged) return { ok: false, reason: 'not-packaged' };
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      updateStatus('error', { message: String(error.message || error) });
      return { ok: false, error: String(error.message || error) };
    }
  }

  async function install() {
    init();
    if (!app.isPackaged) return { ok: false, reason: 'not-packaged' };
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  }

  return { init, check, download, install, getStatus: () => status };
}

module.exports = { createUpdateService };
