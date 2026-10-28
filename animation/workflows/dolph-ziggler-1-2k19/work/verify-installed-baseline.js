'use strict';
// verify-offline-cak.js - unpack every payload from the offline CAK via the foundry
// cak-reader + AuroraCakHelper and byte-compare against the staging source tree.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { openArchive } = require('C:/nt100-codebasemain/cak-foundry/electron/cak-reader.js');

const cakPath = process.argv[2];
const sourceRoot = process.argv[3] || path.join(__dirname, 'staging');
const foundry = 'C:/nt100-codebasemain/cak-foundry';
const dictionary = JSON.parse(fs.readFileSync(path.join(foundry, 'app', 'data', 'cak-known-paths.json'), 'utf8'));
const helper = path.join(foundry, 'app', 'tools', 'cak-helper', 'AuroraCakHelper.exe');
const oodle = path.join(foundry, 'app', 'tools', 'cak-v93', 'oo2core_9_win64.dll');

const session = openArchive(cakPath, dictionary);
console.log('archive key 0x' + session.key.toString(16), '| files', session.files.length, '| folders', session.folders.length);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wo004-verify-'));
const extractable = session.files.filter((f) => f.extractable);
const request = {
  archivePath: path.resolve(cakPath), oodlePath: oodle, outputRoot: temp,
  archiveKey: session.key, overwrite: true,
  entries: extractable.map((f) => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })),
};
const reqPath = path.join(temp, 'request.json');
fs.writeFileSync(reqPath, JSON.stringify(request), 'utf8');
const res = cp.spawnSync(helper, [reqPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
let parsed;
try { parsed = JSON.parse(String(res.stdout || '').trim()); } catch (e) { throw new Error('helper output unparseable: ' + ((res.error && res.error.message) || res.stderr || String(res.stdout).slice(0, 400))); }
const helperErrors = (parsed.results || []).filter((r) => !r.Ok);
const byPath = {};
for (const r of parsed.results || []) byPath[(r.RequestedPath || r.Path || r.RelativePath || '').toLowerCase()] = r;

let pass = 0, fail = 0, missing = 0;
const rows = [];
for (const e of extractable) {
  const rel = e.name.split('/').join(path.sep);
  const extracted = path.join(temp, ...e.name.split('/'));
  const src = path.join(sourceRoot, ...e.name.split('/'));
  let verdict = 'FAIL';
  if (!fs.existsSync(src)) { verdict = 'NO-SOURCE'; missing++; }
  else if (fs.existsSync(extracted)) {
    const a = fs.readFileSync(extracted), b = fs.readFileSync(src);
    verdict = a.length === b.length && crypto.createHash('sha256').update(a).digest('hex') === crypto.createHash('sha256').update(b).digest('hex') ? 'PASS' : 'FAIL';
  }
  verdict === 'PASS' ? pass++ : (verdict === 'FAIL' ? fail++ : null);
  rows.push({ file: e.name, expandedSize: e.expandedSize, compressed: !!e.compressed, verdict });
}
console.log('extractable', extractable.length, '| PASS', pass, '| FAIL', fail, '| no-source', missing, '| helper errors', helperErrors.length);
for (const r of rows.filter((x) => x.verdict !== 'PASS')) console.log('  ' + r.verdict + ' ' + r.file);
for (const e of helperErrors) console.log('  HELPER-ERROR id' + e.Id + ': ' + e.Error + ' (entry index ' + e.Id + ')');
fs.writeFileSync(path.join(__dirname, 'offline-cak-verification.json'), JSON.stringify({ extractionRoot: temp, generated: new Date().toISOString(), cak: path.resolve(cakPath), archiveKey: session.key, fileCount: session.files.length, extractable: extractable.length, pass, fail, noSource: missing, helperErrors: helperErrors.map((e) => ({ id: e.Id, error: e.Error })), rows }, null, 1));
console.log('offline-cak-verification.json written');
const tdbOnly = rows.filter((r) => r.verdict === 'NO-SOURCE').every((r) => /_textures\.tdb/i.test(r.file));
process.exitCode = fail === 0 && (missing === 0 || (missing === 1 && tdbOnly)) ? 0 : 1;
