'use strict';
// Deeper dump of phase-100 bank: header + first records with precise offsets.
const fs = require('node:fs');
const path = require('node:path');
const b = fs.readFileSync(path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays', '1000273-overlays.bin'));
const hex = (o, n) => b.subarray(o, o + n).toString('hex').replace(/(..)/g, '$1 ').trim();
const asc = (o, n) => b.subarray(o, o + n).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
const u32 = (o) => b.readUInt32BE(o);
const f32 = (o) => b.readFloatBE(o);
console.log('len', b.length, '0x' + b.length.toString(16));
for (let o = 0; o < 0xC0; o += 0x10) {
  console.log(o.toString(16).padStart(4, '0') + ': ' + hex(o, 16) + '  ' + asc(o, 16));
}
console.log('--- u32 at candidate record starts ---');
for (let o = 0x24; o < 0xC0; o += 4) {
  console.log('0x' + o.toString(16) + ' u32=' + u32(o) + ' f32=' + f32(o).toFixed(4));
}
console.log('--- u32 at 24-byte pitch from 0x38 ---');
for (let i = 0; i < 8; i++) {
  const o = 0x38 + i * 24;
  console.log(`rec${i} @0x${o.toString(16)}: ${hex(o, 24)}`);
  console.log(`   u32s: ${[0, 4, 8, 12, 16, 20].map((k) => u32(o + k)).join(', ')} f32[20]=${f32(o + 20)}`);
}
console.log('--- u32 at 28-byte pitch from 0x34 ---');
for (let i = 0; i < 8; i++) {
  const o = 0x34 + i * 28;
  console.log(`rec${i} @0x${o.toString(16)}: ${hex(o, 28)}`);
}
