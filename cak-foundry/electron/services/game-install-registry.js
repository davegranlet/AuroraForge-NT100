const fs = require('fs');
const path = require('path');

const GAME_IDS = Object.freeze(['wwe2k26', 'wwe2k19']);

function readJson(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_error) { return {}; }
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = filePath + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(temporary, filePath);
}

function createGameInstallRegistry(configPath) {
  function getAll() {
    const config = readJson(configPath);
    const games = {};
    for (const id of GAME_IDS) {
      const record = config.games && config.games[id];
      if (record && typeof record.root === 'string' && record.root.trim()) {
        games[id] = {
          root: path.resolve(record.root.trim()),
          ...(typeof record.lastVerifiedExeSha256 === 'string' ? { lastVerifiedExeSha256: record.lastVerifiedExeSha256 } : {})
        };
      }
    }
    return games;
  }

  function set(gameId, root, details = {}) {
    if (!GAME_IDS.includes(gameId)) throw new Error('Unknown game identifier.');
    const resolved = path.resolve(String(root || ''));
    if (!resolved || !fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) throw new Error('The selected game folder is unavailable.');
    const config = readJson(configPath);
    config.games = config.games && typeof config.games === 'object' && !Array.isArray(config.games) ? config.games : {};
    config.games[gameId] = { root: resolved };
    if (details.lastVerifiedExeSha256) config.games[gameId].lastVerifiedExeSha256 = String(details.lastVerifiedExeSha256).toUpperCase();
    atomicWriteJson(configPath, config);
    return config.games[gameId];
  }

  return { getAll, set };
}

module.exports = { GAME_IDS, createGameInstallRegistry };
