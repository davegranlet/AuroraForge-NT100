'use strict';

// Bake the integrated three-entry sparse tree with Aurora CAK Foundry's
// WWE 2K26 FDIR 9.9 writer, then independently reopen, extract, and compare
// every payload before any installed-slot staging.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../..');
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const INTEGRATED = path.resolve(arg('--integrated', path.join(__dirname, 'integrated-three-entrances-v2')));
const BAKE_ME = path.resolve(arg('--bakeme', path.join(__dirname, 'three-entrances-bakeme-v1')));
const OUTPUT = path.resolve(arg('--output', path.join(__dirname, 'built-three-entrances-v1', 'aurora-2k25-replace-mod.cak')));
const UNPACKED = path.resolve(arg('--unpacked', path.join(__dirname, 'three-entrances-unpacked-v1')));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const fail = (message) => { throw new Error(message); };

function copyPayloads(from, to, relative = '') {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (!relative && (entry.name === '_work' || entry.name === 'INTEGRATION-REPORT.json')) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(target, { recursive: true }); copyPayloads(source, target, path.join(relative, entry.name)); }
    else {
      if (path.extname(entry.name).toLowerCase() === '.json') continue;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
    }
  }
}

if (!fs.existsSync(path.join(INTEGRATED, 'INTEGRATION-REPORT.json'))) fail('The offline three-entry integration report is missing.');
for (const p of [BAKE_ME, OUTPUT, UNPACKED]) if (fs.existsSync(p)) fail(`Refusing to overwrite existing output: ${p}`);
fs.mkdirSync(BAKE_ME, { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(UNPACKED, { recursive: true });
copyPayloads(INTEGRATED, BAKE_ME);

const repackager = require(path.join(ROOT, 'cak-foundry', 'electron', 'archive-repackager.js'));
const reader = require(path.join(ROOT, 'cak-foundry', 'electron', 'cak-reader.js'));
const scan = repackager.scanBakeFolder(BAKE_ME);
const bake = repackager.buildCak(BAKE_ME, OUTPUT, { storeRaw: true });
if (!bake.verified || !bake.payloadVerified || bake.archiveName !== path.basename(OUTPUT)) fail('Aurora CAK Foundry bake/readback verification did not pass.');

// Independently reopen and write all stored payloads out from the new archive.
const dictionary = {};
scan.folders.forEach((x) => { if (x.relative) dictionary[x.hash] = x.relative; });
scan.files.forEach((x) => { dictionary[x.hash] = x.relative; });
const session = reader.openArchive(OUTPUT, dictionary);
if (session.files.length !== scan.files.length) fail(`Archive extraction count ${session.files.length} does not match source count ${scan.files.length}.`);
const sourceByHash = new Map(scan.files.map((file) => [file.hash, file]));
const { recoverPayload, derivePayloadKey } = repackager;
const fd = fs.openSync(OUTPUT, 'r');
const extracted = [];
try {
  for (const file of session.files) {
    const expected = sourceByHash.get(file.hash);
    if (!expected) fail(`Unrecognized baked CAK entry hash ${file.hash}.`);
    if (Number(file.storedSize) !== expected.size) fail(`Stored size mismatch for ${expected.relative}.`);
    const stored = Buffer.alloc(file.storedSize);
    fs.readSync(fd, stored, 0, stored.length, Number(file.offset));
    const payload = recoverPayload(stored, derivePayloadKey(session.key, file.storedSize, file.offset));
    const wanted = expected.synthetic ? Buffer.from(expected.content) : fs.readFileSync(expected.full);
    if (!payload.equals(wanted)) fail(`Extracted payload differs byte-for-byte from ${expected.relative}.`);
    const outputFile = path.join(UNPACKED, ...expected.relative.split('/'));
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, payload, { flag: 'wx' });
    extracted.push({ path: expected.relative, bytes: payload.length, sha256: sha(payload) });
  }
} finally { fs.closeSync(fd); }

const inputFiles = scan.files.map((file) => ({ path: file.relative, bytes: file.size, sha256: sha(file.synthetic ? Buffer.from(file.content) : fs.readFileSync(file.full)) }));
const report = {
  schema: 'aurora-forge-three-2k19-entrances-cak/v1',
  status: 'baked-and-unpacked-byte-verified-not-staged',
  archive: { path: OUTPUT, bytes: fs.statSync(OUTPUT).size, sha256: sha(fs.readFileSync(OUTPUT)), name: path.basename(OUTPUT), key: bake.archiveKey },
  bake,
  inputFileCount: inputFiles.length,
  extractedFileCount: extracted.length,
  inputAndExtractedPayloadsByteIdentical: inputFiles.length === extracted.length && inputFiles.every((file) => { const actual = extracted.find((x) => x.path === file.path); return actual && actual.bytes === file.bytes && actual.sha256 === file.sha256; }),
  inputFiles,
  extractedFiles: extracted,
  bakeMeRoot: BAKE_ME,
  unpackedRoot: UNPACKED,
};
if (!report.inputAndExtractedPayloadsByteIdentical) fail('CAK unpack comparison failed.');
const reportPath = path.join(path.dirname(OUTPUT), 'BAKE-AND-UNPACK-REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ archive: report.archive, files: report.extractedFileCount, byteIdentical: report.inputAndExtractedPayloadsByteIdentical, reportPath }, null, 2));
