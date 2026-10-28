const fs = require('fs');
const path = require('path');

function assertRegularNonReparse(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} was not found.`);
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular file, not a link or reparse point.`);
}

function assertSafeGameRoot(root) {
  if (!root || !fs.existsSync(root)) throw new Error('Configure the WWE 2K26 game folder first.');
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('The game folder must be a regular local directory.');
  return path.resolve(root);
}

function createSecureLoaderManager({ installRegistry, capabilityRegistry, journal, manifest, isGameRunning }) {
  function assertSupportedGame() {
    const root = assertSafeGameRoot((installRegistry.getAll().wwe2k26 || {}).root);
    if (isGameRunning()) throw new Error('Close WWE 2K26 before installing or rolling back Secure DataCtrlLink.');
    const executable = path.join(root, manifest.hostExecutable);
    assertRegularNonReparse(executable, manifest.hostExecutable);
    const hash = capabilityRegistry.sha256(executable);
    if (hash !== manifest.gameExeSha256) throw new Error('Install blocked: this WWE 2K26 executable does not match the reviewed Secure DataCtrlLink compatibility profile. There is no force-install option.');
    return root;
  }

  function install(sourcePath) {
    const root = assertSupportedGame();
    const source = path.resolve(String(sourcePath || ''));
    assertRegularNonReparse(source, 'Selected Secure DataCtrlLink DLL');
    if (path.basename(source).toLowerCase() !== 'dinput8.dll') throw new Error('Select the release file named dinput8.dll.');
    const sourceSha256 = capabilityRegistry.sha256(source);
    if (sourceSha256 !== manifest.dllSha256) throw new Error('Install blocked: the selected DLL checksum is not on the bundled allowlist.');

    const target = path.join(root, 'dinput8.dll');
    const operationTime = new Date().toISOString();
    const rollbackFolder = path.join(journal.rollbackRoot, operationTime.replace(/[:.]/g, '-'));
    const temporary = path.join(root, `.aurora-secure-datacrtllink-${process.pid}-${Date.now()}.tmp`);
    let backup = '';
    let previousSha256 = '';
    fs.copyFileSync(source, temporary, fs.constants.COPYFILE_EXCL);
    try {
      if (capabilityRegistry.sha256(temporary) !== manifest.dllSha256) throw new Error('Temporary copy verification failed. The installed file was not changed.');
      if (fs.existsSync(target)) {
        assertRegularNonReparse(target, 'Existing dinput8.dll');
        previousSha256 = capabilityRegistry.sha256(target);
        fs.mkdirSync(rollbackFolder, { recursive: true });
        backup = path.join(rollbackFolder, 'dinput8.dll');
        fs.renameSync(target, backup);
      }
      try { fs.renameSync(temporary, target); }
      catch (error) { if (backup && fs.existsSync(backup) && !fs.existsSync(target)) fs.renameSync(backup, target); throw error; }
      const installedSha256 = capabilityRegistry.sha256(target);
      if (installedSha256 !== manifest.dllSha256) throw new Error('Installed file verification failed. Use rollback before launching the game.');
      return journal.record({ operation: 'install-secure-datacrtllink', timestamp: operationTime, sourceSha256, target, backup, previousSha256, installedSha256, result: 'verified' });
    } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }

  function rollback(operationId) {
    const root = assertSupportedGame();
    const entry = journal.list(100).find((item) => item.id === operationId && item.operation === 'install-secure-datacrtllink' && item.result === 'verified');
    if (!entry) throw new Error('The selected verified install journal entry was not found.');
    const target = path.join(root, 'dinput8.dll');
    if (path.resolve(entry.target).toLowerCase() !== path.resolve(target).toLowerCase()) throw new Error('Rollback target does not match the configured game folder.');
    if (entry.backup) {
      assertRegularNonReparse(entry.backup, 'Rollback backup');
      if (capabilityRegistry.sha256(entry.backup) !== entry.previousSha256) throw new Error('Rollback blocked: backup checksum no longer matches the journal.');
    }
    if (fs.existsSync(target)) {
      assertRegularNonReparse(target, 'Installed dinput8.dll');
      if (capabilityRegistry.sha256(target) !== entry.installedSha256) throw new Error('Rollback blocked: installed dinput8.dll changed after this install.');
      fs.unlinkSync(target);
    }
    if (entry.backup) fs.renameSync(entry.backup, target);
    const restoredSha256 = fs.existsSync(target) ? capabilityRegistry.sha256(target) : '';
    if (restoredSha256 !== (entry.previousSha256 || '')) throw new Error('Rollback verification failed.');
    return journal.record({ operation: 'rollback-secure-datacrtllink', installOperationId: entry.id, target, backup: entry.backup, restoredSha256, result: 'verified' });
  }

  return { install, rollback };
}

module.exports = { createSecureLoaderManager };
