const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_CAKS = 32;
const MAX_PACKAGES = 16;
function sha256(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase(); }
function regularFiles(root, predicate) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.isSymbolicLink() && predicate(entry.name)).map((entry) => entry.name).sort();
}
function validateOrder(values, available, limit, label) {
  if (!Array.isArray(values) || values.length > limit) throw new Error(`${label} order is invalid or exceeds its limit.`);
  const allowed = new Map(available.map((name) => [name.toLowerCase(), name])); const seen = new Set();
  return values.map((value) => {
    if (typeof value !== 'string' || !allowed.has(value.toLowerCase())) throw new Error(`${label} contains a file that is not an available regular direct-child entry.`);
    const key = value.toLowerCase(); if (seen.has(key)) throw new Error(`${label} contains a duplicate entry.`); seen.add(key); return allowed.get(key);
  });
}

function createModManifestManager({ installRegistry, journal, isGameRunning }) {
  function roots() {
    const install = installRegistry.getAll().wwe2k26; if (!install) throw new Error('Choose the WWE 2K26 folder first.');
    return { game: install.root, mods: path.join(install.root, 'mods'), sound: path.join(install.root, 'sound'), manifest: path.join(install.root, 'mods', 'manifest.json') };
  }
  function available() { const value = roots(); return { ...value, caks: regularFiles(value.mods, (name) => name.toLowerCase().endsWith('.cak')).slice(0, MAX_CAKS + 1), packages: regularFiles(value.sound, (name) => name.toLowerCase().startsWith('custom') && name.toLowerCase().endsWith('.pck')).slice(0, MAX_PACKAGES + 1) }; }
  function read() {
    const value = available(); let manifest = null; let error = '';
    if (fs.existsSync(value.manifest)) {
      try { const stat = fs.lstatSync(value.manifest); if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 64 * 1024) throw new Error('Manifest is linked, not regular, or too large.'); manifest = JSON.parse(fs.readFileSync(value.manifest, 'utf8')); }
      catch (caught) { error = caught.message; }
    }
    const cakOrder = manifest && manifest.version === 1 && Array.isArray(manifest.cakOrder) ? manifest.cakOrder : value.caks;
    const packageOrder = manifest && manifest.version === 1 && Array.isArray(manifest.packageOrder) ? manifest.packageOrder : value.packages;
    return { present: fs.existsSync(value.manifest), valid: !error, error, caks: value.caks.map((name) => ({ name, enabled: cakOrder.some((item) => String(item).toLowerCase() === name.toLowerCase()), order: cakOrder.findIndex((item) => String(item).toLowerCase() === name.toLowerCase()) })), packages: value.packages.map((name) => ({ name, enabled: packageOrder.some((item) => String(item).toLowerCase() === name.toLowerCase()), order: packageOrder.findIndex((item) => String(item).toLowerCase() === name.toLowerCase()) })) };
  }
  function save(request) {
    if (isGameRunning()) throw new Error('Close WWE 2K26 before changing the mod manifest.');
    if (!request || Object.keys(request).some((key) => !['cakOrder', 'packageOrder'].includes(key))) throw new Error('Manifest request shape is invalid.');
    const value = available(); if (value.caks.length > MAX_CAKS || value.packages.length > MAX_PACKAGES) throw new Error('Available files exceed Secure DataCtrlLink manifest limits.');
    const data = { version: 1, cakOrder: validateOrder(request.cakOrder, value.caks, MAX_CAKS, 'CAK'), packageOrder: validateOrder(request.packageOrder, value.packages, MAX_PACKAGES, 'Package') };
    fs.mkdirSync(value.mods, { recursive: true });
    const timestamp = new Date().toISOString(); const rollbackFolder = path.join(journal.rollbackRoot, timestamp.replace(/[:.]/g, '-')); let backup = ''; let previousSha256 = '';
    if (fs.existsSync(value.manifest)) { const stat = fs.lstatSync(value.manifest); if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Existing manifest is not a regular file.'); fs.mkdirSync(rollbackFolder, { recursive: true }); backup = path.join(rollbackFolder, 'manifest.json'); fs.copyFileSync(value.manifest, backup, fs.constants.COPYFILE_EXCL); previousSha256 = sha256(backup); }
    const temporary = value.manifest + `.aurora-${process.pid}-${Date.now()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    try { if (fs.existsSync(value.manifest)) fs.unlinkSync(value.manifest); fs.renameSync(temporary, value.manifest); }
    catch (error) { if (backup && !fs.existsSync(value.manifest)) fs.copyFileSync(backup, value.manifest); throw error; }
    const installedSha256 = sha256(value.manifest);
    const operation = journal.record({ operation: 'save-mod-manifest', timestamp, target: value.manifest, backup, previousSha256, installedSha256, result: 'verified' });
    return { ok: true, operation, manifest: read() };
  }
  return { read, save };
}
module.exports = { createModManifestManager, validateOrder };
