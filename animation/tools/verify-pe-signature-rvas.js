'use strict';

// Verify that loader signatures are located at mapped PE RVAs, not merely at
// matching raw file offsets. This guards against section-alignment mistakes.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { parsePe, rvaToOffset } = require('./analyze-wwe-pe-xrefs');

function parseHex(value, name) {
  const normalized = String(value || '').replace(/\s+/g, '').replace(/^0x/i, '');
  if (!normalized || normalized.length % 2 || !/^[0-9a-f]+$/i.test(normalized))
    throw new Error(`${name} must be a nonempty even-length hexadecimal byte string`);
  return Buffer.from(normalized, 'hex');
}

function parseRva(value, name) {
  const text = String(value || '');
  if (!/^(?:0x)?[0-9a-f]+$/i.test(text)) throw new Error(`${name} must be a hexadecimal RVA`);
  return Number.parseInt(text.replace(/^0x/i, ''), 16);
}

function verify(pePath, checks) {
  const file = fs.readFileSync(pePath);
  const pe = parsePe(file);
  const failures = [];
  const results = checks.map(({ name, rva, expected }) => {
    const offset = rvaToOffset(pe, rva);
    const actual = offset == null ? Buffer.alloc(0) : file.subarray(offset, offset + expected.length);
    const pass = actual.length === expected.length && actual.equals(expected);
    if (!pass) failures.push(name);
    return { name, rva: `0x${rva.toString(16).toUpperCase()}`,
      fileOffset: offset == null ? null : `0x${offset.toString(16).toUpperCase()}`,
      expectedHex: expected.toString('hex').toUpperCase(), actualHex: actual.toString('hex').toUpperCase(), pass };
  });
  return { schema: 'aurora-forge/pe-signature-rva-verification/v1', pe: pePath,
    sizeBytes: file.length, sha256: crypto.createHash('sha256').update(file).digest('hex').toUpperCase(),
    imageBase: `0x${pe.imageBase.toString(16).toUpperCase()}`, checks: results,
    pass: failures.length === 0, failures };
}

if (require.main === module) {
  try {
    const [pePath, mountRva, mountHex, phaseRva, phaseHex] = process.argv.slice(2);
    if (!pePath || !mountRva || !mountHex || !phaseRva || !phaseHex)
      throw new Error('Usage: node verify-pe-signature-rvas.js <exe> <mount-rva> <mount-hex> <phase-rva> <phase-hex>');
    const result = verify(pePath, [
      { name: 'mount', rva: parseRva(mountRva, 'mount RVA'), expected: parseHex(mountHex, 'mount signature') },
      { name: 'archive-phase', rva: parseRva(phaseRva, 'phase RVA'), expected: parseHex(phaseHex, 'phase signature') },
    ]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 1;
  } catch (error) { console.error(`PE signature RVA verification failed: ${error.message}`); process.exitCode = 2; }
}

module.exports = { verify, parseHex, parseRva };
