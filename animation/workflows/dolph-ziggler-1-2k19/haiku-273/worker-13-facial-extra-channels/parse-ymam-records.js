'use strict';
// Parse the YMAM overlay-bank header + per-name record array for all five phases.
// Establishes: record stride, name binding, per-record offset fields, and region boundaries.
const fs = require('node:fs');
const path = require('node:path');

const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const PHASES = [100, 110, 120, 130, 140];
const HEX = (b, o, n) => b.subarray(o, o + n).toString('hex');
const NAME_TABLE_START = 2900;

const out = { schema: 'aurora-forge-ymam-records-probe/v1', generated: new Date().toISOString(), phases: [] };

for (const p of PHASES) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const hdr = {
    magic: b.subarray(0, 4).toString('latin1'),
    u32_04: b.readUInt32BE(4), u32_08: b.readUInt32BE(8), u32_0C: b.readUInt32BE(0xC),
    nameLen: b.readUInt32BE(0x10), name0: b.subarray(0x14, 0x24).toString('latin1').replace(/\0+$/, ''),
    count: b.readUInt32BE(0x24), u32_28: b.readUInt32BE(0x28),
    u16_2C: b.readUInt16BE(0x2C), u16_2E: b.readUInt16BE(0x2E),
    f32_30: b.readFloatBE(0x30), u32_34: b.readUInt32BE(0x34),
  };
  const recs = [];
  for (let k = 0; k < hdr.count; k++) {
    const o = 0x38 + 24 * k;
    recs.push({
      k, o,
      nameOff: b.readUInt32BE(o),
      f2: b.readUInt32BE(o + 4),
      f3: b.readUInt32BE(o + 8),
      u16a: b.readUInt16BE(o + 12),
      u16b: b.readUInt16BE(o + 14),
      u32_16: b.readUInt32BE(o + 16), f32_16: b.readFloatBE(o + 16),
      u32_20: b.readUInt32BE(o + 20), f32_20: b.readFloatBE(o + 20),
    });
  }
  // verify name binding: read the name string at each record's nameOff (16-byte slot)
  let nameBindOk = 0;
  const names = [];
  for (const r of recs) {
    const s = b.subarray(r.nameOff, r.nameOff + 16).toString('latin1').replace(/\0+$/, '');
    names.push(s);
    const expOff = NAME_TABLE_START + 16 * r.k;
    if (r.nameOff === expOff) nameBindOk++;
  }
  // region map
  const f2s = recs.map((r) => r.f2);
  const f3s = recs.map((r) => r.f3);
  const minF2 = Math.min(...f2s), maxF2 = Math.max(...f2s);
  const minF3 = Math.min(...f3s), maxF3 = Math.max(...f3s);
  // region 2 blocks: size = next f2 - f2 (sorted order assumption); last size = min(f3) - last f2
  const sortedF2 = [...new Set(f2s)].sort((a, c) => a - c);
  out.phases.push({
    phase: p, bytes: b.length, hdr, nameBindOk, count: recs.length,
    regionMap: { minF2, maxF2, minF3, maxF3, distinctF2: sortedF2.length, distinctF3: new Set(f3s).size },
    distinctF2: sortedF2,
    recs: recs.map((r) => ({ ...r, name: names[r.k] })),
  });
}

fs.writeFileSync(path.join(__dirname, 'ymam-records-probe.json'), JSON.stringify(out, null, 1), 'utf8');

for (const ph of out.phases) {
  console.log(`\n===== phase ${ph.phase} bytes=${ph.bytes} count=${ph.count} nameBindOk=${ph.nameBindOk}`);
  console.log(`hdr: magic=${ph.hdr.magic} u32_04=${ph.hdr.u32_04} u32_08=${ph.hdr.u32_08} u32_0C=${ph.hdr.u32_0C} nameLen=${ph.hdr.nameLen} name0=${ph.hdr.name0} count=${ph.hdr.count} u32_28=${ph.hdr.u32_28} u16_2C=${ph.hdr.u16_2C} u16_2E=${ph.hdr.u16_2E} f32_30=${ph.hdr.f32_30}`);
  console.log(`regionMap: minF2=${ph.regionMap.minF2} maxF2=${ph.regionMap.maxF2} minF3=${ph.regionMap.minF3} maxF3=${ph.regionMap.maxF3} distinctF2=${ph.regionMap.distinctF2} distinctF3=${ph.regionMap.distinctF3}`);
  for (const r of ph.recs.slice(0, 8)) {
    console.log(`  k=${r.k} ${r.name.padEnd(18)} nameOff=${r.nameOff} f2=${r.f2} f3=${r.f3} u16a=${r.u16a} u16b=${r.u16b} f16=${r.f32_16.toExponential(4)} f20=${r.f32_20.toExponential(4)}`);
  }
  const last = ph.recs[ph.recs.length - 1];
  console.log(`  ... last k=${last.k} ${last.name} nameOff=${last.nameOff} f2=${last.f2} f3=${last.f3}`);
}
console.log('\nwritten ymam-records-probe.json');
