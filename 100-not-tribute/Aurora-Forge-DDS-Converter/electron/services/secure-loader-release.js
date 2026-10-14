const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const https = require('https');

const MAX_ZIP_BYTES = 128 * 1024 * 1024;
const MAX_ENTRY_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 128;
const DOWNLOAD_HOSTS = new Set(['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);

function assertSafeEntryName(name) {
  const value = String(name || '').replace(/\\/g, '/');
  if (!value || value.startsWith('/') || /^[A-Za-z]:/.test(value) || value.split('/').some((part) => part === '..')) throw new Error('Release ZIP contains an unsafe entry path.');
  return value;
}

function downloadPinned(url, destination, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Aurora-Forge-Secure-Loader/1.0' } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!redirectsLeft || !response.headers.location) return reject(new Error('Secure DataCtrlLink download redirected too many times.'));
        const next = new URL(response.headers.location, url);
        if (next.protocol !== 'https:' || !DOWNLOAD_HOSTS.has(next.hostname.toLowerCase())) return reject(new Error('Secure DataCtrlLink download refused an unapproved redirect.'));
        return downloadPinned(next.toString(), destination, redirectsLeft - 1).then(resolve, reject);
      }
      if (response.statusCode !== 200) { response.resume(); return reject(new Error(`Secure DataCtrlLink download failed with HTTP ${response.statusCode}.`)); }
      const output = fs.createWriteStream(destination, { flags: 'wx' });
      let bytes = 0;
      response.on('data', (chunk) => { bytes += chunk.length; if (bytes > MAX_ZIP_BYTES) request.destroy(new Error('Secure DataCtrlLink download exceeded the size limit.')); });
      response.pipe(output);
      output.on('finish', () => output.close(() => resolve(destination)));
      output.on('error', reject);
    });
    request.setTimeout(30000, () => request.destroy(new Error('Secure DataCtrlLink download timed out.')));
    request.on('error', reject);
  });
}

function createSecureLoaderReleaseService({ userDataPath, manifest, sha256, helperPath, downloader = downloadPinned }) {
  const stagingRoot = path.join(userDataPath, 'secure-loader-staging');

  function runHelper(mode, zipPath, outputPath = '') {
    const result = cp.spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath, '-Mode', mode, '-ZipPath', zipPath, ...(outputPath ? ['-OutputPath', outputPath] : [])], { encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
    if (result.status !== 0) throw new Error(String(result.stderr || result.stdout || 'Release ZIP helper failed.').trim());
    try { return JSON.parse(String(result.stdout || '').trim()); } catch (_error) { throw new Error('Release ZIP helper returned an unreadable response.'); }
  }

  function validateAndStage(zipPath) {
    const selected = path.resolve(String(zipPath || ''));
    const stat = fs.lstatSync(selected);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('The selected release ZIP must be a regular file.');
    if (stat.size <= 0 || stat.size > MAX_ZIP_BYTES) throw new Error('The selected release ZIP is empty or exceeds the size limit.');
    const zipSha256 = sha256(selected);
    if (zipSha256 !== manifest.releaseZipSha256) throw new Error('Selection blocked: the ZIP checksum is not the reviewed v1.0.0 release checksum.');
    const inspection = runHelper('inspect', selected);
    if (!inspection || !Array.isArray(inspection.entries) || !inspection.entries.length || inspection.entries.length > MAX_ENTRIES) throw new Error('Release ZIP entry count is invalid or exceeds the limit.');
    let totalBytes = 0;
    const dllEntries = [];
    for (const entry of inspection.entries) {
      const name = assertSafeEntryName(entry.name);
      const length = Number(entry.length);
      if (!Number.isSafeInteger(length) || length < 0 || length > MAX_ENTRY_BYTES) throw new Error('Release ZIP contains an invalid or oversized entry.');
      totalBytes += length;
      if (totalBytes > MAX_ZIP_BYTES) throw new Error('Release ZIP expanded contents exceed the size limit.');
      if (path.posix.basename(name).toLowerCase() === 'dinput8.dll') dllEntries.push(entry);
    }
    if (dllEntries.length !== 1) throw new Error('The reviewed release ZIP must contain exactly one dinput8.dll.');
    fs.mkdirSync(stagingRoot, { recursive: true });
    const stageFolder = fs.mkdtempSync(path.join(stagingRoot, 'v1-'));
    const dllPath = path.join(stageFolder, 'dinput8.dll');
    try {
      runHelper('extract', selected, dllPath);
      const dllSha256 = sha256(dllPath);
      if (dllSha256 !== manifest.dllSha256) throw new Error('Extracted DLL checksum does not match the reviewed release manifest.');
      return { dllPath, zipSha256, dllSha256, version: manifest.loaderVersion, entryCount: inspection.entries.length };
    } catch (error) { fs.rmSync(stageFolder, { recursive: true, force: true }); throw error; }
  }

  async function downloadAndStage() {
    if (!manifest.directDownloadUrl || !/^https:\/\/github\.com\//i.test(manifest.directDownloadUrl)) throw new Error('The bundled direct-download URL is missing or not approved.');
    fs.mkdirSync(stagingRoot, { recursive: true });
    const downloadFolder = fs.mkdtempSync(path.join(stagingRoot, 'download-'));
    const zipPath = path.join(downloadFolder, 'Secure-DataCtrlLink-WWE2K26-1.0.0.zip');
    try { await downloader(manifest.directDownloadUrl, zipPath); return validateAndStage(zipPath); }
    finally { fs.rmSync(downloadFolder, { recursive: true, force: true }); }
  }

  function cleanupStagedDll(dllPath) {
    const resolved = path.resolve(String(dllPath || ''));
    const relative = path.relative(path.resolve(stagingRoot), resolved);
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return false;
    const folder = path.dirname(resolved);
    if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true, force: true });
    return true;
  }

  return { validateAndStage, downloadAndStage, cleanupStagedDll };
}

module.exports = { createSecureLoaderReleaseService, assertSafeEntryName, downloadPinned, MAX_ZIP_BYTES, MAX_ENTRY_BYTES, MAX_ENTRIES, DOWNLOAD_HOSTS };
