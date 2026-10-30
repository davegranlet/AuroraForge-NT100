'use strict';
// Read-only PE byte-signature search for mapping old-build function bodies to
// the current executable. Prints file offset, RVA and VA for every exact match.
// Usage: node animation/tools/find-pe-byte-signature.js <hex> [exePath] [maxHits]
// The hex may contain spaces. It is matched exactly (no wildcards) so the
// caller must choose a sequence that is unique or inspect all hits.

const fs = require('node:fs');
const path = require('node:path');

const hex = (process.argv[2] || '').replace(/\s+/g, '').toLowerCase();
const exe = process.argv[3] || 'C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe';
const maxHits = Number(process.argv[4] || 20);
if (!hex || hex.length % 2) {
  console.error('usage: node animation/tools/find-pe-byte-signature.js <hex> [exePath] [maxHits]');
  process.exit(2);
}
const needle = Buffer.from(hex, 'hex');
const b = fs.readFileSync(exe);
const pe = b.readUInt32LE(0x3c);
const nsec = b.readUInt16LE(pe + 6);
const optSize = b.readUInt16LE(pe + 20);
const sections = [];
const secoff = pe + 24 + optSize;
for (let i = 0; i < nsec; i++) {
  const o = secoff + i * 40;
  const name = b.toString('ascii', o, o + 8).replace(/\0+$/g, '');
  sections.push({
    name,
    va: b.readUInt32LE(o + 12),
    vsize: b.readUInt32LE(o + 8),
    rawSize: b.readUInt32LE(o + 16),
    rawPtr: b.readUInt32LE(o + 20),
  });
}
let hits = 0;
for (const s of sections) {
  if (!s.rawSize) continue;
  const start = s.rawPtr;
  const end = Math.min(b.length, s.rawPtr + s.rawSize);
  const view = b.subarray(start, end);
  let from = 0;
  while (hits < maxHits) {
    const i = view.indexOf(needle, from);
    if (i < 0) break;
    const rva = s.va + i;
    const va = 0x140000000n + BigInt(rva);
    console.log(JSON.stringify({ section: s.name, fileOffset: '0x' + (start + i).toString(16),
      rva: '0x' + rva.toString(16), va: '0x' + va.toString(16) }));
    hits++;
    from = i + 1;
  }
  if (hits >= maxHits) break;
}
console.error(`hits=${hits} exe=${path.resolve(exe)} needleBytes=${needle.length}`);
