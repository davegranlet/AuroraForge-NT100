'use strict';
// scan-exe-states.js — targeted search of the WWE 2K19 executable and the decoded
// camera_ai tables for the presentation state names and their hash encodings.
const fs = require('node:fs');
const path = require('node:path');

const EXE = 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/WWE2K19_x64.exe';
const CAMAI = path.join(__dirname, 'camera-ai');
const states = ['Runin_Ring', 'Runin_Ramp', 'Runin_Stage', 'Stand', 'Arena', 'Ring', 'RingIn', 'Ramp', 'Stage'];

// source hash: ROL32(h,7) XOR byte (case-sensitive)
function rol32(v, n) { return (((v << n) | (v >>> (32 - n))) >>> 0); }
function srcHash(s) { let h = 0; for (const b of Buffer.from(s, 'ascii')) h = (rol32(h, 7) ^ b) >>> 0; return h; }
const M64 = (1n << 64n) - 1n;
function fnv64(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s, 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & M64; } return v; }

const exe = fs.readFileSync(EXE);
console.log('exe bytes', exe.length);
for (const s of states) {
  const i = exe.indexOf(s);
  const sh = srcHash(s);
  const fh = fnv64(s);
  const shLE = Buffer.alloc(4); shLE.writeUInt32LE(sh);
  const shBE = Buffer.alloc(4); shBE.writeUInt32BE(sh);
  const fhLE = Buffer.alloc(8); fhLE.writeBigUInt64LE(fh);
  const fhBE = Buffer.alloc(8); fhBE.writeBigUInt64BE(fh);
  console.log(s.padEnd(13), 'ascii:', i >= 0 ? '0x' + i.toString(16) : '-',
    '| srchash LE:', exe.indexOf(shLE) >= 0 ? '0x' + exe.indexOf(shLE).toString(16) : '-',
    'BE:', exe.indexOf(shBE) >= 0 ? '0x' + exe.indexOf(shBE).toString(16) : '-',
    '| fnv64 LE:', exe.indexOf(fhLE) >= 0 ? '0x' + exe.indexOf(fhLE).toString(16) : '-',
    'BE:', exe.indexOf(fhBE) >= 0 ? '0x' + exe.indexOf(fhBE).toString(16) : '-');
}
console.log('\ncamera_ai decoded tables:');
for (const f of fs.readdirSync(CAMAI).filter((x) => x.endsWith('.decoded.bin'))) {
  const b = fs.readFileSync(path.join(CAMAI, f));
  const hits = [];
  for (const s of states) {
    if (b.includes(Buffer.from(s, 'ascii'))) hits.push('ascii:' + s);
    const shLE = Buffer.alloc(4); shLE.writeUInt32LE(srcHash(s));
    if (b.includes(shLE)) hits.push('srchash:' + s);
  }
  console.log(' ', f, b.length, hits.length ? hits.join(',') : '(no state hits)');
}
