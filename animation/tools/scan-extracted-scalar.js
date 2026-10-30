'use strict';

// Read-only targeted little-endian scalar scanner over the owner's extracted
// inventory. Raw hits are references only; they do not assign field semantics.
const fs = require('node:fs');
const path = require('node:path');

function scan(manifestPath, hex, width, { extensions = [], prefix = '', maxHits = 100000 } = {}) {
  if (![4, 8].includes(width)) throw new Error('width must be 4 or 8 bytes');
  const digits = width * 2;
  if (!/^(?:0x)?[0-9a-f]+$/i.test(hex) || hex.replace(/^0x/i, '').length > digits) throw new Error(`value does not fit u${digits * 4}`);
  const value = BigInt(`0x${hex.replace(/^0x/i, '')}`);
  const needle = Buffer.alloc(width);
  if (width === 4) needle.writeUInt32LE(Number(value)); else needle.writeBigUInt64LE(value);
  const manifest = path.resolve(manifestPath);
  const entries = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  const norm = value => String(value || '').replaceAll('\\', '/');
  const selected = entries.filter(entry => {
    const relative = norm(entry.RelativePath || entry.FullPath);
    const extension = path.extname(relative).toLowerCase();
    return (!extensions.length || extensions.includes(extension)) && (!prefix || relative.toLowerCase().startsWith(prefix.toLowerCase()));
  });
  const references = [], errors = [];
  let bytesRead = 0, truncated = false;
  for (const entry of selected) {
    const file = entry.FullPath || path.resolve(path.dirname(manifest), entry.RelativePath);
    try {
      const bytes = fs.readFileSync(file); bytesRead += bytes.length;
      let from = 0, offset;
      while ((offset = bytes.indexOf(needle, from)) !== -1) {
        if (references.length < maxHits) references.push({ relativePath: norm(entry.RelativePath), fullPath: file, offset,
          contextHex: bytes.subarray(Math.max(0, offset - 8), Math.min(bytes.length, offset + width + 8)).toString('hex').toUpperCase() });
        else truncated = true;
        from = offset + 1;
      }
    } catch (error) { errors.push({ path: file, message: error.message }); }
  }
  return { schema: 'aurora-forge/extracted-scalar-scan/v1', sourceManifest: manifest,
    valueHex: `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`, widthBytes: width,
    byteOrder: 'little-endian', prefix: prefix || null, extensions, filesSelected: selected.length,
    bytesRead, hits: references.length, truncated, errors: errors.length, references, readErrors: errors };
}
if (require.main === module) {
  try {
    const [manifest, value, widthText, ...rest] = process.argv.slice(2);
    if (!manifest || !value || !widthText) throw new Error('Usage: node scan-extracted-scalar.js <FILES.json> <hex-value> <4|8-byte-width> [--prefix path/] [--extensions .jsfb,.clips] [--out new-report.json]');
    const options = { extensions: [], prefix: '', maxHits: 100000, out: null };
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i], arg = rest[i + 1];
      if (!arg) throw new Error(`Missing value for ${key}`);
      if (key === '--prefix') options.prefix = arg;
      else if (key === '--extensions') options.extensions = arg.split(',').map(x => x.toLowerCase());
      else if (key === '--max-hits') options.maxHits = Number(arg);
      else if (key === '--out') options.out = path.resolve(arg);
      else throw new Error(`Unknown option ${key}`);
    }
    const { out, maxHits, ...filters } = options;
    const report = scan(manifest, value, Number(widthText), { ...filters, maxHits });
    const text = JSON.stringify(report, null, 2) + '\n';
    if (out) {
      if (fs.existsSync(out)) throw new Error('refusing to overwrite ' + out);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, text, { flag: 'wx' });
    } else process.stdout.write(text);
    process.stderr.write(`Searched ${report.filesSelected} files (${report.bytesRead} bytes): ${report.hits} stored hits${report.truncated ? ' (truncated)' : ''}, ${report.errors} read errors\n`);
  } catch (error) { console.error(error.message); process.exit(2); }
}
module.exports = { scan };
