'use strict';
// Locate and dump the context of "au001_l" (and other morph names) inside WWE2K26_x64.exe.
const fs = require('node:fs');
const EXE = 'C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe';
const fd = fs.openSync(EXE, 'r');
const size = fs.fstatSync(fd).size;
console.log('exe size', size);
const CHUNK = 64 * 1024 * 1024;
const needles = process.argv[2] ? process.argv[2].split(',') : ['au001_l', 'BrowInn'];
const overlaps = Buffer.alloc(64);
const found = [];
let carry = Buffer.alloc(0);
let pos = 0;
let foundAt = -1;
while (pos < size) {
  const n = Math.min(CHUNK, size - pos);
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, pos);
  for (const needle of needles) {
    const hay = carry.length ? Buffer.concat([carry, buf]) : buf;
    let at = 0;
    for (;;) {
      const i = hay.indexOf(needle, at, 'latin1');
      if (i < 0) break;
      found.push({ needle, abs: pos - carry.length + i });
      at = i + 1;
    }
  }
  carry = buf.subarray(Math.max(0, n - 64));
  pos += n;
  if (found.length > 200) break;
}
fs.closeSync(fd);
console.log('occurrences:', found.length);
for (const f of found.slice(0, 50)) console.log(f.needle, '@0x' + f.abs.toString(16), '(file offset', f.abs, ')');
// dump context around each first occurrence
const fdh = fs.openSync(EXE, 'r');
for (const f of found.slice(0, 6)) {
  const from = Math.max(0, f.abs - 256);
  const buf = Buffer.alloc(768);
  fs.readSync(fdh, buf, 0, 768, from);
  const s = buf.toString('latin1').replace(/[^\x20-\x7e]/g, '.');
  console.log(`\n=== context around 0x${f.abs.toString(16)} ===`);
  console.log(s);
}
fs.closeSync(fdh);
