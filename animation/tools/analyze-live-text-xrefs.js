'use strict';

const fs = require('node:fs');

const [textPath, validPath] = process.argv.slice(2);
if (!textPath || !validPath) {
  console.error('usage: node tools/analyze-live-text-xrefs.js <live.text.bin> <valid.bin>');
  process.exit(2);
}

const text = fs.readFileSync(textPath);
const valid = fs.readFileSync(validPath);
const imageBase = 0x140000000n;
const textRva = 0x1000;

function ok(off, len = 1) {
  if (off < 0 || off + len > valid.length) return false;
  for (let i = 0; i < len; i++) if (valid[off + i] !== 1) return false;
  return true;
}

function hex(off, len) {
  return text.subarray(Math.max(0, off), Math.min(text.length, off + len)).toString('hex').match(/../g)?.join(' ') || '';
}

function nearestProlog(off) {
  const patterns = [
    Buffer.from('405355565741564157', 'hex'),
    Buffer.from('48895c2408', 'hex'),
    Buffer.from('48895c2410', 'hex'),
    Buffer.from('488bc4', 'hex'),
    Buffer.from('4053', 'hex'),
  ];
  for (let p = off; p >= Math.max(0, off - 0x600); p--) {
    if (patterns.some((pattern) => text.subarray(p, p + pattern.length).equals(pattern))) return p;
  }
  return null;
}

const targets = [
  ['fmt', 0x3504420],
  ['bakedfile', 0x3305bb0],
  ['dotcak1', 0x3504426],
  ['dotcak2', 0x388d852],
];

for (const [name, rva] of targets) {
  const va = Number(imageBase + BigInt(rva));
  const refs = [];
  for (let off = 0; off < text.length - 4; off++) {
    if (!ok(off, 4)) continue;
    const resolved = Number(imageBase + BigInt(textRva + off + 4 + text.readInt32LE(off)));
    if (resolved === va) {
      const prolog = nearestProlog(off);
      refs.push({
        rva: textRva + off,
        prolog: prolog == null ? null : textRva + prolog,
        bytes: hex(off - 16, 80),
      });
    }
  }
  console.log(`${name} refs=${refs.length}`);
  for (const ref of refs.slice(0, 80)) {
    console.log(`  xref=0x${ref.rva.toString(16)} prolog=${ref.prolog == null ? 'n/a' : `0x${ref.prolog.toString(16)}`} bytes=${ref.bytes}`);
  }
}
