const fs = require('fs'); const os = require('os'); const path = require('path');
const { createGameInstallRegistry } = require('../electron/services/game-install-registry');
const { createOperationJournal } = require('../electron/services/operation-journal');
const { createModManifestManager } = require('../electron/services/mod-manifest-manager');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-manifest-')); let failed = false;
function check(value, text) { if (!value) { console.error('FAIL:', text); failed = true; } else console.log('OK:', text); }
try {
  const game = path.join(root, 'game'); const data = path.join(root, 'data'); fs.mkdirSync(path.join(game, 'mods'), { recursive: true }); fs.mkdirSync(path.join(game, 'sound'), { recursive: true });
  fs.writeFileSync(path.join(game, 'mods', 'a.cak'), 'a'); fs.writeFileSync(path.join(game, 'mods', 'z.cak'), 'z'); fs.writeFileSync(path.join(game, 'sound', 'Custom_A.pck'), 'p'); fs.writeFileSync(path.join(game, 'mods', 'ignored.asi'), 'x');
  const registry = createGameInstallRegistry(path.join(data, 'config.json')); registry.set('wwe2k26', game); const journal = createOperationJournal(data); let running = false;
  const manager = createModManifestManager({ installRegistry: registry, journal, isGameRunning: () => running });
  check(manager.read().caks.length === 2 && manager.read().packages.length === 1, 'only eligible direct-child files are listed');
  const saved = manager.save({ cakOrder: ['z.cak'], packageOrder: ['Custom_A.pck'] }); const parsed = JSON.parse(fs.readFileSync(path.join(game, 'mods', 'manifest.json'), 'utf8'));
  check(saved.operation.result === 'verified' && parsed.cakOrder.join(',') === 'z.cak', 'enabled files and explicit order are journaled and saved');
  let blocked = false; try { manager.save({ cakOrder: ['ignored.asi'], packageOrder: [] }); } catch (_error) { blocked = true; } check(blocked, 'renderer cannot add an unavailable plugin extension');
  running = true; blocked = false; try { manager.save({ cakOrder: [], packageOrder: [] }); } catch (_error) { blocked = true; } check(blocked, 'running game blocks manifest mutation');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
if (failed) process.exitCode = 1;
