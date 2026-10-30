const fs = require('fs');
const exe = 'C:\\SteamLibrary\\steamapps\\common\\WWE 2K26\\WWE2K26_x64.exe';
const fd = fs.openSync(exe, 'r');
const size = fs.fstatSync(fd).size;
const chunk = 64 * 1024 * 1024;
const buf = Buffer.alloc(chunk + 8);
const hits = new Map();
let carry = 0;
let pos = 0;
while (pos < size) {
  const n = fs.readSync(fd, buf, carry, chunk, pos);
  if (n <= 0) break;
  const total = carry + n;
  for (let i = 0; i + 6 <= total; i++) {
    if (buf[i] === 0x81 && buf[i + 1] === 0x3a) {
      const imm = buf.readUInt32LE(i + 2);
      const off = pos - carry + i;
      if (!hits.has(imm)) hits.set(imm, []);
      const arr = hits.get(imm);
      if (arr.length < 4) arr.push(off);
    }
  }
  carry = Math.min(6, total);
  buf.copy(buf, 0, total - carry, total);
  pos += n;
}
fs.closeSync(fd);
const out = [];
for (const [imm, offs] of hits) out.push({ imm, offs });
out.sort((a, b) => a.imm - b.imm);
const fsout = 'C:\\nt100-codebasemain\\animation\\workflows\\victory-6100-2k19\\opencode-fix-pass-20261030\\05-component-key-immediates.json';
fs.writeFileSync(fsout, JSON.stringify({ count: out.length, hits: out }, null, 1));
console.log('distinct imm32 after 81 3A:', out.length);
