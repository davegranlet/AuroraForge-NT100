'use strict';

// Aurora Forge recursive folder inventory/content reader. It hashes every
// regular file, records signatures/extensions/sizes, and structurally parses
// every JSFB with the existing bounds-checked reader. Unknown formats are
// still fully enumerated and hashed, but never mislabeled as decoded.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inspect } = require('./inspect-jsfb-graph');

function sha256(bytes) {
  const hash = crypto.createHash('sha256');
  hash.update(bytes);
  return hash.digest('hex').toUpperCase();
}

const RAW_IDENTITIES = [
  ['ascii:Victory', Buffer.from('Victory', 'ascii')],
  ['ascii:Entrance', Buffer.from('Entrance', 'ascii')],
  ['ascii:SetPlace', Buffer.from('SetPlace', 'ascii')],
  ['ascii:Ring_Target', Buffer.from('Ring_Target', 'ascii')],
  ['ascii:Ring', Buffer.from('Ring', 'ascii')],
  ['ascii:tgt.Camera', Buffer.from('tgt.Camera', 'ascii')],
  ['ascii:J_Root', Buffer.from('J_Root', 'ascii')],
  ['ascii:Camera01', Buffer.from('Camera01', 'ascii')],
  ['u64le:fnv64-Ring-DCEA4D2BFA11CEEB', Buffer.from([0xeb, 0xce, 0x11, 0xfa, 0x2b, 0x4d, 0xea, 0xdc])],
  ['u32le:component-F02E11D4', Buffer.from([0xd4, 0x11, 0x2e, 0xf0])],
  ['u32le:marker-00040001', Buffer.from([0x01, 0x00, 0x04, 0x00])],
  ['u32le:marker-00100014', Buffer.from([0x14, 0x00, 0x10, 0x00])],
];

function rawMatches(bytes) {
  const matches = [];
  for (const [label, needle] of RAW_IDENTITIES) {
    let count = 0;
    const positions = [];
    for (let offset = 0; (offset = bytes.indexOf(needle, offset)) !== -1; offset++) {
      count++;
      if (positions.length < 4) positions.push(offset);
    }
    if (count) matches.push({ label, count, positions });
  }
  return matches;
}

function walk(root, current = root, result = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) walk(root, full, result);
    else if (entry.isFile()) result.push(full);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

function stringsIn(graph) {
  const found = new Set();
  for (const table of graph.tables) for (const field of table.fields) {
    if (field.ref?.kind === 'string') found.add(field.ref.value);
    if (field.ref?.kind === 'vector') {
      // The graph's actual parsed target tables carry the valid string leaves.
    }
  }
  return [...found].sort();
}

function run(argv) {
  const [folderArg, reportArg, inventoryArg, ...options] = argv;
  if (!folderArg || !reportArg) throw new Error('Usage: node scan-resource-folder.js <folder> <report.json> [FILES.json] [--exclude-ext=.dds,.bk2,...] [--include-ext=.jsfb,.inst,...] [--raw-search-ext=.jsfb,.adefs,...] [--max-jsfb-tables=10000] [--max-jsfb-vector-entries=4096] [--summary-jsfb] [--jsfb-parse-on-raw-hit] [--jsfb-parse-on-raw-label=ascii:Ring_Target,...]');
  const root = path.resolve(folderArg), reportPath = path.resolve(reportArg);
  if (!fs.statSync(root).isDirectory()) throw new Error(`not a directory: ${root}`);
  const actual = walk(root);
  const excludeOption = options.find(value => value.startsWith('--exclude-ext='));
  const excludedExtensions = new Set((excludeOption?.slice('--exclude-ext='.length) || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  const includeOption = options.find(value => value.startsWith('--include-ext='));
  const includedExtensions = includeOption ? new Set(includeOption.slice('--include-ext='.length).split(',').map(value => value.trim().toLowerCase()).filter(Boolean)) : null;
  const rawOption = options.find(value => value.startsWith('--raw-search-ext='));
  const rawSearchExtensions = rawOption ? new Set(rawOption.slice('--raw-search-ext='.length).split(',').map(value => value.trim().toLowerCase()).filter(Boolean)) : null;
  const summaryJsfb = options.includes('--summary-jsfb');
  const maxTablesOption = options.find(value => value.startsWith('--max-jsfb-tables='));
  const maxJsfbTables = maxTablesOption ? Number(maxTablesOption.slice('--max-jsfb-tables='.length)) : 10000;
  const maxVectorOption = options.find(value => value.startsWith('--max-jsfb-vector-entries='));
  const maxJsfbVectorEntries = maxVectorOption ? Number(maxVectorOption.slice('--max-jsfb-vector-entries='.length)) : 200000;
  if (!Number.isInteger(maxJsfbTables) || maxJsfbTables < 1 || maxJsfbTables > 200000) throw new Error('--max-jsfb-tables must be an integer from 1 to 200000');
  if (!Number.isInteger(maxJsfbVectorEntries) || maxJsfbVectorEntries < 1 || maxJsfbVectorEntries > 200000) throw new Error('--max-jsfb-vector-entries must be an integer from 1 to 200000');
  const jsfbParseOnRawHit = options.includes('--jsfb-parse-on-raw-hit');
  const rawLabelOption = options.find(value => value.startsWith('--jsfb-parse-on-raw-label='));
  const jsfbParseRawLabels = rawLabelOption ? new Set(rawLabelOption.slice('--jsfb-parse-on-raw-label='.length).split(',').map(value => value.trim()).filter(Boolean)) : null;
  const ignored = [], included = [];
  for (const file of actual) {
    const ext = path.extname(file).toLowerCase() || '<none>';
    (excludedExtensions.has(ext) || (includedExtensions && !includedExtensions.has(ext)) ? ignored : included).push(file);
  }
  const inventory = inventoryArg ? JSON.parse(fs.readFileSync(path.resolve(inventoryArg), 'utf8')) : null;
  const inventoryRows = Array.isArray(inventory) ? inventory.filter(row => {
    const full = path.resolve(row.FullPath || path.join(inventory.Root || '', row.RelativePath || ''));
    return full.toLowerCase().startsWith(`${root}${path.sep}`.toLowerCase());
  }) : null;
  const rows = included.map(file => {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const bytes = fs.statSync(file).size;
    const ext = path.extname(file).toLowerCase() || '<none>';
    const content = fs.readFileSync(file);
    const prefix = content.subarray(0, 16).toString('hex').toUpperCase();
    const doRawSearch = !rawSearchExtensions || rawSearchExtensions.has(ext);
    const matches = doRawSearch ? rawMatches(content) : [];
    const row = { path: rel, bytes, extension: ext, sha256: sha256(content), prefixHex: prefix,
      rawSearchPerformed: doRawSearch, rawIdentityMatches: matches };
    const jsfbParseRequested = !jsfbParseOnRawHit && !jsfbParseRawLabels ||
      (jsfbParseOnRawHit && matches.length > 0) || (jsfbParseRawLabels && matches.some(match => jsfbParseRawLabels.has(match.label)));
    if (ext === '.jsfb' && jsfbParseRequested) {
      try {
        const graph = inspect(file, maxJsfbTables, maxJsfbVectorEntries);
        row.jsfb = { identifier: graph.identifier, rootOffset: graph.rootOffset, tableCount: graph.tableCount,
          truncated: graph.truncated, strings: stringsIn(graph), ...(summaryJsfb ? {} : { graph }) };
      } catch (error) { row.jsfbError = String(error.message || error); }
    } else if (ext === '.jsfb') row.jsfbParseSkipped = 'no configured raw identity marker';
    return row;
  });
  const ignoredRows = ignored.map(file => {
    const extension = path.extname(file).toLowerCase() || '<none>';
    return { path: path.relative(root, file).replace(/\\/g, '/'), bytes: fs.statSync(file).size, extension,
      reason: excludedExtensions.has(extension) ? 'explicitly excluded extension' : 'outside selected content-scan extensions' };
  });
  const ignoredByExtension = {};
  for (const row of ignoredRows) {
    const stat = ignoredByExtension[row.extension] ||= { files: 0, bytes: 0 };
    stat.files++; stat.bytes += row.bytes;
  }
  const byExtension = {};
  for (const row of rows) {
    const stat = byExtension[row.extension] ||= { files: 0, bytes: 0, parsed: 0, parseErrors: 0 };
    stat.files++; stat.bytes += row.bytes;
    if (row.jsfb) stat.parsed++;
    if (row.jsfbError) stat.parseErrors++;
  }
  const inventoryMap = inventoryRows ? new Map(inventoryRows.map(row => [path.resolve(row.FullPath).toLowerCase(), Number(row.Length)])) : null;
  const actualSizeMap = new Map(actual.map(file => [path.resolve(file).toLowerCase(), fs.statSync(file).size]));
  const missingFromInventory = inventoryRows ? [...inventoryMap.keys()].filter(full => !actualSizeMap.has(full)) : null;
  const notInInventory = inventoryMap ? actual.filter(file => !inventoryMap.has(path.resolve(file).toLowerCase())).map(file => path.relative(root, file).replace(/\\/g, '/')) : null;
  const sizeMismatches = inventoryMap ? [...actualSizeMap.entries()].filter(([full, bytes]) => inventoryMap.has(full) && inventoryMap.get(full) !== bytes).map(([full]) => path.relative(root, full).replace(/\\/g, '/')) : null;
  const report = {
    schema: 'aurora-forge/resource-folder-scan/v1', generatedAt: new Date().toISOString(), root,
    fileCount: actual.length, scannedFileCount: rows.length, skippedFileCount: ignoredRows.length,
    totalBytes: [...actualSizeMap.values()].reduce((sum, bytes) => sum + bytes, 0), scannedBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    skippedBytes: ignoredRows.reduce((sum, row) => sum + row.bytes, 0), excludedExtensions: [...excludedExtensions].sort(),
    includedExtensions: includedExtensions ? [...includedExtensions].sort() : 'all non-excluded extensions',
    rawSearchExtensions: rawSearchExtensions ? [...rawSearchExtensions].sort() : 'all scanned files',
    jsfbMode: jsfbParseRawLabels ? `raw-scan-all-jsfb-full-parse-on-labels-${[...jsfbParseRawLabels].join(',')}` : (jsfbParseOnRawHit ? 'raw-scan-all-jsfb-full-parse-on-raw-hit-summary-retained' : (summaryJsfb ? 'full-parse-summary-retained' : 'full-parse-and-full-graph-retained')),
    jsfbLimits: { maxTables: maxJsfbTables, maxVectorEntries: maxJsfbVectorEntries },
    skippedByExtension: ignoredByExtension, byExtension,
    rawIdentityNeedles: RAW_IDENTITIES.map(([label, bytes]) => ({ label, hex: bytes.toString('hex').toUpperCase() })),
    rawIdentityHitFiles: rows.filter(row => row.rawIdentityMatches.length).map(row => ({ path: row.path, matches: row.rawIdentityMatches })),
    inventoryCrossCheck: inventoryRows ? { inventoryFileCount: inventoryRows.length,
      missingFromDisk: missingFromInventory.length, notInInventory: notInInventory.length,
      sizeMismatches: sizeMismatches.length, missingFromDiskPaths: missingFromInventory,
      notInInventoryPaths: notInInventory, sizeMismatchPaths: sizeMismatches } : null,
    files: rows, skippedFiles: ignoredRows,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ root, fileCount: actual.length, scannedFileCount: rows.length, skippedFileCount: ignoredRows.length,
    totalBytes: report.totalBytes, scannedBytes: report.scannedBytes, skippedBytes: report.skippedBytes, skippedByExtension: ignoredByExtension, byExtension,
    jsfbParsed: rows.filter(row => row.jsfb).length, jsfbErrors: rows.filter(row => row.jsfbError).length,
    jsfbParseSkipped: rows.filter(row => row.jsfbParseSkipped).length,
    inventoryCrossCheck: report.inventoryCrossCheck && { inventoryFileCount: inventoryRows.length,
      missingFromDisk: missingFromInventory.length, notInInventory: notInInventory.length, sizeMismatches: sizeMismatches.length },
    report: reportPath })}\n`);
}

try { run(process.argv.slice(2)); }
catch (error) { console.error(error.stack || error); process.exitCode = 1; }
