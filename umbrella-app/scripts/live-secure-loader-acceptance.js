const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { createGameInstallRegistry } = require('../electron/services/game-install-registry');
const { createOperationJournal } = require('../electron/services/operation-journal');
const { createCapabilityRegistry } = require('../electron/services/capability-registry');
const { createSecureLoaderManager } = require('../electron/services/secure-loader-manager');
const { createSecureLoaderReleaseService } = require('../electron/services/secure-loader-release');
const manifest = require('../app/data/compatibility/secure-datacrtllink.json');

function fail(message) { throw new Error(message); }
function gameRunning() {
  const result = cp.spawnSync('tasklist.exe', ['/FI', 'IMAGENAME eq WWE2K26_x64.exe', '/NH', '/FO', 'CSV'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return result.status !== 0 || /WWE2K26_x64\.exe/i.test(String(result.stdout || ''));
}

async function main() {
  if (process.platform !== 'win32') fail('The live acceptance test is Windows-only.');
  const gameRoot = path.resolve(process.argv[2] || '');
  const userDataPath = path.resolve(process.argv[3] || '');
  if (!gameRoot || !userDataPath) fail('Usage: node live-secure-loader-acceptance.js <game-root> <aurora-user-data>');
  if (gameRunning()) fail('Close WWE 2K26 before running the live acceptance test.');

  const registry = createGameInstallRegistry(path.join(userDataPath, 'aurora-workshop.json'));
  registry.set('wwe2k26', gameRoot);
  const journal = createOperationJournal(userDataPath);
  const capabilities = createCapabilityRegistry({ installRegistry: registry, manifest, isGameRunning: gameRunning, cakHelperPath: () => '', directXTexPath: () => '' });
  const loader = createSecureLoaderManager({ installRegistry: registry, capabilityRegistry: capabilities, journal, manifest, isGameRunning: gameRunning });
  const releases = createSecureLoaderReleaseService({ userDataPath, manifest, sha256: capabilities.sha256, helperPath: path.join(__dirname, '..', 'electron', 'helpers', 'secure-loader-zip.ps1') });
  const target = path.join(gameRoot, 'dinput8.dll');
  const before = capabilities.sha256(target);
  const game = capabilities.summarize().game;
  if (!game.supportedProfile) fail(`Executable profile is unsupported: ${game.executableSha256 || 'not found'}`);
  console.log(JSON.stringify({ step: 'preflight', gameRunning: false, executableSha256: game.executableSha256, originalDllSha256: before }));

  let staged = null; let installOperation = null; let rolledBack = false;
  try {
    staged = await releases.downloadAndStage();
    console.log(JSON.stringify({ step: 'release-verified', zipSha256: staged.zipSha256, dllSha256: staged.dllSha256, entryCount: staged.entryCount }));
    installOperation = loader.install(staged.dllPath);
    const installed = capabilities.sha256(target);
    if (installed !== manifest.dllSha256) fail(`Installed hash mismatch: ${installed}`);
    if (!installOperation.backup || !fs.existsSync(installOperation.backup)) fail('Verified install did not produce a recoverable backup.');
    const backupHash = capabilities.sha256(installOperation.backup);
    if (backupHash !== before) fail(`Backup hash mismatch: ${backupHash}`);
    console.log(JSON.stringify({ step: 'install-verified', operationId: installOperation.id, installedSha256: installed, backupSha256: backupHash }));

    const rollbackOperation = loader.rollback(installOperation.id);
    rolledBack = true;
    const restored = capabilities.sha256(target);
    if (restored !== before) fail(`Restored hash mismatch: ${restored}`);
    console.log(JSON.stringify({ step: 'rollback-verified', operationId: rollbackOperation.id, restoredSha256: restored }));
  } finally {
    if (staged) releases.cleanupStagedDll(staged.dllPath);
    if (installOperation && !rolledBack) {
      try {
        const rollbackOperation = loader.rollback(installOperation.id);
        console.error(JSON.stringify({ step: 'emergency-rollback-verified', operationId: rollbackOperation.id, restoredSha256: capabilities.sha256(target) }));
      } catch (error) {
        console.error(JSON.stringify({ step: 'emergency-rollback-failed', backup: installOperation.backup, error: error.message }));
      }
    }
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
