'use strict';
// extract-verify-base-archive.js — Worker 4 independent archive-extraction check.
// Opens the archived base CAK read-only with the canonical cak-foundry reader, extracts
// only the five 14002 phase clip members with the canonical AuroraCakHelper, and verifies
// their sha256 equals the base files the converter consumed. Writes extraction evidence
// into this lane folder only. Does not bake, stage or touch the active slot.
//
// Usage:
//   node extract-verify-base-archive.js [--cak <file.cak>] [--manifest <out/ring-object-records-v1.json>] [--out <dir>]
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const FOUNDRY = 'C:/nt100-codebasemain/cak-foundry';
const HELPER = FOUNDRY + '/app/tools/cak-helper/AuroraCakHelper.exe';
const OODLE = FOUNDRY + '/app/tools/cak-v93/oo2core_9_win64.dll';
const DICTIONARY = FOUNDRY + '/app/data/cak-known-paths.json';
const DEFAULT_CAK = 'C:/nt100-codebasemain/.local/test557-playback-20261017-1907/rollback/aurora-2k25-replace-mod.cak';

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
  const cakPath = opt('--cak', DEFAULT_CAK).replace(/\\/g, '/');
  const manifestPath = opt('--manifest', path.join(__dirname, 'out', 'ring-object-records-v1.json')).replace(/\\/g, '/');
  const outDir = opt('--out', path.join(__dirname, 'out', 'archive-extraction')).replace(/\\/g, '/');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const basePins = new Map(manifest.overlay.phaseFiles.map((f) => [path.basename(f.baseFile), { baseFile: f.baseFile, baseSha256: f.baseSha256 }]));

  const { openArchive } = require(FOUNDRY + '/electron/cak-reader.js');
  const session = openArchive(cakPath, JSON.parse(fs.readFileSync(DICTIONARY, 'utf8')));
  const members = session.files.filter((f) => basePins.has(path.basename(f.name)) && f.extractable && f.nameResolved);
  const wanted = new Set([...basePins.keys()]);
  const found = new Set(members.map((f) => path.basename(f.name)));
  for (const name of wanted) if (!found.has(name)) throw new Error(`archive ${cakPath} does not expose ${name}`);

  fs.mkdirSync(outDir, { recursive: true });
  const request = {
    archivePath: path.resolve(cakPath), oodlePath: OODLE, outputRoot: outDir,
    archiveKey: session.key, overwrite: true,
    entries: members.map((file) => ({ id: file.id, offset: Number(file.offset), storedSize: file.storedSize, expandedSize: file.expandedSize, compressed: file.compressed, protected: file.protected, relativePath: file.name, chunks: file.chunks })),
  };
  const requestPath = path.join(outDir, '_request.json');
  fs.writeFileSync(requestPath, JSON.stringify(request), 'utf8');
  const run = cp.spawnSync(HELPER, [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  fs.rmSync(requestPath, { force: true });
  let parsed;
  try { parsed = JSON.parse(String(run.stdout || '').trim()); } catch (error) { throw new Error(`extraction helper output unparseable: ${error.message}; stderr=${String(run.stderr).slice(0, 300)}`); }
  const results = parsed.results || [];
  const errors = results.filter((r) => !r.Ok);
  if (errors.length) throw new Error(`helper reported ${errors.length} failed members`);

  const checks = [];
  for (const file of members) {
    const name = path.basename(file.name);
    const extractedPath = path.join(outDir, file.name);
    const bytes = fs.readFileSync(extractedPath);
    const actual = sha256(bytes);
    const pin = basePins.get(name);
    const baseBytes = fs.readFileSync(pin.baseFile);
    checks.push({
      member: name,
      archivePath: file.name,
      extractable: file.extractable,
      nameResolved: file.nameResolved,
      extractedBytes: bytes.length,
      extractedSha256: actual,
      baseFile: pin.baseFile,
      baseSha256: pin.baseSha256,
      hashMatch: actual === pin.baseSha256,
      byteEqualToBase: bytes.equals(baseBytes),
      compressed: file.compressed,
      protected: file.protected,
      storedSize: file.storedSize,
      expandedSize: file.expandedSize,
      containerOffset: file.offset,
    });
  }
  const archiveSha = sha256(fs.readFileSync(cakPath));
  const report = {
    schema: 'aurora-forge/worker14-base-archive-extraction/v1',
    generated: new Date().toISOString(),
    cak: { path: cakPath, sha256: archiveSha, bytes: session.archiveSize, key: `0x${session.key.toString(16).toUpperCase()}`, keyRecovered: session.keyRecovered, fileCount: session.files.length },
    helper: HELPER,
    checks,
    pass: checks.every((c) => c.hashMatch && c.byteEqualToBase),
  };
  const outPath = path.join(outDir, 'archive-extraction-v1.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 1));
  console.log(`archive sha ${archiveSha}`);
  for (const c of checks) console.log(`${c.member}: extracted ${c.extractedSha256.slice(0, 16)} vs base ${c.baseSha256.slice(0, 16)} -> ${c.hashMatch && c.byteEqualToBase ? 'MATCH' : 'MISMATCH'}`);
  console.log(`written ${outPath} | pass=${report.pass}`);
  if (!report.pass) process.exitCode = 1;
}

if (require.main === module) main();
