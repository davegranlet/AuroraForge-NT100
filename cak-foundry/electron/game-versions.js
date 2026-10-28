'use strict';
// Version registry: single source of truth for the WWE titles this toolchain
// covers (2K19, 2K20, 2K25, 2K26), what each title is used for, and how a
// loader CAK is baked for it.  Consumers: the bake CLI, the converters, the
// apps.  Add a version here once, not in five tools.
const fs = require('fs');
const path = require('path');

const GAME_VERSIONS = Object.freeze({
  '2k19': {
    id: '2k19',
    label: 'WWE 2K19',
    folders: ['WWE 2K19', 'WWE2K19'],
    exe: /^WWE2K19.*\.exe$/i,
    roles: { animationSource: true, bakeTarget: false },
    cak: null,
    loader: null,
    notes: 'Animation source (victory/entrance motion bodies via extract-2k19-animations).',
  },
  '2k20': {
    id: '2k20',
    label: 'WWE 2K20',
    folders: ['WWE 2K20', 'WWE2K20'],
    exe: /^WWE2K20.*\.exe$/i,
    roles: { animationSource: true, bakeTarget: false },
    cak: null,
    loader: null,
    notes: 'Animation source / package side (2K19-to-2K20 victory package builder).',
  },
  '2k25': {
    id: '2k25',
    label: 'WWE 2K25',
    folders: ['WWE 2K25', 'WWE2K25'],
    exe: /^WWE2K25.*\.exe$/i,
    roles: { animationSource: false, bakeTarget: true },
    cak: { fdirVersion: '9.3', engine: 'native' },
    loader: 'Secure-DataCtrlLink-WWE2K25',
    notes: 'CAK target: native FTribTool FDIR 9.3 bake.',
  },
  '2k26': {
    id: '2k26',
    label: 'WWE 2K26',
    folders: ['WWE 2K26', 'WWE2K26'],
    exe: /^WWE2K26.*\.exe$/i,
    roles: { animationSource: false, bakeTarget: true },
    cak: { fdirVersion: '9.9', engine: 'js' },
    loader: 'Secure-DataCtrlLink-WWE2K26',
    notes: 'CAK target: JS repackager FDIR 9.9 bake.',
  },
});

const SUPPORTED = Object.keys(GAME_VERSIONS);

function normalizeGame(value) {
  if (!value) return null;
  const match = String(value).toLowerCase().replace(/[^0-9a-z]/g, '').match(/^(?:wwe)?2k(19|20|25|26)$/);
  return match ? `2k${match[1]}` : null;
}

function byId(value) {
  const id = normalizeGame(value);
  return id ? GAME_VERSIONS[id] : null;
}

function bakeSettings(value) {
  const game = byId(value);
  return game && game.cak ? { game: game.id, label: game.label, ...game.cak } : null;
}

function steamRoots() {
  const roots = new Set();
  for (const drive of ['C:', 'D:', 'E:', 'F:']) roots.add(`${drive}\\SteamLibrary\\steamapps\\common`);
  roots.add('C:\\Program Files (x86)\\Steam\\steamapps\\common');
  roots.add('D:\\Program Files (x86)\\Steam\\steamapps\\common');
  return [...roots];
}

function findInstall(value, roots = steamRoots()) {
  const game = byId(value);
  if (!game) return null;
  for (const root of roots) {
    for (const folder of game.folders) {
      const candidate = path.join(root, folder);
      try {
        if (!fs.existsSync(candidate)) continue;
        const exe = fs.readdirSync(candidate).find((name) => game.exe.test(name));
        if (exe) return { id: game.id, label: game.label, root: candidate, exe: path.join(candidate, exe) };
      } catch (_error) { /* keep scanning */ }
    }
  }
  return null;
}

function detectInstalls(roots = steamRoots()) {
  const found = {};
  for (const id of SUPPORTED) {
    const hit = findInstall(id, roots);
    if (hit) found[id] = hit;
  }
  return found;
}

module.exports = { GAME_VERSIONS, SUPPORTED, normalizeGame, byId, bakeSettings, steamRoots, findInstall, detectInstalls };
