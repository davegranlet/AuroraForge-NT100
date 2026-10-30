const fs = require('fs');
const exe = 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26\\WWE2K26_x64.exe';
const fd = fs.openSync(exe, 'r');
const head = Buffer.alloc(0x1000);
fs.readSync(fd, head, 0, head.length, 0);
const peOff = head.readUInt32LE(0x3c);
const coff = peOff + 4;
const numSections = head.readUInt16LE(coff + 2);
const optSize = head.readUInt16LE(coff + 16);
const optOff = coff + 20;
const imageBase = Number(head.readBigUInt64LE(optOff + 24));
const secOff = optOff + optSize;
const sections = [];
for (let i = 0; i < numSections; i++) {
  const o = secOff + i * 40;
  const name = head.toString('ascii', o, o + 8).replace(/\0.*$/, '');
  const vsize = head.readUInt32LE(o + 8);
  const va = head.readUInt32LE(o + 12);
  const rawSize = head.readUInt32LE(o + 16);
  const rawPtr = head.readUInt32LE(o + 20);
  sections.push({ name, vsize, va, rawSize, rawPtr });
}
console.log('imageBase', '0x' + imageBase.toString(16));
for (const s of sections) console.log(s.name, 'VA 0x' + s.va.toString(16), 'vsize 0x' + s.vsize.toString(16), 'raw 0x' + s.rawPtr.toString(16), 'rawsize 0x' + s.rawSize.toString(16));
function vaOfFileOff(off) {
  for (const s of sections) {
    if (off >= s.rawPtr && off < s.rawPtr + s.rawSize) return imageBase + s.va + (off - s.rawPtr);
  }
  return null;
}
function fileOffOfVa(va) {
  for (const s of sections) {
    if (va >= imageBase + s.va && va < imageBase + s.va + s.vsize) return s.rawPtr + (va - imageBase - s.va);
  }
  return null;
}
for (const off of [0x10b6a10, 0x1875430, 0x2793bd0, 0x186e7b0, 0x1adf210, 0x1adf401]) {
  const va = vaOfFileOff(off);
  console.log('file 0x' + off.toString(16), 'VA', va ? '0x' + va.toString(16) : '?');
}
for (const va of [0x14186e7b0, 0x141adf210, 0x141adf401]) {
  const off = fileOffOfVa(va);
  console.log('VA 0x' + va.toString(16), 'file', off ? '0x' + off.toString(16) : '?');
  if (off) {
    const b = Buffer.alloc(32);
    fs.readSync(fd, b, 0, 32, off);
    console.log('  bytes', b.toString('hex'));
  }
}
fs.closeSync(fd);
