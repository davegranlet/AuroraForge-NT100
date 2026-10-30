'use strict';

// Extract a complete baked CAK through AuroraCakHelper and verify every file
// against its BakeMe source tree. The archive and source are read-only.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function repoRoot(start) {
  let current = path.resolve(start);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) return current;
    current = path.dirname(current);
  }
  throw new Error('Aurora Forge repository root was not found');
}
const { openArchive } = require(path.join(repoRoot(__dirname), 'cak-foundry', 'electron', 'cak-reader.js'));

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(); }
function listFiles(root, current = root) {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symbolic link is not valid in extraction verification: ${file}`);
    if (entry.isDirectory()) return listFiles(root, file);
    return [path.relative(root, file).replace(/\\/g, '/')];
  }).sort();
}
function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) throw new Error(`Unexpected argument ${argv[i]}`);
    const key = argv[i].slice(2);
    if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
    values[key] = argv[++i];
  }
  return values;
}
function verify({ cak, expectedRoot, outputRoot, oodle, helper, reportPath }) {
  for (const [key, value] of Object.entries({ cak, expectedRoot, outputRoot, oodle, helper })) if (!value) throw new Error(`${key} is required`);
  cak = path.resolve(cak); expectedRoot = path.resolve(expectedRoot); outputRoot = path.resolve(outputRoot);
  if (!fs.existsSync(cak) || !fs.existsSync(expectedRoot) || !fs.existsSync(oodle) || !fs.existsSync(helper)) throw new Error('CAK, expected root, Oodle, and Aurora helper must exist');
  if (fs.existsSync(outputRoot)) throw new Error(`Refusing to overwrite extraction output: ${outputRoot}`);
  const session = openArchive(cak, {});
  const entries = session.files.filter((file) => file.extractable);
  if (!entries.length || entries.length !== session.files.length) throw new Error(`Expected all catalog payloads to be locally extractable (${entries.length}/${session.files.length})`);
  if (entries.some((file) => !file.nameResolved)) throw new Error('CAK contains unresolved payload names');
  const resolvedNames = entries.map((file) => file.name.toLowerCase());
  if (new Set(resolvedNames).size !== resolvedNames.length) throw new Error('CAK contains duplicate resolved output paths');
  const requestPath = `${outputRoot}.request.json`;
  const request = {
    archivePath: cak, oodlePath: path.resolve(oodle), outputRoot, archiveKey: session.key,
    overwrite: false,
    entries: entries.map(({ id, offset, storedSize, expandedSize, compressed, protected: isProtected, name, chunks }) => ({
      id, offset: Number(offset), storedSize, expandedSize, compressed, protected: isProtected, relativePath: name, chunks,
    })),
  };
  fs.mkdirSync(path.dirname(outputRoot), { recursive: true });
  fs.mkdirSync(outputRoot, { recursive: false });
  fs.writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`, { flag: 'wx' });
  const result = spawnSync(path.resolve(helper), [requestPath], { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Aurora CAK extraction failed: ${result.error?.message || result.stderr || result.stdout}`);
  const helperResult = JSON.parse(String(result.stdout || '').trim());
  if (!Array.isArray(helperResult.results) || helperResult.results.length !== entries.length) throw new Error('Aurora helper did not return one extraction result per catalog entry');
  const expectedFiles = listFiles(expectedRoot), expectedMap = new Map(expectedFiles.map((file) => [file.toLowerCase(), file]));
  const rows = entries.map((entry, index) => {
    const relative = entry.name.replace(/\\/g, '/');
    const extracted = path.join(outputRoot, ...relative.split('/'));
    const sourceRelative = expectedMap.get(relative.toLowerCase());
    const source = sourceRelative ? path.join(expectedRoot, ...sourceRelative.split('/')) : '';
    const helperRow = helperResult.results[index];
    const exists = fs.existsSync(extracted);
    const extractedHash = exists ? sha256(extracted) : null;
    const expectedHash = source ? sha256(source) : null;
    return {
      id: entry.id, path: relative, helperOk: Boolean(helperRow?.Ok), bytes: exists ? fs.statSync(extracted).size : null,
      expectedBytes: entry.expandedSize, sha256: extractedHash, expectedSha256: expectedHash,
      matchesSource: Boolean(source && exists && extractedHash === expectedHash && fs.statSync(extracted).size === entry.expandedSize),
      error: helperRow?.Error || null,
    };
  });
  const extractedFiles = listFiles(outputRoot);
  const extraFiles = extractedFiles.filter((file) => !entries.some((entry) => entry.name.toLowerCase() === file.toLowerCase()));
  const missingSourceFiles = expectedFiles.filter((file) => !entries.some((entry) => entry.name.toLowerCase() === file.toLowerCase()));
  const report = {
    schema: 'aurora-forge/extract-verify-cak/v1',
    cak, cakSha256: sha256(cak), expectedRoot, outputRoot, archiveKey: session.key,
    archiveEntries: session.files.length, extractedEntries: rows.length,
    helperFailures: rows.filter((row) => !row.helperOk).length,
    payloadMismatches: rows.filter((row) => !row.matchesSource).length,
    extraFiles, missingSourceFiles, pass: rows.every((row) => row.helperOk && row.matchesSource) && !extraFiles.length && !missingSourceFiles.length,
    entries: rows,
  };
  if (reportPath) {
    reportPath = path.resolve(reportPath);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  }
  return report;
}
if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = verify({ cak: args.cak, expectedRoot: args.expected, outputRoot: args.output, oodle: args.oodle, helper: args.helper, reportPath: args.report });
    const summary = { pass: report.pass, archiveEntries: report.archiveEntries, helperFailures: report.helperFailures, payloadMismatches: report.payloadMismatches, extraFiles: report.extraFiles.length, missingSourceFiles: report.missingSourceFiles.length, report: args.report || null };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  } catch (error) { console.error(`Aurora CAK extract/verify failed: ${error.stack || error.message}`); process.exitCode = 1; }
}
module.exports = { verify };
