'use strict';

// Export concise, human-readable evidence plus a complete hash manifest from
// scan-resource-folder.js and its Aurora CLIPS/Adefs corpus indexes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function csv(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}
function writeExclusive(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { encoding: 'utf8', flag: 'wx' });
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}
function run(argv) {
  const [scanPath, outputDirectory, clipsPath = '', adefsPath = ''] = argv;
  if (!scanPath || !outputDirectory) throw new Error('Usage: node export-resource-scan-report.js <folder-scan.json> <new-output-dir> [clips-index.json] [adefs-index.json]');
  const scan = readJson(scanPath);
  const output = path.resolve(outputDirectory);
  if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error(`refusing to overwrite non-empty ${output}`);
  fs.mkdirSync(output, { recursive: true });
  const files = scan.files || [];
  const skippedFiles = scan.skippedFiles || [];
  const allFiles = [...files, ...skippedFiles];
  const extCounts = new Map();
  const topCounts = new Map();
  const rawCounts = new Map();
  let jsfbCount = 0, jsfbTables = 0, jsfbTruncated = 0, jsfbParseSkipped = 0;
  for (const file of allFiles) {
    const ext = file.extension || path.extname(file.path).toLowerCase() || '(none)';
    extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
    const top = String(file.path).split(/[\\/]/)[0];
    topCounts.set(top, (topCounts.get(top) || 0) + 1);
    for (const match of file.rawIdentityMatches || []) rawCounts.set(match.label, (rawCounts.get(match.label) || 0) + 1);
    if (file.jsfb) { jsfbCount++; jsfbTables += file.jsfb.tableCount || 0; if (file.jsfb.truncated) jsfbTruncated++; }
    if (file.jsfbParseSkipped) jsfbParseSkipped++;
  }
  const csvRows = [['path', 'bytes', 'extension', 'status', 'skipReason', 'sha256', 'jsfbIdentifier', 'jsfbTables', 'jsfbTruncated']];
  for (const f of files) csvRows.push([f.path, f.bytes, f.extension, 'scanned', '', f.sha256, f.jsfb?.identifier || '', f.jsfb?.tableCount ?? '', f.jsfb?.truncated ?? '']);
  for (const f of skippedFiles) csvRows.push([f.path, f.bytes, f.extension, 'content not read', f.reason || 'outside selected extensions', '', '', '', '']);
  writeExclusive(path.join(output, 'FILES.csv'), csvRows.map(row => row.map(csv).join(',')).join('\r\n') + '\r\n');

  const md = [];
  const rel = file => path.relative(output, path.resolve(file)).replaceAll('\\', '/');
  md.push(`# Resource folder scan: ${path.basename(scan.root)}`, '', `- Source folder: \`${scan.root}\``, `- Scan time (UTC): ${scan.generatedAt}`, `- Files enumerated: ${scan.fileCount}; bytes: ${scan.totalBytes.toLocaleString('en-US')}`, `- Content-read and hashed: ${scan.scannedFileCount ?? files.length} files; ${scan.scannedBytes?.toLocaleString('en-US') ?? 'unknown'} bytes`, `- Explicitly skipped by extension: ${scan.skippedFileCount ?? skippedFiles.length} files; ${scan.skippedBytes?.toLocaleString('en-US') ?? '0'} bytes`, `- Complete per-path inventory with scan status and hashes where read: [FILES.csv](FILES.csv)`, `- Full structural/content evidence: [${path.basename(scanPath)}](${rel(scanPath)})`);
  md.push('', '## Completeness checks', '', `- Extracted folder file count: ${scan.fileCount}`, `- Reference inventory file count: ${scan.inventoryCrossCheck?.inventoryFileCount ?? 'not supplied'}`, `- Missing from disk: ${scan.inventoryCrossCheck?.missingFromDisk ?? 'not checked'}`, `- Not in reference inventory: ${scan.inventoryCrossCheck?.notInInventory ?? 'not checked'}`, `- Size mismatches: ${scan.inventoryCrossCheck?.sizeMismatches ?? 'not checked'}`, `- Selected content extensions: ${(Array.isArray(scan.includedExtensions) ? scan.includedExtensions : []).map(ext => `\`${ext}\``).join(', ') || 'all non-excluded extensions'}`, `- Excluded extensions: ${(scan.excludedExtensions || []).map(ext => `\`${ext}\``).join(', ') || 'none'}`, `- JSFB graphs fully parsed: ${jsfbCount}; tables walked: ${jsfbTables}; truncated graphs: ${jsfbTruncated}; files with no raw-marker-triggered deep parse: ${jsfbParseSkipped}`);
  md.push('', '## File types', '', '| Extension | Count |', '|---|---:|');
  for (const [ext, count] of [...extCounts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))) md.push(`| \`${ext}\` | ${count} |`);
  md.push('', '## Top-level content groups', '', '| Group | Files |', '|---|---:|');
  for (const [name, count] of [...topCounts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))) md.push(`| \`${name}\` | ${count} |`);
  md.push('', '## Largest files', '', '| File | Bytes |', '|---|---:|');
  for (const f of [...files].sort((a,b) => b.bytes-a.bytes).slice(0, 15)) md.push(`| \`${f.path}\` | ${f.bytes.toLocaleString('en-US')} |`);
  const overGiB = allFiles.filter(f => f.bytes > 1024 ** 3);
  md.push('', `Files larger than 1 GiB: ${overGiB.length ? overGiB.map(f => `\`${f.path}\` (${f.bytes} bytes)`).join(', ') : 'none'}.`);
  md.push('', '## Raw identity scan', '', '| Identity | Files with at least one raw-byte match |', '|---|---:|');
  if (rawCounts.size) for (const [name, count] of [...rawCounts].sort((a,b) => a[0].localeCompare(b[0]))) md.push(`| \`${name}\` | ${count} |`);
  else md.push('| No configured marker matches | 0 |');
  md.push('', 'The raw-byte identities are the explicitly configured probes in the Aurora scanner. They are not a general-purpose printable-string search; format-specific indexes below are separate evidence. Files marked as content not read are still enumerated and included in inventory and size checks.');

  if (clipsPath) {
    const clips = readJson(clipsPath);
    const reject = new Map();
    for (const row of clips.rejected || []) reject.set(row.error, (reject.get(row.error) || 0) + 1);
    md.push('', '## CLIPS parser coverage', '', `- Files discovered: ${clips.sourceInventory.filesFound}; parsed: ${clips.sourceInventory.filesParsed}; parser rejects: ${clips.sourceInventory.parseFailures}.`, `- Records: ${clips.sourceInventory.records}; distinct track identifiers: ${clips.tracks.uniqueIds}; source bytes: ${clips.sourceInventory.bytes}.`, `- Full record/track index: [${path.basename(clipsPath)}](${rel(clipsPath)})`, '', '| Rejection reason | Files |', '|---|---:|');
    for (const [reason, count] of [...reject].sort((a,b) => b[1]-a[1])) md.push(`| ${reason} | ${count} |`);
  }
  if (adefsPath) {
    const adefs = readJson(adefsPath);
    const prefix = scan.root.toLowerCase().endsWith('animsystem') ? 'animsystem/' : 'animation/';
    const rows = adefs.records.filter(row => row.file.toLowerCase().startsWith(prefix));
    const parsed = rows.filter(row => row.parse === 'aurora-adefs-payload-v1').length;
    const unsupported = rows.filter(row => row.parse === 'unsupported').length;
    const wrapperFailed = rows.filter(row => row.parse === 'wrapper-failed').length;
    const placeCount = rows.reduce((n,row) => n + (row.setPlace?.length || 0), 0);
    const ringCount = rows.reduce((n,row) => n + (row.ringHashRawOffsets?.length || 0), 0);
    md.push('', '## ADefs decode and semantic parse', '', `- Files in this folder: ${rows.length}; Aurora per-motion payload grammar parsed: ${parsed}; unsupported payload grammars: ${unsupported}; wrapper failures: ${wrapperFailed}.`, `- SetPlace events parsed: ${placeCount}; raw Ring-name hash hits in decoded payloads: ${ringCount}.`, `- Full decoded ADefs index and row-level diagnostics: [${path.basename(adefsPath)}](${rel(adefsPath)}).`, '', 'A decoded payload is counted as parsed only when the current Aurora ADefs grammar reader accepts it. Unsupported grammar or wrapper results are reported, not treated as corruption or silently omitted.');
  }
  md.push('', '## Scope', '', 'This is a read-only scan of the requested extracted folder. Each regular file was enumerated and hashed; every JSFB was structurally walked. Format parsers report their coverage and rejects separately. No game files were changed.');
  writeExclusive(path.join(output, 'REPORT.md'), md.join('\n') + '\n');
  return { output, files: files.length, totalBytes: scan.totalBytes, inventoryCrossCheck: scan.inventoryCrossCheck, csvSha256: sha256(path.join(output, 'FILES.csv')), reportSha256: sha256(path.join(output, 'REPORT.md')) };
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(`Resource scan report export failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { run };
