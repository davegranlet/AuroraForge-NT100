'use strict';

const fs = require('node:fs');

function u16(buf, off) { return buf.readUInt16LE(off); }
function u32(buf, off) { return buf.readUInt32LE(off); }
function i32(buf, off) { return buf.readInt32LE(off); }
function u64(buf, off) { return Number(buf.readBigUInt64LE(off)); }

function parsePe(buf) {
  const pe = u32(buf, 0x3c);
  if (buf.toString('ascii', pe, pe + 4) !== 'PE\0\0') throw new Error('not PE');
  const sectionsCount = u16(buf, pe + 6);
  const optionalSize = u16(buf, pe + 20);
  const optional = pe + 24;
  const magic = u16(buf, optional);
  if (magic !== 0x20b) throw new Error('not PE32+');
  const imageBase = u64(buf, optional + 24);
  const sections = [];
  let sectionOff = optional + optionalSize;
  for (let i = 0; i < sectionsCount; i++, sectionOff += 40) {
    const name = buf.toString('ascii', sectionOff, sectionOff + 8).replace(/\0.*$/, '');
    sections.push({
      name,
      virtualSize: u32(buf, sectionOff + 8),
      rva: u32(buf, sectionOff + 12),
      rawSize: u32(buf, sectionOff + 16),
      raw: u32(buf, sectionOff + 20),
    });
  }
  return { imageBase, sections };
}

function rvaToOffset(pe, rva) {
  const section = pe.sections.find((s) => rva >= s.rva && rva < s.rva + Math.max(s.virtualSize, s.rawSize));
  if (!section) return null;
  return section.raw + (rva - section.rva);
}

function offsetToRva(pe, offset) {
  const section = pe.sections.find((s) => offset >= s.raw && offset < s.raw + s.rawSize);
  if (!section) return null;
  return section.rva + (offset - section.raw);
}

function findAll(buf, needle) {
  const out = [];
  for (let off = buf.indexOf(needle); off >= 0; off = buf.indexOf(needle, off + 1)) out.push(off);
  return out;
}

function hex(buf, off, len) {
  return buf.subarray(Math.max(0, off), Math.min(buf.length, off + len)).toString('hex').match(/../g)?.join(' ') || '';
}

function nearestProlog(text, at) {
  const patterns = [
    Buffer.from('48895c24', 'hex'),
    Buffer.from('488bc4', 'hex'),
    Buffer.from('4053', 'hex'),
    Buffer.from('4883ec', 'hex'),
  ];
  for (let off = at; off >= Math.max(0, at - 0x400); off--) {
    if (patterns.some((p) => text.subarray(off, off + p.length).equals(p))) return off;
  }
  return null;
}

function analyze(file) {
  const buf = fs.readFileSync(file);
  const pe = parsePe(buf);
  const text = pe.sections.find((s) => s.name === '.text');
  if (!text) throw new Error('no .text');
  const textBuf = buf.subarray(text.raw, text.raw + text.rawSize);
  console.log(JSON.stringify({
    imageBase: `0x${pe.imageBase.toString(16)}`,
    textRva: `0x${text.rva.toString(16)}`,
    textRaw: `0x${text.raw.toString(16)}`,
    textSize: text.rawSize,
  }, null, 2));

  const needles = [
    '%s%02d.cak',
    'bakedfile',
    'bakedfile%02d',
    '.cak',
  ];
  for (const str of needles) {
    const hits = findAll(buf, Buffer.from(str + '\0', 'ascii'));
    console.log(`STRING ${JSON.stringify(str)} hits=${hits.length}`);
    for (const off of hits.slice(0, 20)) {
      const rva = offsetToRva(pe, off);
      console.log(`  off=0x${off.toString(16)} rva=${rva == null ? 'n/a' : `0x${rva.toString(16)}`}`);
      if (rva != null) {
        const va = pe.imageBase + rva;
        const vaBytes = Buffer.alloc(8);
        vaBytes.writeBigUInt64LE(BigInt(va));
        const ptrHits = findAll(buf, vaBytes);
        for (const ptrOff of ptrHits.slice(0, 40)) {
          const ptrRva = offsetToRva(pe, ptrOff);
          console.log(`    ptr=0x${ptrOff.toString(16)} ptrRva=${ptrRva == null ? 'n/a' : `0x${ptrRva.toString(16)}`}`);
        }
        const rvaBytes = Buffer.alloc(4);
        rvaBytes.writeUInt32LE(rva);
        const rvaHits = findAll(buf, rvaBytes);
        for (const rvaOff of rvaHits.slice(0, 40)) {
          const rvaRef = offsetToRva(pe, rvaOff);
          console.log(`    rva32=0x${rvaOff.toString(16)} rvaRef=${rvaRef == null ? 'n/a' : `0x${rvaRef.toString(16)}`}`);
        }
        const refs = [];
        for (let i = 0; i < textBuf.length - 4; i++) {
          const resolved = pe.imageBase + text.rva + i + 4 + i32(textBuf, i);
          if (resolved === va) {
            const pro = nearestProlog(textBuf, i);
            refs.push({
              refRva: text.rva + i,
              prologRva: pro == null ? null : text.rva + pro,
              bytes: hex(textBuf, Math.max(0, i - 12), 40),
            });
          }
        }
        for (const ref of refs.slice(0, 40)) {
          console.log(`    xref=0x${ref.refRva.toString(16)} prolog=${ref.prologRva == null ? 'n/a' : `0x${ref.prologRva.toString(16)}`} bytes=${ref.bytes}`);
        }
      }
    }
  }

  const profileSig = Buffer.from('48895c240848896c2410488974241857', 'hex');
  const sigHits = findAll(buf, profileSig);
  console.log(`PROFILE_MOUNT_SIG hits=${sigHits.length}`);
  for (const off of sigHits.slice(0, 50)) {
    const rva = offsetToRva(pe, off);
    console.log(`  off=0x${off.toString(16)} rva=${rva == null ? 'n/a' : `0x${rva.toString(16)}`} bytes=${hex(buf, off, 32)}`);
  }

  const dumpRvas = [0x2e03f0, 0x2e04fd, 0x2e05a0, 0x2dfda0, 0x2dfead, 0x2dff50];
  for (const rva of dumpRvas) {
    const off = rvaToOffset(pe, rva);
    console.log(`DUMP rva=0x${rva.toString(16)} off=${off == null ? 'n/a' : `0x${off.toString(16)}`} bytes=${off == null ? '' : hex(buf, off, 64)}`);
  }
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node tools/analyze-wwe-pe-xrefs.js <exe>');
    process.exit(2);
  }
  analyze(file);
}
