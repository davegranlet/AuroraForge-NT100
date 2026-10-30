'use strict';

// Aurora Forge read-only literal-byte lookup over the canonical extracted-file
// inventory. Reports exact byte offsets and short context; it assigns no schema
// meaning to a hit.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function scan(inventoryPath, needleText, { extensions = ['.jsfb'], prefix = '', maxHits = 100000 } = {}) {
  if (!needleText) throw new Error('needle must not be empty');
  const needle = Buffer.from(needleText, 'utf8');
  const inventory = path.resolve(inventoryPath);
  const entries = JSON.parse(fs.readFileSync(inventory, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('inventory must be a JSON array');
  const selected = entries.filter(entry => {
    const relative = String(entry.RelativePath || entry.FullPath || '').replaceAll('\\', '/');
    return (!extensions.length || extensions.includes(path.extname(relative).toLowerCase()))
      && (!prefix || relative.toLowerCase().startsWith(prefix.replaceAll('\\', '/').toLowerCase()));
  });
  const hits = [], errors = [];
  let bytesRead = 0, truncated = false;
  for (const entry of selected) {
    const file = entry.FullPath || path.resolve(path.dirname(inventory), entry.RelativePath);
    try {
      const bytes = fs.readFileSync(file); bytesRead += bytes.length;
      const fileSha256 = sha256(bytes);
      let from = 0, offset;
      while ((offset = bytes.indexOf(needle, from)) !== -1) {
        if (hits.length < maxHits) hits.push({ relativePath: String(entry.RelativePath || '').replaceAll('\\', '/'),
          fullPath: file, fileSha256, offset,
          contextHex: bytes.subarray(Math.max(0, offset - 12), Math.min(bytes.length, offset + needle.length + 12)).toString('hex').toUpperCase() });
        else truncated = true;
        from = offset + 1;
      }
    } catch (error) { errors.push({ file, message: error.message }); }
  }
  return { schema: 'aurora-forge/extracted-literal-scan/v1', inventory,
    inventorySha256: sha256(fs.readFileSync(inventory)), needle: needleText,
    extensions, prefix: prefix || null, filesSelected: selected.length,
    bytesRead, hits: hits.length, truncated, errors, references: hits, readErrors: errors };
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2), value = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
    const inventory = value('--inventory'), needle = value('--needle'), output = value('--out');
    const extensions = (value('--extensions') || '.jsfb').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const prefix = value('--prefix') || '', maxHits = Number(value('--max-hits') || 100000);
    if (!inventory || !needle || !output || !Number.isSafeInteger(maxHits) || maxHits < 1) {
      throw new Error('Usage: node scan-extracted-literal.js --inventory <FILES.json> --needle <literal> --out <new-report.json> [--extensions .jsfb] [--prefix path/] [--max-hits N]');
    }
    const out = path.resolve(output);
    if (fs.existsSync(out)) throw new Error(`refusing to overwrite ${out}`);
    const report = scan(inventory, needle, { extensions, prefix, maxHits });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ output: out, filesSelected: report.filesSelected, bytesRead: report.bytesRead,
      hits: report.hits, errors: report.errors }, null, 2));
  } catch (error) { console.error(`Literal scan failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { scan };
