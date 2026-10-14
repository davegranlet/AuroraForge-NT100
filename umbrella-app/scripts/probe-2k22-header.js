'use strict';
const fs = require('fs');

const archive = process.argv[2];
if (!archive) throw new Error('Pass a WWE 2K22 CAK path.');
const fd = fs.openSync(archive, 'r');
const prefix = Buffer.alloc(88);
fs.readSync(fd, prefix, 0, prefix.length, 0);
fs.closeSync(fd);

const rol8 = (v, n) => n ? ((v << n) | (v >>> (8 - n))) & 255 : v;
const ror8 = (v, n) => n ? ((v >>> n) | (v << (8 - n))) & 255 : v;

function deriveKey(cipher, at, plain) {
  const key = Buffer.alloc(4);
  for (let n = 0; n < 4; n += 1) {
    const j = at + n;
    const beforeXor = ror8(plain[n], (j + 1) & 7);
    const rotatedCipher = ror8(cipher[j], (((j - 1) & 7) ^ 0x0d) & 7);
    key[(j + 1) & 3] = ((beforeXor ^ rotatedCipher) - (j - 1)) & 255;
  }
  return key;
}

function decode(cipher, key) {
  const out = Buffer.alloc(cipher.length);
  for (let j = 0; j < cipher.length; j += 1) {
    const a = ror8(cipher[j], (((j - 1) & 7) ^ 0x0d) & 7);
    const b = a ^ (((j - 1) + key[(j + 1) & 3]) & 255);
    out[j] = rol8(b, (j + 1) & 7);
  }
  return out;
}

const raw = prefix.subarray(8);
const archiveSize = fs.statSync(archive).size;
let found = 0;
for (let folders = 0; folders <= 200000; folders += 1) {
  const known = Buffer.alloc(4); known.writeUInt32LE(folders);
  const key = deriveKey(raw, 4, known);
  const d = decode(raw, key);
  const c = Array.from({length: 20}, (_, i) => d.readUInt32LE(i * 4));
  const files = c[0];
  const valid = c[1] === folders && c[2] === folders * 12 && c[5] === files * 12 &&
    files <= 500000 && c[8] === files * 32 && c[4] >= 88 && c[4] + c[2] === c[7] &&
    c[7] + c[5] === c[10] && c[10] + c[8] === c[13] && c[13] + c[11] === c[16] &&
    c[16] + c[14] <= archiveSize;
  if (valid) {
    console.log(JSON.stringify({key:key.toString('hex'), code:c}, null, 2));
    const inspectFd = fs.openSync(archive, 'r');
    for (const [name, offset, size] of [['files', c[10], Math.min(c[8], 96)], ['folders', c[13], Math.min(c[11], 96)], ['strings', c[16], Math.min(c[14], 256)]]) {
      const bytes = Buffer.alloc(size); fs.readSync(inspectFd, bytes, 0, size, offset);
      const plain = decode(bytes, key);
      console.log(name, plain.toString('hex'), name === 'strings' ? JSON.stringify(plain.toString('latin1')) : '');
    }
    const stringsCipher = Buffer.alloc(c[14]); fs.readSync(inspectFd, stringsCipher, 0, c[14], c[16]);
    const stringsRaw = decode(stringsCipher, key);
    const fileRaw = Buffer.alloc(96); fs.readSync(inspectFd, fileRaw, 0, 96, c[10]);
    const filePlain = decode(fileRaw, key);
    for (let n = 0; n < 3; n += 1) {
      const so = filePlain.readUInt32LE(n * 32), len = stringsRaw[so];
      const sk = Buffer.alloc(4); sk.writeUInt32LE(so);
      console.log('name', n, so, len, 'raw=', stringsRaw.subarray(so + 1, so + 1 + len).toString('utf8'), 'decoded=', decode(stringsRaw.subarray(so + 1, so + 1 + len), sk).toString('utf8'));
    }
    const hashesCipher = Buffer.alloc(c[5]); fs.readSync(inspectFd, hashesCipher, 0, c[5], c[7]);
    const hashes = decode(hashesCipher, key);
    for (let n = 0; n < c[0]; n += 1) if (hashes.readInt32LE(n * 12 + 8) >= 0 && hashes.readInt32LE(n * 12 + 8) < 3) console.log('fileHash', hashes.readInt32LE(n * 12 + 8), hashes.readBigUInt64LE(n * 12).toString(16));
    fs.closeSync(inspectFd);
    found += 1;
  }
}
if (!found) process.exitCode = 2;

module.exports = { decode };
