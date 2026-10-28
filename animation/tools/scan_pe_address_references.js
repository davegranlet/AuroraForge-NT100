#!/usr/bin/env node
'use strict';

// Aurora-owned, read-only PE scanner for candidate x64 RIP-relative references
// to known VA/RVA targets. Hits identify a four-byte displacement operand; a
// disassembler must confirm instruction boundaries and semantics.
const fs = require('node:fs');
const path = require('node:path');
const { parsePeHeader } = require('./scan_pe_strings');

const CHUNK_BYTES = 16 * 1024 * 1024;
const IMAGE_SCN_MEM_EXECUTE = 0x20000000;

function readAt(fd, length, offset) {
  const out = Buffer.alloc(length);
  let done = 0;
  while (done < length) {
    const count = fs.readSync(fd, out, done, length - done, offset + done);
    if (count === 0) throw new Error(`unexpected EOF at 0x${(offset + done).toString(16)}`);
    done += count;
  }
  return out;
}

function parseSectionCharacteristics(fd, peHeader, fileBytes) {
  const dos = readAt(fd, 0x40, 0);
  const peOffset = dos.readUInt32LE(0x3c);
  const coff = readAt(fd, 24, peOffset);
  if (coff.toString('binary', 0, 4) !== 'PE\0\0') throw new Error('missing PE signature');
  const sectionCount = coff.readUInt16LE(6);
  const optionalBytes = coff.readUInt16LE(20);
  const sectionTable = peOffset + 24 + optionalBytes;
  const raw = readAt(fd, sectionCount * 40, sectionTable);
  if (sectionTable + raw.length > fileBytes) throw new Error('PE section table exceeds file bounds');
  return peHeader.sections.map((section, index) => ({
    ...section,
    characteristics: raw.readUInt32LE(index * 40 + 36),
  }));
}

function parseTarget(value, imageBase) {
  const text = String(value);
  if (/^0x[0-9a-f]+$/i.test(text)) {
    const numeric = BigInt(text);
    return numeric >= imageBase
      ? { input: text, va: numeric, rva: numeric - imageBase }
      : { input: text, va: imageBase + numeric, rva: numeric };
  }
  if (!/^\d+$/.test(text)) throw new Error(`invalid target address: ${text}`);
  const numeric = BigInt(text);
  return numeric >= imageBase
    ? { input: text, va: numeric, rva: numeric - imageBase }
    : { input: text, va: imageBase + numeric, rva: numeric };
}

function scanExecutableReferences(filePath, targetValues, selectedSections = []) {
  if (!Array.isArray(targetValues) || targetValues.length === 0) throw new Error('at least one target VA/RVA is required');
  const absolutePath = path.resolve(filePath);
  const stat = fs.statSync(absolutePath);
  if (!stat.isFile() || stat.size < 0x100) throw new Error('input is not a supported PE file');
  const fd = fs.openSync(absolutePath, 'r');
  try {
    const header = parsePeHeader(fd, stat.size);
    const imageBase = BigInt(header.imageBase);
    const targets = targetValues.map((value) => parseTarget(value, imageBase));
    const sections = parseSectionCharacteristics(fd, header, stat.size)
      .filter((section) => section.rawSize > 0 && (section.characteristics & IMAGE_SCN_MEM_EXECUTE) !== 0)
      .filter((section) => selectedSections.length === 0 || selectedSections.includes(section.name));
    const hits = [];

    for (const section of sections) {
      let sectionOffset = 0;
      while (sectionOffset < section.rawSize) {
        const owned = Math.min(CHUNK_BYTES, section.rawSize - sectionOffset);
        const bytes = readAt(fd, Math.min(owned + 3, section.rawSize - sectionOffset), section.rawPointer + sectionOffset);
        const lastStart = Math.min(owned, bytes.length - 3);
        for (let local = 0; local < lastStart; local++) {
          const displacement = BigInt(bytes.readInt32LE(local));
          const endRva = BigInt(section.virtualAddress + sectionOffset + local + 4);
          const targetRva = endRva + displacement;
          for (const target of targets) {
            if (targetRva === target.rva) {
              const fileOffset = section.rawPointer + sectionOffset + local;
              const operandRva = section.virtualAddress + sectionOffset + local;
              hits.push({
                targetInput: target.input,
                targetVa: `0x${target.va.toString(16)}`,
                targetRva: `0x${target.rva.toString(16)}`,
                section: section.name,
                displacementFileOffset: `0x${fileOffset.toString(16)}`,
                displacementRva: `0x${operandRva.toString(16)}`,
                signedDisplacement: Number(displacement),
                referenceKind: 'rip-relative-disp32-candidate',
                interpretationLimit: 'Operand candidates only; instruction decoding and semantic role are unverified.',
              });
            }
          }
        }
        sectionOffset += owned;
      }
    }
    return {
      schema: 'aurora-forge/pe-address-reference-scan/v1',
      file: absolutePath,
      fileBytes: stat.size,
      imageBase: `0x${imageBase.toString(16)}`,
      targetValues: targets.map((target) => ({ input: target.input, va: `0x${target.va.toString(16)}`, rva: `0x${target.rva.toString(16)}` })),
      scannedExecutableSections: sections.map(({ name, rawSize, rawPointer, virtualAddress, characteristics }) => ({
        name, rawSize, rawPointer: `0x${rawPointer.toString(16)}`, virtualAddress: `0x${virtualAddress.toString(16)}`, characteristics: `0x${characteristics.toString(16)}`,
      })),
      hits,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function run(argv) {
  const input = argv[0];
  const targetsAt = argv.indexOf('--target');
  const jsonAt = argv.indexOf('--json');
  const sectionAt = argv.indexOf('--section');
  if (!input || targetsAt < 1 || targetsAt === argv.length - 1) {
    throw new Error('Usage: node scan_pe_address_references.js <pe-file> --target <va-or-rva> [target ...] [--section <name> ...] [--json <report.json>]');
  }
  const targetsEnd = [jsonAt, sectionAt].filter((index) => index > targetsAt).sort((a, b) => a - b)[0] ?? argv.length;
  const sectionEnd = jsonAt > sectionAt && sectionAt >= 0 ? jsonAt : argv.length;
  const sections = sectionAt >= 0 ? argv.slice(sectionAt + 1, sectionEnd) : [];
  const report = scanExecutableReferences(input, argv.slice(targetsAt + 1, targetsEnd), sections);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (jsonAt >= 0) {
    if (!argv[jsonAt + 1]) throw new Error('--json requires a report path');
    fs.writeFileSync(path.resolve(argv[jsonAt + 1]), json, { flag: 'wx' });
  } else process.stdout.write(json);
  return report;
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(`PE address reference scan failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { IMAGE_SCN_MEM_EXECUTE, parseTarget, scanExecutableReferences, run };
