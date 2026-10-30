'use strict';

// Search an Aurora-decoded ADefs global payload for printable strings whose
// exact or ASCII-lowercase FNV-1a64 identity matches caller-supplied values.
// This is a targeted identity probe; a miss does not prove the value is not a
// string reference under a different encoding or hash scheme.
const fs = require('node:fs');
const crypto = require('node:crypto');

function fnv1a64Ascii(bytes, lowercase = false) {
  let hash = 0xcbf29ce484222325n;
  for (const original of bytes) {
    const byte = lowercase && original >= 0x41 && original <= 0x5a ? original + 0x20 : original;
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString();
}

function scan(payloadPath, targetText, outputPath) {
  if (!payloadPath || !targetText || !outputPath) {
    throw new Error('Usage: node scan-adefs-string-identity-targets.js <decoded-global-adefs.bin> <comma-separated-u64-targets> <new-report.json>');
  }
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);
  const targets = new Set(targetText.split(',').map(value => value.trim()).filter(Boolean));
  if (!targets.size || [...targets].some(value => !/^\d{1,20}$/.test(value))) {
    throw new Error('targets must be comma-separated unsigned decimal 64-bit integers');
  }
  const bytes = fs.readFileSync(payloadPath);
  const matches = [];
  let start = -1;
  for (let i = 0; i <= bytes.length; i += 1) {
    const byte = i < bytes.length ? bytes[i] : 0;
    if (byte >= 0x20 && byte <= 0x7e) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0 && i - start >= 3) {
      const text = bytes.toString('ascii', start, i);
      const view = bytes.subarray(start, i);
      const exact = fnv1a64Ascii(view, false);
      const lower = fnv1a64Ascii(view, true);
      if (targets.has(exact) || targets.has(lower)) {
        matches.push({
          offset: start,
          text,
          exactFnv1a64: exact,
          lowercaseFnv1a64: lower,
          matchedTargets: [...new Set([exact, lower].filter(value => targets.has(value)))],
        });
      }
    }
    start = -1;
  }
  const report = {
    schema: 'aurora-forge/adefs-string-identity-target-scan/v1',
    payload: {
      path: payloadPath,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    },
    targets: [...targets],
    method: 'FNV-1a64 over printable ASCII strings, exact and ASCII-lowercase; targeted probe only',
    matchCount: matches.length,
    matches,
    limitation: 'No match does not exclude another encoding, hash family, computed key, or non-string reference.',
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = scan(...process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[4], targets: report.targets, matchCount: report.matchCount, matches: report.matches }, null, 2));
  } catch (error) {
    console.error(`ADefs string identity scan failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { fnv1a64Ascii, scan };
