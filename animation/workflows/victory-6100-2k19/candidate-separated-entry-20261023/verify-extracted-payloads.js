'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { openArchive, fnv1a64 } = require('../../../../cak-foundry/electron/cak-reader');

const root = path.resolve(process.argv[2] || path.join(__dirname, 'rebased/payload'));
const cak = path.resolve(process.argv[3] || path.join(__dirname, 'baked/aurora-2k25-replace-mod.cak'));
const outputRoot = path.resolve(process.argv[4] || path.join(__dirname, 'extracted'));
const helper = path.resolve(__dirname, '../../../../cak-foundry/app/tools/cak-helper/AuroraCakHelper.exe');
const oodle = 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll';
const requestPath = path.resolve(path.dirname(outputRoot), `${path.basename(outputRoot)}-request.json`);

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(); }
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed: ${full}`);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push({ full, relative: path.relative(root, full).replace(/\\/g, '/') });
  }
  return out;
}

for (const file of [cak, helper, oodle]) if (!fs.existsSync(file)) throw new Error(`Missing required input: ${file}`);
if (fs.existsSync(outputRoot) || fs.existsSync(requestPath)) throw new Error('Extraction output already exists; refusing overwrite.');
const sources = walk(root);
const dictionary = {};
for (const source of sources) {
  const normalized = source.relative.toLowerCase();
  dictionary[fnv1a64(normalized)] = normalized;
  let parent = path.posix.dirname(normalized);
  while (parent && parent !== '.') { dictionary[fnv1a64(parent)] = parent; parent = path.posix.dirname(parent); }
}
const archive = openArchive(cak, dictionary);
const entries = archive.files.filter((file) => file.extractable).map((file) => ({
  id: file.id,
  offset: Number(file.offset),
  storedSize: file.storedSize,
  expandedSize: file.expandedSize,
  compressed: file.compressed,
  protected: file.protected,
  relativePath: file.name,
  chunks: file.chunks,
}));
if (entries.length !== sources.length) throw new Error(`Archive has ${entries.length} extractable payloads; source has ${sources.length}.`);
const request = { archivePath: cak, oodlePath: oodle, outputRoot, archiveKey: archive.key, overwrite: false, entries };
fs.mkdirSync(outputRoot, { recursive: false });
fs.writeFileSync(requestPath, JSON.stringify(request), { flag: 'wx' });
const result = cp.spawnSync(helper, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.stdout || result.error?.message || 'CAK helper failed').trim());
const report = JSON.parse(String(result.stdout || '').trim());
if (report.results?.length !== entries.length || report.results.some((row) => !row.Ok)) throw new Error(JSON.stringify(report.results?.filter((row) => !row.Ok) || report));
const checks = sources.map((source) => {
  const extracted = path.join(outputRoot, ...source.relative.split('/'));
  if (!fs.existsSync(extracted)) throw new Error(`Missing extracted payload: ${source.relative}`);
  const expected = sha256(source.full);
  const actual = sha256(extracted);
  if (expected !== actual) throw new Error(`Payload mismatch for ${source.relative}: ${expected} != ${actual}`);
  return { path: source.relative, bytes: fs.statSync(source.full).size, sha256: expected };
});
const verification = {
  schema: 'aurora-forge/cak-extracted-payload-verification/v1',
  cak,
  cakSha256: sha256(cak),
  sourceRoot: root,
  extractedRoot: outputRoot,
  payloadCount: checks.length,
  byteIdentical: true,
  payloads: checks,
};
fs.writeFileSync(path.resolve(path.dirname(outputRoot), `${path.basename(outputRoot)}-verification.json`), `${JSON.stringify(verification, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ cakSha256: verification.cakSha256, payloadCount: checks.length, byteIdentical: true }, null, 2));
