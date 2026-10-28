'use strict';

// Worker-2 extra-track audit.
// Extracts the embedded 2K26 skeleton bone-name table from the supplied
// Clips Editor v3.45 executable and resolves track ids by CASE-SENSITIVE
// FNV-1a64 (the convention proven by the camera-consumer-trace lane and by
// this audit's own matches). This is a dictionary extraction using an
// existing compiled tool; it does not decode or write any .clips payload.
//
// Usage: node extract-skeleton-name-table.js [ClipsEditor.exe] [out.json]

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_EXE = 'C:\\nt100-codebasemain\\.local\\supplied-tools\\Clips Editor v3.45\\Clips Editor.exe';
// The contiguous name pool begins at this file offset in Clips Editor v3.45.
// It runs "vector" .. "H_Leg_Vol_F_L" as NUL-terminated ASCII strings.
const POOL_START = 0xadbf88;
const POOL_END = 0xadcde0;

function fnv1a64(value) {
  let hash = 0xCBF29CE484222325n;
  for (const byte of Buffer.from(value, 'utf8')) hash = (hash ^ BigInt(byte)) * 0x100000001B3n & 0xFFFFFFFFFFFFFFFFn;
  return `0x${hash.toString(16).toUpperCase().padStart(16, '0')}`;
}

function extract(exePath) {
  const buffer = fs.readFileSync(exePath);
  if (POOL_END > buffer.length) throw new Error('executable smaller than expected name pool region');
  const region = buffer.subarray(POOL_START, POOL_END);
  const names = region.toString('latin1').split('\u0000').filter(name => name.length > 1 && /^[\x20-\x7e]+$/.test(name));
  const byId = {};
  for (const name of names) {
    const id = fnv1a64(name);
    if (!byId[id]) byId[id] = [];
    byId[id].push(name);
  }
  return {
    schema: 'worker2-clips-editor-skeleton-table/v1',
    source: { file: path.basename(exePath), bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase() },
    pool: { start: `0x${POOL_START.toString(16)}`, end: `0x${POOL_END.toString(16)}` },
    names,
    namesById: byId,
    limits: [
      'Name table is read from a compiled third-party tool; it is a dictionary, not proof that the game itself registers every name.',
      'Resolution is exact case-sensitive FNV-1a64 only; no name is invented for an unmatched id.',
    ],
  };
}

if (require.main === module) {
  try {
    const exe = process.argv[2] || DEFAULT_EXE;
    const out = process.argv[3];
    const result = extract(exe);
    const text = JSON.stringify(result, null, 2) + '\n';
    if (out) fs.writeFileSync(path.resolve(out), text);
    console.log(JSON.stringify({ names: result.names.length, source: result.source, output: out || null }, null, 2));
  } catch (error) {
    console.error(`skeleton table extraction failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { fnv1a64, extract, DEFAULT_EXE };
