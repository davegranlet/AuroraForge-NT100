'use strict';
// Lane-local (parallel-body/loading-control-audit): open a CAK with the canonical
// read-only reader, dump the full member/chunk table, and extract every extractable
// member via the canonical AuroraCakHelper. No shared tool changes.
// usage: node extract-archive.js <archive.cak> <outDir> [tableOut.json]
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const HELPER = FOUNDRY + '/app/tools/cak-helper/AuroraCakHelper.exe';
const OODLE = FOUNDRY + '/app/tools/cak-v93/oo2core_9_win64.dll';
const DICTIONARY_PATH = FOUNDRY + '/app/data/cak-known-paths.json';
const cakReader = require(FOUNDRY + '/electron/cak-reader.js');

const CAK = process.argv[2];
const OUT = process.argv[3];
if (!CAK || !OUT) { console.error('usage: node extract-archive.js <archive.cak> <outDir> [tableOut.json]'); process.exit(2); }
const TABLE = process.argv[4] || path.join(OUT, 'member-table.json');

const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const session = cakReader.openArchive(CAK, JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8')));

const table = {
  schema: 'parallel-body/loading-control-audit/archive-table/v1',
  archive: path.resolve(CAK),
  sha256: sha256(fs.readFileSync(CAK)),
  bytes: fs.statSync(CAK).size,
  key: '0x' + session.key.toString(16).toUpperCase(),
  version: session.version,
  memberCount: session.files.length,
  files: session.files.map(f => ({
    id: f.id, name: f.name, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize,
    compressed: !!f.compressed, protected: !!f.protected, extractable: !!f.extractable,
    chunkCount: Array.isArray(f.chunks) ? f.chunks.length : (f.chunks === undefined ? null : 'nonarray'),
    chunkSizes: Array.isArray(f.chunks) ? f.chunks.map(c => (c && typeof c === 'object') ? (c.storedSize ?? c.size ?? JSON.stringify(c).slice(0, 40)) : c) : f.chunks,
  })),
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(TABLE, JSON.stringify(table, null, 1));
console.log(`archive ${path.basename(CAK)} bytes=${table.bytes} key=${table.key} version=${JSON.stringify(session.version)} members=${table.memberCount}`);

const extractable = session.files.filter(f => f.extractable);
const request = {
  archivePath: path.resolve(CAK), oodlePath: OODLE, outputRoot: OUT,
  archiveKey: session.key, overwrite: true,
  entries: extractable.map(f => ({ id: f.id, offset: Number(f.offset), storedSize: f.storedSize, expandedSize: f.expandedSize, compressed: f.compressed, protected: f.protected, relativePath: f.name, chunks: f.chunks })),
};
const requestPath = path.join(OUT, '_extract-request.json');
fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
const run = cp.spawnSync(HELPER, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
fs.rmSync(requestPath, { force: true });
let parsed;
try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (e) { throw new Error('helper output unparseable: ' + (run.stderr || String(run.stdout).slice(0, 300))); }
const results = parsed.results || [];
const errors = results.filter(r => !r.Ok);
console.log(`extracted=${results.length - errors.length}/${extractable.length} errors=${errors.length}`);
for (const er of errors) console.log('  ERROR', JSON.stringify(er).slice(0, 200));
if (errors.length) process.exitCode = 1;
