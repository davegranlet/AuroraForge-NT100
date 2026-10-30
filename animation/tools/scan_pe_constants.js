#!/usr/bin/env node
'use strict';

// Read-only PE scanner for exact integer constants. Used to locate serialized
// ADefs event/argument GUIDs in executable code before attempting a consumer
// trace. No executable bytes or game files are modified.
const fs = require('node:fs');
const path = require('node:path');
const { parsePeHeader } = require('./scan_pe_strings');

const CHUNK_BYTES = 32 * 1024 * 1024;

function readAt(fd, length, offset) {
  const buffer = Buffer.alloc(length);
  let done = 0;
  while (done < length) {
    const n = fs.readSync(fd, buffer, done, length - done, offset + done);
    if (!n) throw new Error(`unexpected EOF at 0x${(offset + done).toString(16)}`);
    done += n;
  }
  return buffer;
}

function encodeU64(decimal) {
  if (!/^\d+$/.test(String(decimal))) throw new Error(`invalid unsigned 64-bit integer: ${decimal}`);
  const value = BigInt(decimal);
  if (value < 0n || value > 0xffffffffffffffffn) throw new Error(`unsigned 64-bit integer out of range: ${decimal}`);
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes;
}

function scanPeConstants(filePath, decimals) {
  if (!Array.isArray(decimals) || decimals.length === 0) throw new Error('at least one 64-bit constant is required');
  const patterns = decimals.map((decimal) => ({ value: String(decimal), bytes: encodeU64(decimal) }));
  const maxLength = 8;
  const absolute = path.resolve(filePath);
  const stat = fs.statSync(absolute);
  if (!stat.isFile() || stat.size < 0x100) throw new Error('input is not a supported PE file');
  const fd = fs.openSync(absolute, 'r');
  try {
    const header = parsePeHeader(fd, stat.size);
    const hits = [];
    let start = 0;
    while (start < stat.size) {
      const owned = Math.min(CHUNK_BYTES, stat.size - start);
      const buffer = readAt(fd, Math.min(owned + maxLength - 1, stat.size - start), start);
      for (const pattern of patterns) {
        let cursor = 0;
        while (cursor < owned) {
          const local = buffer.indexOf(pattern.bytes, cursor);
          if (local < 0 || local >= owned) break;
          const fileOffset = start + local;
          const section = header.sections.find((item) => fileOffset >= item.rawPointer && fileOffset + 8 <= item.rawPointer + item.rawSize);
          const rva = section ? section.virtualAddress + fileOffset - section.rawPointer : null;
          hits.push({
            value: pattern.value,
            hex: `0x${BigInt(pattern.value).toString(16)}`,
            encoding: 'u64le',
            fileOffset: `0x${fileOffset.toString(16)}`,
            section: section?.name ?? null,
            rva: rva === null ? null : `0x${rva.toString(16)}`,
            va: rva === null ? null : `0x${(BigInt(header.imageBase) + BigInt(rva)).toString(16)}`,
          });
          cursor = local + 1;
        }
      }
      start += owned;
    }
    return { schema: 'aurora-forge/pe-u64-constant-scan/v1', file: absolute, bytes: stat.size, ...header, constants: decimals.map(String), hits };
  } finally {
    fs.closeSync(fd);
  }
}

function run(argv) {
  const input = argv[0];
  const marker = argv.indexOf('--u64');
  const outMarker = argv.indexOf('--json');
  if (!input || marker < 1 || marker === argv.length - 1) throw new Error('Usage: node scan_pe_constants.js <pe-file> --u64 <decimal> [decimal ...] [--json <report.json>]');
  const end = outMarker >= 0 ? outMarker : argv.length;
  const values = argv.slice(marker + 1, end);
  const report = scanPeConstants(input, values);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outMarker >= 0) {
    if (!argv[outMarker + 1]) throw new Error('--json requires an output path');
    fs.writeFileSync(path.resolve(argv[outMarker + 1]), json, { flag: 'wx' });
  } else process.stdout.write(json);
  return report;
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(`PE constant scan failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { encodeU64, scanPeConstants, run };
