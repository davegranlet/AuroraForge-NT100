'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parsePe, offsetToRva } = require('../../../tools/analyze-wwe-pe-xrefs');

const exe = process.argv[2] || 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26\\WWE2K26_x64.exe';
const targets = (process.argv.slice(3).length ? process.argv.slice(3) : ['0x1414CB400', '0x1414CB460', '0x1415FE860', '0x1415F8D30'])
  .map((x) => BigInt(x));
const buf = fs.readFileSync(exe);
const pe = parsePe(buf);
const sections = pe.sections;
const executableSections = sections.filter((s) => (s.characteristics & 0x20000000) !== 0);
const result = {
  schema: 'aurora-forge-pe-camera-pointer-reference-scan/v1',
  executable: path.resolve(exe),
  imageBase: `0x${pe.imageBase.toString(16)}`,
  sizeBytes: buf.length,
  targets: targets.map((va) => ({
    va: `0x${va.toString(16)}`,
    absolutePointerHits: [],
    rva32Hits: [],
    directCallRel32Hits: [],
    relativeBranchOpcodeCandidates: [],
  })),
};

for (let t = 0; t < targets.length; t++) {
  const va = targets[t];
  const needle = Buffer.alloc(8);
  needle.writeBigUInt64LE(va);
  for (let off = buf.indexOf(needle); off >= 0; off = buf.indexOf(needle, off + 1)) {
    const rva = offsetToRva(pe, off);
    const section = rva == null ? null : sections.find((s) => rva >= s.rva && rva < s.rva + Math.max(s.virtualSize, s.rawSize));
    result.targets[t].absolutePointerHits.push({ fileOffset: `0x${off.toString(16)}`, rva: rva == null ? null : `0x${rva.toString(16)}`, section: section?.name || null });
  }
  const targetRva = va - BigInt(pe.imageBase);
  const rvaNeedle = Buffer.alloc(4);
  rvaNeedle.writeUInt32LE(Number(targetRva));
  for (let off = buf.indexOf(rvaNeedle); off >= 0; off = buf.indexOf(rvaNeedle, off + 1)) {
    const rva = offsetToRva(pe, off);
    const section = rva == null ? null : sections.find((s) => rva >= s.rva && rva < s.rva + Math.max(s.virtualSize, s.rawSize));
    result.targets[t].rva32Hits.push({ fileOffset: `0x${off.toString(16)}`, rva: rva == null ? null : `0x${rva.toString(16)}`, section: section?.name || null });
  }
}

for (const section of executableSections) {
  const code = buf.subarray(section.raw, section.raw + section.rawSize);
  const byVa = new Map(targets.map((va, index) => [va, index]));
  for (let i = 1; i < code.length - 4; i++) {
    const opcode = code[i - 1];
    if (opcode === 0xe8) {
      const resolved = BigInt(pe.imageBase) + BigInt(section.rva + i + 4 + code.readInt32LE(i));
      const targetIndex = byVa.get(resolved);
      if (targetIndex !== undefined) {
        result.targets[targetIndex].directCallRel32Hits.push({
          section: section.name,
          callFileOffset: `0x${(section.raw + i - 1).toString(16)}`,
          fileOffset: `0x${(section.raw + i).toString(16)}`,
          callRva: `0x${(section.rva + i - 1).toString(16)}`,
        });
      }
    }

    // Candidate-only xrefs: this byte scan does not decode instruction
    // boundaries, so every result must be checked by a disassembler before
    // treating it as a real control-flow reference.
    let displacement = null;
    let instructionLength = 0;
    let branchKind = null;
    if (opcode === 0xe9) {
      displacement = code.readInt32LE(i);
      instructionLength = 5;
      branchKind = 'jmp-rel32';
    } else if (opcode === 0xeb || (opcode >= 0x70 && opcode <= 0x7f) || (opcode >= 0xe0 && opcode <= 0xe3)) {
      displacement = code.readInt8(i);
      instructionLength = 2;
      branchKind = opcode === 0xeb ? 'jmp-rel8' : 'conditional-or-loop-rel8';
    } else if (opcode === 0x0f && i + 4 < code.length && code[i] >= 0x80 && code[i] <= 0x8f) {
      displacement = code.readInt32LE(i + 1);
      instructionLength = 6;
      branchKind = 'conditional-rel32';
    }
    if (branchKind !== null) {
      const resolved = BigInt(pe.imageBase) + BigInt(section.rva + i - 1 + instructionLength + displacement);
      const targetIndex = byVa.get(resolved);
      if (targetIndex !== undefined) {
        result.targets[targetIndex].relativeBranchOpcodeCandidates.push({
          section: section.name,
          kind: branchKind,
          fileOffset: `0x${(section.raw + i - 1).toString(16)}`,
          rva: `0x${(section.rva + i - 1).toString(16)}`,
          bytes: code.subarray(i - 1, i - 1 + instructionLength).toString('hex'),
        });
      }
    }
  }
}

console.log(JSON.stringify(result, null, 2));
