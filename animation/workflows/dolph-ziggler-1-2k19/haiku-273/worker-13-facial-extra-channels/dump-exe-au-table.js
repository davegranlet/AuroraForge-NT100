'use strict';
// Raw hex/ascii dump around the au-name table in WWE2K26_x64.exe and structural probes.
const fs = require('node:fs');
const EXE = 'C:/SteamLibrary/steamapps/common/WWE 2K26/WWE2K26_x64.exe';
const CENTER = 0x3d65f48;
const fd = fs.openSync(EXE, 'r');
const before = 0x400, after = 0x800;
const buf = Buffer.alloc(before + after);
fs.readSync(fd, buf, 0, before + after, CENTER - before);
fs.closeSync(fd);
const hex = (o, n) => buf.subarray(o, o + n).toString('hex').replace(/(..)/g, '$1 ').trim();
const asc = (o, n) => buf.subarray(o, o + n).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
for (let o = 0; o < before + after; o += 16) {
  const abs = CENTER - before + o;
  console.log(abs.toString(16).padStart(9, '0') + ': ' + hex(o, 16).padEnd(48) + '  ' + asc(o, 16));
}
