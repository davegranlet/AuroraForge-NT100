#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHUNK_BYTES = 16 * 1024 * 1024;
const MAX_HEADER_BYTES = 1024 * 1024;

function readAt(fd, length, offset) {
  const buffer = Buffer.alloc(length);
  let done = 0;
  while (done < length) {
    const count = fs.readSync(fd, buffer, done, length - done, offset + done);
    if (count === 0) throw new Error(`unexpected EOF at file offset 0x${(offset + done).toString(16)}`);
    done += count;
  }
  return buffer;
}

function parsePeHeader(fd, fileBytes) {
  if (fileBytes < 0x40) throw new Error('input is too small to be a PE file');
  const dos = readAt(fd, 0x40, 0);
  if (dos.readUInt16LE(0) !== 0x5a4d) throw new Error('missing MZ signature');
  const peOffset = dos.readUInt32LE(0x3c);
  if (peOffset + 24 > fileBytes) throw new Error('PE header pointer is outside the file');
  const coffAndOptional = readAt(fd, 24, peOffset);
  if (coffAndOptional.toString('binary', 0, 4) !== 'PE\0\0') throw new Error('missing PE signature');
  const sectionCount = coffAndOptional.readUInt16LE(6);
  const optionalBytes = coffAndOptional.readUInt16LE(20);
  if (!sectionCount || sectionCount > 4096 || optionalBytes < 32) throw new Error('invalid PE section/header counts');
  const optional = readAt(fd, optionalBytes, peOffset + 24);
  const magic = optional.readUInt16LE(0);
  let imageBase;
  if (magic === 0x20b && optionalBytes >= 32) imageBase = optional.readBigUInt64LE(24);
  else if (magic === 0x10b && optionalBytes >= 32) imageBase = BigInt(optional.readUInt32LE(28));
  else throw new Error(`unsupported PE optional-header magic 0x${magic.toString(16)}`);
  const sectionOffset = peOffset + 24 + optionalBytes;
  const sectionBytes = sectionCount * 40;
  if (sectionOffset + sectionBytes > fileBytes || sectionBytes > MAX_HEADER_BYTES) throw new Error('invalid PE section table extent');
  const raw = readAt(fd, sectionBytes, sectionOffset);
  const sections = [];
  for (let index = 0; index < sectionCount; index++) {
    const offset = index * 40;
    const name = raw.subarray(offset, offset + 8).toString('ascii').replace(/\0.*$/, '');
    const virtualSize = raw.readUInt32LE(offset + 8);
    const virtualAddress = raw.readUInt32LE(offset + 12);
    const rawSize = raw.readUInt32LE(offset + 16);
    const rawPointer = raw.readUInt32LE(offset + 20);
    if (rawSize && rawPointer + rawSize > fileBytes) throw new Error(`section ${name} exceeds file bounds`);
    sections.push({ name, virtualSize, virtualAddress, rawSize, rawPointer });
  }
  return { peOffset, imageBase: imageBase.toString(), sections };
}

function encodings(terms) {
  return terms.flatMap((text) => {
    if (typeof text !== 'string' || text.length === 0) throw new Error('search terms must be non-empty strings');
    return [
      { text, encoding: 'ascii', bytes: Buffer.from(text, 'ascii') },
      { text, encoding: 'utf16le', bytes: Buffer.from(text, 'utf16le') },
    ];
  });
}

function scanPe(filePath, terms) {
  const absolutePath = path.resolve(filePath);
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile() || stat.size < 0x100) throw new Error('input is not a supported PE file');
  const fd = fs.openSync(absolutePath, 'r');
  try {
    const header = parsePeHeader(fd, stat.size);
    const patterns = encodings(terms);
    const overlap = Math.max(...patterns.map((pattern) => pattern.bytes.length)) - 1;
    const hits = [];
    let start = 0;
    while (start < stat.size) {
      const bytesToRead = Math.min(CHUNK_BYTES + overlap, stat.size - start);
      const chunk = readAt(fd, bytesToRead, start);
      const ownedEnd = Math.min(start + CHUNK_BYTES, stat.size);
      for (const pattern of patterns) {
        let from = 0;
        while (from < chunk.length) {
          const local = chunk.indexOf(pattern.bytes, from);
          if (local < 0) break;
          const fileOffset = start + local;
          if (fileOffset < ownedEnd && (start === 0 || fileOffset >= start)) {
            const section = header.sections.find((item) => fileOffset >= item.rawPointer && fileOffset < item.rawPointer + item.rawSize);
            const rva = section ? section.virtualAddress + fileOffset - section.rawPointer : null;
            hits.push({
              text: pattern.text,
              encoding: pattern.encoding,
              fileOffset: `0x${fileOffset.toString(16)}`,
              section: section?.name ?? null,
              rva: rva === null ? null : `0x${rva.toString(16)}`,
              va: rva === null ? null : `0x${(BigInt(header.imageBase) + BigInt(rva)).toString(16)}`,
            });
          }
          from = local + 1;
        }
      }
      start += CHUNK_BYTES;
    }
    return { schema: 'aurora-forge/pe-string-scan/v1', file: absolutePath, bytes: stat.size, ...header, terms, hits };
  } finally {
    fs.closeSync(fd);
  }
}

function run(argv) {
  const input = argv[0];
  const marker = argv.indexOf('--find');
  const outMarker = argv.indexOf('--json');
  if (!input || marker < 1 || marker === argv.length - 1) {
    throw new Error('Usage: node scan_pe_strings.js <pe-file> --find <term> [term ...] [--json <report.json>]');
  }
  const termEnd = outMarker >= 0 ? outMarker : argv.length;
  const terms = argv.slice(marker + 1, termEnd);
  const result = scanPe(input, terms);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outMarker >= 0) {
    if (!argv[outMarker + 1]) throw new Error('--json requires an output path');
    fs.writeFileSync(path.resolve(argv[outMarker + 1]), json, { flag: 'wx' });
  } else process.stdout.write(json);
  return result;
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(`PE string scan failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { parsePeHeader, scanPe };
