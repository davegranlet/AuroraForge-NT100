const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try { let read; do { read = fs.readSync(fd, buffer, 0, buffer.length, null); if (read) hash.update(buffer.subarray(0, read)); } while (read); }
  finally { fs.closeSync(fd); }
  return hash.digest('hex').toUpperCase();
}

function regularFile(filePath) {
  try { const stat = fs.lstatSync(filePath); return stat.isFile() && !stat.isSymbolicLink(); } catch (_error) { return false; }
}

function writableDirectory(directory) {
  try { fs.accessSync(directory, fs.constants.W_OK); return true; } catch (_error) { return false; }
}

function createCapabilityRegistry({ installRegistry, manifest, isGameRunning, cakHelperPath, directXTexPath }) {
  function summarize() {
    const install = installRegistry.getAll().wwe2k26;
    const root = install ? install.root : '';
    const executable = root ? path.join(root, 'WWE2K26_x64.exe') : '';
    const executableFound = regularFile(executable);
    const executableSha256 = executableFound ? sha256(executable) : '';
    const supported = executableSha256 === manifest.gameExeSha256;
    const loaderPath = root ? path.join(root, 'dinput8.dll') : '';
    const loaderFound = regularFile(loaderPath);
    const loaderSha256 = loaderFound ? sha256(loaderPath) : '';
    const loaderInstalled = loaderSha256 === manifest.dllSha256;
    const mods = root ? path.join(root, 'mods') : '';
    const sound = root ? path.join(root, 'sound') : '';
    const gameRunning = Boolean(isGameRunning());
    return {
      statusLanguage: ['Found', 'Structurally valid', 'Built and round-trip verified', 'Mounted/registered', 'Confirmed in-game'],
      game: { configured: Boolean(root), root, found: executableFound, running: gameRunning, executableSha256, supportedProfile: supported, supportedBuildId: manifest.testedSteamBuildId },
      secureDataCtrlLink: { status: loaderInstalled && supported ? 'Ready' : (supported ? 'Needs setup' : 'Needs setup'), installed: loaderInstalled, found: loaderFound, version: loaderInstalled ? manifest.loaderVersion : '', sha256: loaderSha256, expectedSha256: manifest.dllSha256 },
      folders: { modsWritable: Boolean(mods && fs.existsSync(mods) && writableDirectory(mods)), soundWritable: Boolean(sound && fs.existsSync(sound) && writableDirectory(sound)) },
      dependencies: { oodleAvailable: regularFile(root ? path.join(root, 'oo2core_9_win64.dll') : ''), cakHelperAvailable: regularFile(cakHelperPath()), directXTexAvailable: regularFile(directXTexPath()) },
      features: {
        gameAndLoaderSetup: { state: loaderInstalled && supported ? 'Ready' : 'Needs setup', warning: supported ? '' : 'The selected executable does not match the reviewed Secure DataCtrlLink profile.' },
        cakWorkshop: { state: 'Experimental', warning: 'Existing archive tools remain available; collision planning is not yet integrated.' },
        customMusicStudio: { state: 'Research only', warning: 'Package authoring is not proven.' },
        myGmWorkshop: { state: 'Research only', warning: 'Configurable generation is not implemented.' },
        entranceConversionLab: { state: 'Research only', warning: 'Inspection and conversion are not implemented.' },
        lightingPyroTimeline: { state: 'Research only', warning: 'Timeline inspection is not implemented.' }
      }
    };
  }
  return { summarize, sha256, regularFile };
}

module.exports = { createCapabilityRegistry, sha256, regularFile };
