'use strict';

const fs = require('fs');
const path = require('path');

const MAX_CAKS = 32;

function regularCaks(modsRoot) {
  if (!fs.existsSync(modsRoot)) return [];
  return fs.readdirSync(modsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.toLowerCase().endsWith('.cak'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

function createWwe2k25ModManager({ gameFolder, isGameRunning, openArchive, journal }) {
  function roots() {
    const game = path.resolve(String(gameFolder() || ''));
    if (!game || !fs.existsSync(game) || !fs.statSync(game).isDirectory()) throw new Error('Choose the WWE 2K25 game folder in Foundry first.');
    return { game, mods: path.join(game, 'mods'), manifest: path.join(game, 'mods', 'manifest.json') };
  }

  function readManifest(manifestPath) {
    if (!fs.existsSync(manifestPath)) return { present: false, order: [] };
    const stat = fs.lstatSync(manifestPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024) throw new Error('mods/manifest.json is not a safe regular file.');
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cakOrder)) throw new Error('mods/manifest.json has an unsupported format.');
    return { present: true, order: parsed.cakOrder };
  }

  function status() {
    const value = roots();
    const available = regularCaks(value.mods);
    const manifest = readManifest(value.manifest);
    const byKey = new Map(available.map((name) => [name.toLowerCase(), name]));
    const enabled = manifest.order.map((name) => byKey.get(String(name).toLowerCase())).filter(Boolean);
    const rows = available.map((name) => ({ name, enabled: enabled.some((item) => item.toLowerCase() === name.toLowerCase()), order: enabled.findIndex((item) => item.toLowerCase() === name.toLowerCase()) }));
    rows.sort((left, right) => {
      if (left.enabled && right.enabled) return left.order - right.order;
      if (left.enabled) return -1;
      if (right.enabled) return 1;
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });
    return { game: value.game, manifestPresent: manifest.present, caks: rows };
  }

  function sync(request) {
    if (isGameRunning()) throw new Error('Close WWE 2K25 before changing enabled mods.');
    if (!request || !Array.isArray(request.cakOrder) || Object.keys(request).some((key) => key !== 'cakOrder')) throw new Error('The enabled-mod selection is invalid.');
    const value = roots();
    const available = regularCaks(value.mods);
    if (available.length > MAX_CAKS || request.cakOrder.length > MAX_CAKS) throw new Error(`WWE 2K25 supports at most ${MAX_CAKS} managed CAKs.`);
    const byKey = new Map(available.map((name) => [name.toLowerCase(), name]));
    const seen = new Set();
    const selected = request.cakOrder.map((name) => {
      const key = String(name || '').toLowerCase();
      if (!byKey.has(key) || seen.has(key)) throw new Error('The selected CAK list contains an unavailable or duplicate file. Refresh the list and try again.');
      seen.add(key); return byKey.get(key);
    });

    const owners = new Map();
    for (const name of selected) {
      const session = openArchive(path.join(value.mods, name));
      for (const file of session.files || []) {
        const virtualPath = String(file.name || '').replace(/\\/g, '/');
        if (!virtualPath) continue;
        const key = virtualPath.toLowerCase();
        // An archive can legitimately carry a duplicate catalog record. Only a
        // replacement owned by a *different* selected CAK is a mod conflict.
        if (owners.has(key) && owners.get(key).archive !== name) throw new Error(`Cannot enable these CAKs: “${name}” and “${owners.get(key).archive}” both replace “${owners.get(key).path}”.`);
        owners.set(key, { archive: name, path: virtualPath });
      }
    }

    fs.mkdirSync(value.mods, { recursive: true });
    const timestamp = new Date().toISOString();
    const rollbackFolder = path.join(journal.rollbackRoot, timestamp.replace(/[:.]/g, '-'));
    let backup = '';
    if (fs.existsSync(value.manifest)) {
      fs.mkdirSync(rollbackFolder, { recursive: true });
      backup = path.join(rollbackFolder, 'manifest.json');
      fs.copyFileSync(value.manifest, backup, fs.constants.COPYFILE_EXCL);
    }
    const temporary = value.manifest + `.aurora-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({ version: 1, cakOrder: selected, packageOrder: [] }, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    try { if (fs.existsSync(value.manifest)) fs.unlinkSync(value.manifest); fs.renameSync(temporary, value.manifest); }
    catch (error) { if (backup && !fs.existsSync(value.manifest)) fs.copyFileSync(backup, value.manifest); throw error; }
    journal.record({ operation: 'sync-wwe2k25-cak-manifest', timestamp, target: value.manifest, backup, result: 'verified' });
    return { ok: true, ...status(), enabled: selected.length };
  }
  return { status, sync };
}

module.exports = { createWwe2k25ModManager };
