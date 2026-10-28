'use strict';
// Dump per-name region-2 / region-3 blocks for selected phases and names to infer the block grammar.
const fs = require('node:fs');
const path = require('node:path');
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const HEX = (b, o, n) => b.subarray(o, o + n).toString('hex').replace(/(..)/g, '$1 ').trim();

function load(p) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const recs = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    recs.push({ k, o, nameOff: b.readUInt32BE(o), f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8), u16a: b.readUInt16BE(o + 12), u16b: b.readUInt16BE(o + 14), f16: b.readFloatBE(o + 16), f20: b.readFloatBE(o + 20) });
  }
  return { b, recs, count };
}

function u16arr(b, from, to) { const a = []; for (let o = from; o + 2 <= to; o += 2) a.push(b.readUInt16BE(o)); return a; }
function u8arr(b, from, to) { const a = []; for (let o = from; o < to; o++) a.push(b[o]); return a; }

const phase = Number(process.argv[2] || 110);
const names = process.argv[3] ? process.argv[3].split(',').map(Number) : [0, 1, 2, 3, 4, 5, 60, 118];
const { b, recs, count } = load(phase);
console.log(`phase ${phase} bytes=${b.length} count=${count}`);

// region boundaries
const f2s = recs.map((r) => r.f2); const f3s = recs.map((r) => r.f3);
const region2Start = Math.min(...f2s), region2End = Math.min(...f3s);
const region3Start = Math.min(...f3s), region3End = b.length;
console.log(`region2=[${region2Start},${region2End}) region3=[${region3Start},${region3End})`);

const M_HEAD = { u16a: b.readUInt16BE(0x2C), u16b: b.readUInt16BE(0x2E), f16: b.readFloatBE(0x30), u32_34: b.readUInt32BE(0x34) };
console.log('M_Head header pseudo-record:', JSON.stringify(M_HEAD));

function showBlock(tag, start, end, fmt) {
  console.log(`--- ${tag} [${start},${end}) size=${end - start}`);
  console.log('  hex:', HEX(b, start, Math.min(end - start, 64)));
  if (fmt === 'u16') {
    const a = u16arr(b, start, end);
    console.log(`  u16(${a.length}):`, a.slice(0, 40).join(','));
    if (a.length > 40) console.log('  ...', a.slice(-10).join(','));
  } else {
    const a = u8arr(b, start, end);
    console.log(`  u8(${a.length}):`, a.slice(0, 40).join(','));
    if (a.length > 40) console.log('  ...', a.slice(-10).join(','));
  }
}

// M_Head block: [region2Start, f2[0]) and [region3Start, f3[0]) -- per earlier hypothesis
console.log('\n== leading (M_Head?) blocks ==');
showBlock('r2 M_Head', region2Start, f2s[0], 'u16');
showBlock('r3 M_Head', region3Start, f3s[0], 'u16');

for (const k of names) {
  const r = recs[k];
  const next = recs[k + 1];
  const r2end = next ? next.f2 : region2End;
  const r3end = next ? next.f3 : region3End;
  console.log(`\n== name k=${k} ${b.subarray(r.nameOff, r.nameOff + 16).toString('latin1').replace(/\0+$/, '')} u16a=${r.u16a} u16b=${r.u16b} f16=${r.f16} f20=${r.f20} f2=${r.f2} f3=${r.f3}`);
  showBlock(`r2 k=${k}`, r.f2, r2end, 'u16');
  showBlock(`r3 k=${k}`, r.f3, r3end, 'u16');
}
