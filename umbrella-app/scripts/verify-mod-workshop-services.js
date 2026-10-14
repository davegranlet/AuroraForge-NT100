const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { createGameInstallRegistry } = require('../electron/services/game-install-registry');
const { createOperationJournal } = require('../electron/services/operation-journal');
const { createCapabilityRegistry } = require('../electron/services/capability-registry');
const { createSecureLoaderManager } = require('../electron/services/secure-loader-manager');
const { createSecureLoaderReleaseService, assertSafeEntryName } = require('../electron/services/secure-loader-release');
const { createLoaderDiagnostics, parseDiagnostics } = require('../electron/services/loader-diagnostics');
const { buildCollisionReport } = require('../electron/services/cak-collision-service');
const { deriveArchiveKeyV99 } = require('../electron/cak-v99-key');

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-workshop-test-'));
let failures = 0;
function check(value, message) { if (value) console.log('OK:', message); else { console.error('FAIL:', message); failures += 1; } }
function hash(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase(); }

async function main() {
try {
  const gameRoot = path.join(temporaryRoot, 'WWE 2K26');
  const userData = path.join(temporaryRoot, 'user-data');
  fs.mkdirSync(gameRoot, { recursive: true });
  const exeBytes = Buffer.from('synthetic-supported-executable');
  const dllBytes = Buffer.from('synthetic-secure-loader');
  const oldBytes = Buffer.from('synthetic-previous-loader');
  fs.writeFileSync(path.join(gameRoot, 'WWE2K26_x64.exe'), exeBytes);
  fs.writeFileSync(path.join(gameRoot, 'dinput8.dll'), oldBytes);
  const source = path.join(temporaryRoot, 'dinput8.dll');
  fs.writeFileSync(source, dllBytes);
  const manifest = { loaderVersion: 'test', hostExecutable: 'WWE2K26_x64.exe', testedSteamBuildId: 'synthetic', gameExeSha256: hash(exeBytes), dllSha256: hash(dllBytes) };
  let running = false;
  const installs = createGameInstallRegistry(path.join(userData, 'aurora-workshop.json'));
  installs.set('wwe2k26', gameRoot);
  const journal = createOperationJournal(userData);
  const capabilities = createCapabilityRegistry({ installRegistry: installs, manifest, isGameRunning: () => running, cakHelperPath: () => '', directXTexPath: () => '' });
  const manager = createSecureLoaderManager({ installRegistry: installs, capabilityRegistry: capabilities, journal, manifest, isGameRunning: () => running });
  check(capabilities.summarize().game.supportedProfile, 'synthetic game profile is supported');
  const installed = manager.install(source);
  check(installed.result === 'verified' && hash(fs.readFileSync(path.join(gameRoot, 'dinput8.dll'))) === manifest.dllSha256, 'install is verified');
  check(fs.existsSync(installed.backup) && hash(fs.readFileSync(installed.backup)) === hash(oldBytes), 'previous DLL has an exact rollback backup');
  const rolledBack = manager.rollback(installed.id);
  check(rolledBack.result === 'verified' && hash(fs.readFileSync(path.join(gameRoot, 'dinput8.dll'))) === hash(oldBytes), 'rollback restores exact previous bytes');
  running = true;
  let blocked = false;
  try { manager.install(source); } catch (error) { blocked = /Close WWE 2K26/.test(error.message); }
  check(blocked, 'running game blocks installation');
  running = false;
  fs.writeFileSync(path.join(gameRoot, 'WWE2K26_x64.exe'), Buffer.from('unsupported'));
  blocked = false;
  try { manager.install(source); } catch (error) { blocked = /does not match/.test(error.message); }
  check(blocked, 'unsupported executable blocks installation');
  fs.writeFileSync(path.join(gameRoot, 'WWE2K26_x64.exe'), exeBytes);
  const badSource = path.join(temporaryRoot, 'bad', 'dinput8.dll');
  fs.mkdirSync(path.dirname(badSource), { recursive: true });
  fs.writeFileSync(badSource, Buffer.from('unapproved-loader'));
  blocked = false;
  try { manager.install(badSource); } catch (error) { blocked = /checksum is not on/.test(error.message); }
  check(blocked, 'unapproved DLL checksum blocks installation');
  const report = journal.redactedReport(capabilities.summarize());
  check(!report.includes(temporaryRoot) && report.includes('<local>'), 'diagnostic report redacts personal paths');
  const preload = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.js'), 'utf8');
  check(/installSecureDataCtrlLink: \(\) =>/.test(preload) && !/installSecureDataCtrlLink: \([^)]*[a-z]/i.test(preload), 'renderer cannot supply an install destination');
  check(['Found', 'Structurally valid', 'Built and round-trip verified', 'Mounted/registered', 'Confirmed in-game'].every((term) => capabilities.summarize().statusLanguage.includes(term)), 'shared status language is complete');

  const zipPath = path.join(temporaryRoot, 'Secure-DataCtrlLink-test.zip');
  const zipResult = cp.spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'helpers', 'create-test-zip.ps1'), '-SourcePath', source, '-DestinationPath', zipPath], { encoding: 'utf8', windowsHide: true });
  check(zipResult.status === 0 && fs.existsSync(zipPath), 'synthetic release ZIP was created');
  const releaseManifest = { ...manifest, releaseZipSha256: hash(fs.readFileSync(zipPath)), directDownloadUrl: 'https://github.com/example/release.zip' };
  const releaseService = createSecureLoaderReleaseService({ userDataPath: userData, manifest: releaseManifest, sha256: capabilities.sha256, helperPath: path.join(__dirname, '..', 'electron', 'helpers', 'secure-loader-zip.ps1') });
  const staged = releaseService.validateAndStage(zipPath);
  check(staged.dllSha256 === manifest.dllSha256 && fs.readFileSync(staged.dllPath).equals(dllBytes), 'reviewed ZIP stages only the verified DLL');
  check(releaseService.cleanupStagedDll(staged.dllPath) && !fs.existsSync(staged.dllPath), 'private staged DLL is removed after use');
  check(!releaseService.cleanupStagedDll(source) && fs.existsSync(source), 'cleanup never removes a user-selected DLL');
  let unsafeBlocked = false;
  try { assertSafeEntryName('../dinput8.dll'); } catch (_error) { unsafeBlocked = true; }
  check(unsafeBlocked, 'unsafe ZIP traversal entry is rejected');
  const wrongZipService = createSecureLoaderReleaseService({ userDataPath: userData, manifest: { ...releaseManifest, releaseZipSha256: '0'.repeat(64) }, sha256: capabilities.sha256, helperPath: path.join(__dirname, '..', 'electron', 'helpers', 'secure-loader-zip.ps1') });
  blocked = false;
  try { wrongZipService.validateAndStage(zipPath); } catch (error) { blocked = /ZIP checksum/.test(error.message); }
  check(blocked, 'unapproved ZIP checksum is rejected before extraction');
  const downloadTargetService = createSecureLoaderReleaseService({ userDataPath: userData, manifest: releaseManifest, sha256: capabilities.sha256, helperPath: path.join(__dirname, '..', 'electron', 'helpers', 'secure-loader-zip.ps1'), downloader: async (_url, destination) => fs.copyFileSync(zipPath, destination) });
  const downloaded = await downloadTargetService.downloadAndStage();
  check(downloaded.zipSha256 === releaseManifest.releaseZipSha256 && downloaded.dllSha256 === manifest.dllSha256, 'manifest-pinned download is ZIP- and DLL-verified');
  const currentPreload = fs.readFileSync(path.join(__dirname, '..', 'electron', 'preload.js'), 'utf8');
  check(/downloadSecureDataCtrlLink: \(\) =>/.test(currentPreload) && /chooseSecureDataCtrlLinkZip: \(\) =>/.test(currentPreload), 'renderer supplies neither download URL nor staging destination');

  const diagnosticLines = [
    '[2026-08-30 10:00:00] Starting custom-music-only runtime',
    '[2026-08-30 10:00:01] ERROR mounting old-session.cak (files=1, folders=1)',
    '[2026-08-31 10:00:00] Starting custom-music-only runtime',
    '[2026-08-31 10:00:01] Mount call accepted for visible.cak (files=2, folders=3)',
    '[2026-08-31 10:00:02] REJECTED CAK invalid.cak: bad magic',
    '[2026-08-31 10:00:03] ERROR mounting failed.cak (files=4, folders=5)',
    '[2026-08-31 10:00:04] Registered Custom_Music.pck (result=1, id=42)',
    '[2026-08-31 10:00:05] ERROR registering Custom_Bad.pck (result=0, id=0)',
    '[2026-08-31 10:00:06] SUCCESS: LoadBankMemoryCopy result=1, bank=0x8fd5129d, bytes=1041380',
    '[2026-08-31 10:00:07] ERROR: archive-phase signature does not match supported game build',
    "[2026-08-31 10:00:08] ERROR: timed out waiting for the game's archive-mount thread"
  ];
  const parsedDiagnostics = parseDiagnostics(diagnosticLines);
  check(parsedDiagnostics.summary.cakAccepted === 1 && parsedDiagnostics.summary.cakRejected === 1 && parsedDiagnostics.summary.cakFailed === 1, 'diagnostics isolate the latest session and count CAK outcomes');
  check(parsedDiagnostics.summary.packagesRegistered === 1 && parsedDiagnostics.summary.packagesFailed === 1 && parsedDiagnostics.summary.bankLoad === 'Mounted/registered', 'diagnostics separate package registration and bank-load state');
  check(parsedDiagnostics.summary.signatureMismatch && parsedDiagnostics.summary.startupTimeout && !parsedDiagnostics.rows.some((row) => row.subject === 'old-session.cak'), 'diagnostics classify signature/timeout failures and exclude older sessions');
  const syntheticLog = path.join(gameRoot, 'DataCtrlLink-MusicOnly.log');
  fs.writeFileSync(syntheticLog, diagnosticLines.join('\n') + '\n', 'utf8');
  const diagnosticService = createLoaderDiagnostics({ installRegistry: installs });
  const diagnosticResult = diagnosticService.read();
  check(diagnosticResult.found && diagnosticResult.raw.includes('visible.cak') && !Object.prototype.hasOwnProperty.call(diagnosticResult, 'path'), 'diagnostic IPC model returns bounded content without exposing a mutation path');

  const collisionSessions = [
    { archiveName: 'zzz-fix.cak', files: [{ name: 'Characters/Test/face.dds', nameResolved: true, hash: '11' }, { name: 'UI/OnlyFix.dds', nameResolved: true, hash: '22' }, { nameResolved: false, hash: '99' }] },
    { archiveName: 'Base.cak', files: [{ name: 'characters/test/face.dds', nameResolved: true, hash: '11' }, { name: 'Arena/base.dds', nameResolved: true, hash: '33' }, { nameResolved: false, hash: '99' }] },
    { archiveName: 'middle.cak', files: [{ name: 'arena/base.dds', nameResolved: true, hash: '33' }] }
  ];
  const collisionReport = buildCollisionReport(collisionSessions);
  check(collisionReport.archives.map((item) => item.archive).join(',') === 'Base.cak,middle.cak,zzz-fix.cak', 'CAK order uses deterministic case-sensitive lexical sorting');
  check(collisionReport.totals.exactCollisions === 2 && collisionReport.totals.unresolvedHashCollisions === 1, 'exact path collisions remain separate from unresolved hash overlaps');
  const faceCollision = collisionReport.collisions.find((item) => item.virtualPath.toLowerCase() === 'characters/test/face.dds');
  check(faceCollision && faceCollision.expectedWinner === 'zzz-fix.cak' && /Inference/.test(faceCollision.winnerConfidence), 'last provider is labeled as an inferred winner');
  check(JSON.stringify(buildCollisionReport([...collisionSessions].reverse())) === JSON.stringify(collisionReport), 'collision report is deterministic regardless of input enumeration order');
  const validKeyName = 'SMashZ_Blood.cak';
  const keyReport = buildCollisionReport([{ archiveName: validKeyName, key: (deriveArchiveKeyV99(validKeyName) + 1) >>> 0, files: [] }]);
  check(keyReport.archives[0].filenameKey.startsWith('Mismatch') && keyReport.warnings.some((warning) => /renamed/.test(warning)), 'filename-derived CAK key mismatch is caught before staging advice');
} finally { fs.rmSync(temporaryRoot, { recursive: true, force: true }); }
if (failures) process.exitCode = 1;
}

main().catch((error) => { console.error('FAIL:', error.stack || error.message); process.exitCode = 1; });
