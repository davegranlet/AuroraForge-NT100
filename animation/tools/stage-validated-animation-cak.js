'use strict';

// Transactional staging for an already baked and offline-validated WWE 2K26
// animation CAK. It copies the current slot to a verified rollback, replaces
// only that slot, and verifies all other CAKs plus the manifest stayed fixed.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function ensureNoGameProcess(processName) {
  if (process.platform !== 'win32') throw new Error('Staging requires Windows process verification.');
  const output = execFileSync('tasklist', ['/FI', `IMAGENAME eq ${processName}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
  if (output.toLowerCase().includes(processName.toLowerCase())) throw new Error(`${processName} is running; refusing to replace the active CAK.`);
}

function stageValidatedAnimationCak(options) {
  const candidate = path.resolve(options.candidate || '');
  const active = path.resolve(options.active || '');
  const rollback = path.resolve(options.rollback || '');
  const receipt = path.resolve(options.receipt || '');
  const expectedCandidate = String(options.expectedCandidateSha256 || '').toUpperCase();
  const expectedActive = String(options.expectedActiveSha256 || '').toUpperCase();
  const processName = options.processName || 'WWE2K26_x64.exe';
  if (![candidate, active, rollback, receipt].every(Boolean) || !/^[A-F0-9]{64}$/.test(expectedCandidate) || !/^[A-F0-9]{64}$/.test(expectedActive)) {
    throw new Error('candidate, active, rollback, receipt, and both expected SHA-256 values are required.');
  }
  if (path.basename(candidate).toLowerCase() !== path.basename(active).toLowerCase()) throw new Error('Candidate and active CAK basenames must match; the basename participates in archive key derivation.');
  if (!fs.existsSync(candidate) || !fs.existsSync(active)) throw new Error('Candidate and active CAK must both exist.');
  if (fs.existsSync(rollback) || fs.existsSync(receipt)) throw new Error('Rollback or receipt path already exists; refusing to overwrite evidence.');
  if (options.processCheck) options.processCheck(processName); else ensureNoGameProcess(processName);
  const candidateHash = sha256(candidate);
  const activeHash = sha256(active);
  if (candidateHash !== expectedCandidate) throw new Error(`Candidate SHA-256 mismatch: expected ${expectedCandidate}, found ${candidateHash}.`);
  if (activeHash !== expectedActive) throw new Error(`Active SHA-256 mismatch: expected ${expectedActive}, found ${activeHash}.`);

  const modsRoot = path.resolve(options.modsRoot || path.dirname(active));
  const manifest = path.join(modsRoot, 'manifest.json');
  const manifestHash = fs.existsSync(manifest) ? sha256(manifest) : null;
  const otherCaks = fs.readdirSync(modsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.cak') && path.resolve(modsRoot, entry.name) !== active)
    .map((entry) => ({ path: path.join(modsRoot, entry.name), sha256: sha256(path.join(modsRoot, entry.name)) }));

  fs.mkdirSync(path.dirname(rollback), { recursive: true });
  fs.mkdirSync(path.dirname(receipt), { recursive: true });
  fs.copyFileSync(active, rollback, fs.constants.COPYFILE_EXCL);
  if (sha256(rollback) !== activeHash) throw new Error('Rollback copy did not verify; active CAK was left unchanged.');
  try {
    fs.copyFileSync(candidate, active);
    if (sha256(active) !== candidateHash) throw new Error('Staged CAK hash mismatch.');
    if (manifestHash !== (fs.existsSync(manifest) ? sha256(manifest) : null)) throw new Error('Manifest changed during staging.');
    for (const item of otherCaks) if (sha256(item.path) !== item.sha256) throw new Error(`Another CAK changed during staging: ${item.path}`);
    const result = {
      schema: 'aurora-forge/staged-animation-cak/v1',
      stagedAt: new Date().toISOString(), candidate, active, rollback, receipt,
      candidateSha256: candidateHash, rollbackSha256: activeHash,
      manifestSha256: manifestHash, otherCaksUnchanged: otherCaks,
      gameProcessChecked: processName,
    };
    fs.writeFileSync(receipt, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    return result;
  } catch (error) {
    fs.copyFileSync(rollback, active);
    if (sha256(active) !== activeHash) throw new Error(`Staging failed (${error.message}) and automatic rollback verification failed.`);
    throw error;
  }
}

module.exports = { sha256, stageValidatedAnimationCak };

if (require.main === module) {
  const value = (name) => { const i = process.argv.indexOf(name); return i < 0 ? '' : process.argv[i + 1]; };
  try {
    console.log(JSON.stringify(stageValidatedAnimationCak({
      candidate: value('--candidate'), active: value('--active'), rollback: value('--rollback'), receipt: value('--receipt'),
      expectedCandidateSha256: value('--candidate-sha256'), expectedActiveSha256: value('--active-sha256'), modsRoot: value('--mods-root'),
    }), null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
