'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase(); }
function regular(filePath) { try { const stat = fs.lstatSync(filePath); return stat.isFile() && !stat.isSymbolicLink(); } catch (_error) { return false; } }
function safeRoot(value) {
  const root = path.resolve(String(value || ''));
  if (!root || !fs.existsSync(root) || !fs.lstatSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) throw new Error('Choose a regular WWE 2K25 game folder in Foundry first.');
  return root;
}

function createWwe2k25LoaderManager({ gameFolder, isGameRunning, journal, manifest, releaseRoot }) {
  function paths() {
    const game = safeRoot(gameFolder());
    return { game, executable: path.join(game, manifest.hostExecutable), core: path.join(game, manifest.coreFilename), plugins: path.join(game, 'plugins'), addon: path.join(game, 'plugins', manifest.addonFilename), addons: path.join(game, 'plugins', 'addons.txt') };
  }
  function same(filePath, expected) { return regular(filePath) && sha256(filePath) === expected; }
  function readAddons(filePath) {
    if (!fs.existsSync(filePath)) return { exists: false, text: '' };
    if (!regular(filePath) || fs.statSync(filePath).size > 64 * 1024) throw new Error('plugins/addons.txt is not a safe regular file.');
    return { exists: true, text: fs.readFileSync(filePath, 'utf8') };
  }
  function status() {
    const value = paths();
    const executableHash = regular(value.executable) ? sha256(value.executable) : '';
    const observed = (manifest.observedBuilds || []).find((build) => String(build.sha256 || '').toUpperCase() === executableHash);
    const executableSupported = executableHash === manifest.gameExeSha256 || Boolean(observed && observed.loaderStatus === 'supported');
    const addonList = readAddons(value.addons);
    const addonEnabled = addonList.text.split(/\r?\n/).map((line) => line.trim()).some((line) => line.toLowerCase() === manifest.addonFilename.toLowerCase());
    const coreReady = same(value.core, manifest.coreSha256);
    const addonReady = same(value.addon, manifest.addonSha256);
    const operations = journal.list(100);
    const restored = new Set(operations.filter((item) => item.operation === 'restore-wwe2k25-cak-loader' && item.result === 'verified').map((item) => item.enableOperationId));
    const enable = operations.find((item) => item.operation === 'enable-wwe2k25-cak-loader' && item.result === 'verified' && path.resolve(item.game || '').toLowerCase() === value.game.toLowerCase() && !restored.has(item.id));
    return { game: value.game, executableSupported, executableHash, buildLabel: observed ? observed.label : 'Unrecognized WWE 2K25 build', loaderStatus: observed ? observed.loaderStatus : 'needs-native-profile', coreReady, addonReady, addonEnabled, ready: executableSupported && coreReady && addonReady && addonEnabled, restorableOperationId: enable ? enable.id : '', note: manifest.notes };
  }
  function verifyRelease() {
    const core = path.join(releaseRoot, manifest.coreFilename);
    const addon = path.join(releaseRoot, manifest.addonFilename);
    if (!same(core, manifest.coreSha256) || !same(addon, manifest.addonSha256)) throw new Error('The bundled CAK loader files failed their checksum check. Nothing was changed.');
    return { core, addon };
  }
  function backup(filePath, rollbackFolder, name) {
    if (!fs.existsSync(filePath)) return { existed: false, path: '', sha256: '' };
    if (!regular(filePath)) throw new Error(`${name} is not a safe regular file.`);
    fs.mkdirSync(rollbackFolder, { recursive: true });
    const destination = path.join(rollbackFolder, name);
    fs.copyFileSync(filePath, destination, fs.constants.COPYFILE_EXCL);
    return { existed: true, path: destination, sha256: sha256(destination) };
  }
  function replace(source, target, expected, temporary) {
    fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
    if (!same(temporary, expected)) throw new Error('Temporary loader file verification failed. Nothing was changed.');
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.renameSync(temporary, target);
    if (!same(target, expected)) throw new Error('Installed loader file verification failed. Restore it before launching the game.');
  }
  function restoreBackup(target, previous) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    if (previous && previous.existed) fs.copyFileSync(previous.path, target);
  }
  function enable() {
    if (isGameRunning()) throw new Error('Close WWE 2K25 before enabling the CAK loader.');
    const value = paths();
    const enableHash = regular(value.executable) ? sha256(value.executable) : '';
    const enableObserved = (manifest.observedBuilds || []).find((build) => String(build.sha256 || '').toUpperCase() === enableHash);
    const enableSupported = enableHash === manifest.gameExeSha256 || Boolean(enableObserved && enableObserved.loaderStatus === 'supported');
    if (!enableSupported) throw new Error('Enable blocked: this WWE 2K25 executable is not a reviewed build. There is no force-enable option.');
    const release = verifyRelease();
    const timestamp = new Date().toISOString();
    const rollbackFolder = path.join(journal.rollbackRoot, timestamp.replace(/[:.]/g, '-'));
    const record = { operation: 'enable-wwe2k25-cak-loader', timestamp, game: value.game, core: null, addon: null, addons: null, result: 'started' };
    const temps = [value.core + `.aurora-${process.pid}-${Date.now()}.tmp`, value.addon + `.aurora-${process.pid}-${Date.now()}.tmp`];
    try {
      record.core = backup(value.core, rollbackFolder, manifest.coreFilename);
      fs.mkdirSync(value.plugins, { recursive: true });
      record.addon = backup(value.addon, rollbackFolder, manifest.addonFilename);
      record.addons = backup(value.addons, rollbackFolder, 'addons.txt');
      replace(release.core, value.core, manifest.coreSha256, temps[0]);
      replace(release.addon, value.addon, manifest.addonSha256, temps[1]);
      const current = readAddons(value.addons).text;
      const lines = current.split(/\r?\n/).filter((line) => line.trim() && line.trim().toLowerCase() !== manifest.addonFilename.toLowerCase());
      lines.push(manifest.addonFilename);
      fs.writeFileSync(value.addons, lines.join('\r\n') + '\r\n', 'utf8');
      record.core.installedSha256 = sha256(value.core);
      record.addon.installedSha256 = sha256(value.addon);
      record.addons.installedSha256 = sha256(value.addons);
      record.result = 'verified';
      const operation = journal.record(record);
      return { ok: true, operation, ...status() };
    } catch (error) {
      // A failed enable is reverted immediately; a journal entry is written
      // only after every installed file has been re-read and verified.
      try {
        if (record.addons) restoreBackup(value.addons, record.addons);
        if (record.addon) restoreBackup(value.addon, record.addon);
        if (record.core) restoreBackup(value.core, record.core);
      } catch (_restoreError) { /* retain the original failure; the files stay inspectable */ }
      throw error;
    } finally { for (const temporary of temps) if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  function restore(operationId) {
    if (isGameRunning()) throw new Error('Close WWE 2K25 before restoring loader files.');
    const value = paths();
    const entry = journal.list(100).find((item) => item.id === operationId && item.operation === 'enable-wwe2k25-cak-loader' && item.result === 'verified');
    if (!entry || path.resolve(entry.game).toLowerCase() !== value.game.toLowerCase()) throw new Error('The selected verified loader backup was not found for this game folder.');
    for (const item of [{ key: 'core', target: value.core, expected: manifest.coreSha256 }, { key: 'addon', target: value.addon, expected: manifest.addonSha256 }]) {
      const previous = entry[item.key];
      if (fs.existsSync(item.target) && sha256(item.target) !== previous.installedSha256) throw new Error(`Restore blocked: ${path.basename(item.target)} changed after Foundry enabled it.`);
      if (fs.existsSync(item.target)) fs.unlinkSync(item.target);
      if (previous && previous.existed) { if (!same(previous.path, previous.sha256)) throw new Error(`Restore blocked: saved ${path.basename(item.target)} backup changed.`); fs.renameSync(previous.path, item.target); }
    }
    const previousAddons = entry.addons;
    if (fs.existsSync(value.addons) && (!regular(value.addons) || sha256(value.addons) !== previousAddons.installedSha256)) throw new Error('Restore blocked: plugins/addons.txt changed after Foundry enabled it.');
    if (fs.existsSync(value.addons)) fs.unlinkSync(value.addons);
    if (previousAddons && previousAddons.existed) { if (!same(previousAddons.path, previousAddons.sha256)) throw new Error('Restore blocked: saved addons.txt backup changed.'); fs.renameSync(previousAddons.path, value.addons); }
    const operation = journal.record({ operation: 'restore-wwe2k25-cak-loader', timestamp: new Date().toISOString(), enableOperationId: entry.id, game: value.game, result: 'verified' });
    return { ok: true, operation, ...status() };
  }
  return { status, enable, restore };
}

module.exports = { createWwe2k25LoaderManager };
