'use strict';

// Search owner-inventoried extracted game files for an exact little-endian
// 64-bit value. Read-only targeted reference finder for hashes/GUIDs.
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const [manifest, value, ...rest] = argv;
  if (!manifest || !/^(?:0x)?[0-9a-f]{1,16}$/i.test(value || '')) throw new Error('Usage: node scan-extracted-qword.js <FILES.json> <hex-u64> [--extensions .jsfb,.adefs,.clips] [--out report.json]');
  const opts = { extensions: ['.jsfb', '.adefs', '.clips'], out: null };
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === '--extensions') opts.extensions = rest[i + 1].split(',').map(x => x.toLowerCase());
    else if (rest[i] === '--out') opts.out = rest[i + 1];
    else throw new Error(`Unknown option ${rest[i]}`);
  }
  return { manifest, value, opts };
}
function scan(manifestPath, hex, extensions) {
  const raw = BigInt(`0x${hex.replace(/^0x/i, '')}`);
  const needle = Buffer.alloc(8); needle.writeBigUInt64LE(raw);
  const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const selected = entries.filter(e => extensions.includes(path.extname(e.RelativePath || e.FullPath).toLowerCase()));
  const hits = [], errors = [];
  let bytesRead = 0;
  for (const entry of selected) {
    const file = entry.FullPath || path.resolve(path.dirname(manifestPath), entry.RelativePath);
    try {
      const b = fs.readFileSync(file); bytesRead += b.length;
      let from = 0, offset;
      while ((offset = b.indexOf(needle, from)) !== -1) {
        hits.push({ relativePath: entry.RelativePath, fullPath: file, offset, contextHex: b.subarray(Math.max(0, offset - 8), Math.min(b.length, offset + 16)).toString('hex').toUpperCase() });
        from = offset + 1;
      }
    } catch (error) { errors.push({ path: file, message: error.message }); }
  }
  return { schema: 'aurora-forge/extracted-qword-scan/v1', sourceManifest: path.resolve(manifestPath), valueHex: `0x${raw.toString(16).toUpperCase().padStart(16, '0')}`, byteOrder: 'little-endian', extensions, filesSelected: selected.length, bytesRead, hits: hits.length, errors: errors.length, references: hits, readErrors: errors };
}

if (require.main === module) {
  try {
    const { manifest, value, opts } = parseArgs(process.argv.slice(2));
    const report = scan(manifest, value, opts.extensions);
    const text = JSON.stringify(report, null, 2) + '\n';
    if (opts.out) fs.writeFileSync(opts.out, text);
    else process.stdout.write(text);
    process.stderr.write(`Searched ${report.filesSelected} files (${report.bytesRead} bytes): ${report.hits} exact hits, ${report.errors} read errors\n`);
  } catch (error) { console.error(error.message); process.exit(2); }
}
module.exports = { scan };
