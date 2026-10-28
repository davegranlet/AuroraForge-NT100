'use strict';
// Parse the five source YMAM overlay banks into per-name keyframe curves under BOTH candidate
// associations (A: record k -> block k; B: record k -> block k+1, block 0 = M_Head).
// Emit machine-readable evidence and semantics probes (blink/jaw/emotion curve shapes).
const fs = require('node:fs');
const path = require('node:path');
const OVERLAYS = path.resolve(__dirname, '..', '..', 'outputs', 'dolph-ziggler-1-2k19', 'facial-overlays');
const PHASES = [100, 110, 120, 130, 140];

function parseBank(p) {
  const b = fs.readFileSync(path.join(OVERLAYS, `${p}0273-overlays.bin`));
  const count = b.readUInt32BE(0x24);
  const recs = [];
  for (let k = 0; k < count; k++) {
    const o = 0x38 + 24 * k;
    const rec = { k, o, nameOff: b.readUInt32BE(o), f2: b.readUInt32BE(o + 4), f3: b.readUInt32BE(o + 8), u16a: null, u16b: null, f16: null, f20: null };
    if (o + 24 <= 0xB54) {
      rec.u16a = b.readUInt16BE(o + 12); rec.u16b = b.readUInt16BE(o + 14);
      rec.f16 = b.readFloatBE(o + 16); rec.f20 = b.readFloatBE(o + 20);
    }
    rec.name = b.subarray(rec.nameOff, rec.nameOff + 16).toString('latin1').replace(/\0+$/, '');
    recs.push(rec);
  }
  const header = {
    mead: b.subarray(0x14, 0x24).toString('latin1').replace(/\0+$/, ''),
    u16a: b.readUInt16BE(0x2C), u16b: b.readUInt16BE(0x2E), f16: b.readFloatBE(0x30), f20: b.readFloatBE(0x34),
  };
  const f2s = recs.map((r) => r.f2).sort((a, c) => a - c);
  const f3s = recs.map((r) => r.f3).sort((a, c) => a - c);
  const region2End = Math.min(...f3s);
  const region3End = b.length;
  const starts2 = [...new Set(f2s)];
  const starts3 = [...new Set(f3s)];
  function blocks(starts, end) {
    const out = [];
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      const e = i + 1 < starts.length ? starts[i + 1] : end;
      out.push({ i, start: s, end: e, size: e - s });
    }
    return out;
  }
  const b2 = blocks(starts2, region2End);
  const b3 = blocks(starts3, region3End);
  return { b, count, recs, header, b2, b3 };
}

function curve(bank, block2, block3) {
  const frames = [];
  for (let o = block2.start; o + 2 <= block2.end; o += 2) frames.push(bank.readUInt16BE(o));
  const values = [];
  for (let o = block3.start; o < block3.end; o++) values.push(bank[o]);
  return { frames, values };
}

const out = { schema: 'worker13-source-ymam-curves/v1', generated: new Date().toISOString(), phases: [] };

for (const p of PHASES) {
  const bank = parseBank(p);
  // compute shift evidence: u16a(k) vs b2[k].size/2 and b2[k+1].size/2
  const shift = [];
  for (let k = 0; k < bank.recs.length; k++) {
    const r = bank.recs[k];
    if (r.u16a == null) { shift.push({ k, name: r.name, u16a: null }); continue; }
    const own = bank.b2[k] ? bank.b2[k].size / 2 : null;
    const next = bank.b2[k + 1] ? bank.b2[k + 1].size / 2 : null;
    shift.push({ k, name: r.name, u16a: r.u16a, ownBlockCount: own, nextBlockCount: next, matchesOwn: r.u16a === own, matchesNext: r.u16a === next });
  }
  out.phases.push({ phase: p, header: bank.header, count: bank.count, region2Blocks: bank.b2.length, region3Blocks: bank.b3.length, shift });
}

// semantics probe: dump curves for a few known names under association A (record k -> b2[k]) to see shapes.
function summaryValues(values) {
  const u = new Set(values);
  let mx = 0, mn = 255;
  for (const v of values) { if (v > mx) mx = v; if (v < mn) mn = v; }
  return { n: values.length, distinct: u.size, min: mn, max: mx };
}

const probes = { schema: 'worker13-source-ymam-semantics-probe/v1', phases: [] };
for (const p of PHASES) {
  const bank = parseBank(p);
  const recs = bank.recs;
  const items = [];
  for (const name of ['BrowInn_L_Dn', 'Eye_L_Blink', 'Eye_R_Blink', 'Jaw_Dn', 'Jaw_Up', 'Mouth_Up', 'Anger', 'Surprise', 'Signature', 'Signature_D', 'Happy_D']) {
    const k = recs.findIndex((r) => r.name === name);
    if (k < 0) continue;
    const a = curve(bank.b, bank.b2[k], bank.b3[k]);
    const bAssoc = k + 1 < bank.b2.length ? curve(bank.b, bank.b2[k + 1], bank.b3[k + 1]) : null;
    items.push({ k, name, u16a: recs[k].u16a, A: { frames: a.frames.slice(0, 12), framesN: a.frames.length, values: summaryValues(a.values), firstValues: a.values.slice(0, 16) }, B: bAssoc ? { framesN: bAssoc.frames.length, values: summaryValues(bAssoc.values), firstValues: bAssoc.values.slice(0, 16) } : null });
  }
  probes.phases.push({ phase: p, items });
}

fs.writeFileSync(path.join(__dirname, 'source-ymam-curves.json'), JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync(path.join(__dirname, 'source-ymam-semantics-probe.json'), JSON.stringify(probes, null, 1), 'utf8');

for (const ph of out.phases) {
  const matchOwn = ph.shift.filter((x) => x.matchesOwn).length;
  const matchNext = ph.shift.filter((x) => x.matchesNext).length;
  console.log(`phase ${ph.phase}: records=${ph.shift.length} matchesOwn=${matchOwn} matchesNext=${matchNext} headerU16a=${ph.header.u16a} block0count=${ph.region2Blocks ? '' : ''}`);
  const b0 = ph.shift[0];
  console.log(`  rec0 ${b0.name}: u16a=${b0.u16a} own=${b0.ownBlockCount} next=${b0.nextBlockCount}`);
}
for (const ph of probes.phases) {
  console.log(`\n=== probes phase ${ph.phase}`);
  for (const it of ph.items) {
    console.log(`  ${it.name.padEnd(14)} A: frames=${it.A.framesN} vals=${JSON.stringify(it.A.values)} first=${it.A.firstValues.slice(0, 10).join(',')}`);
    if (it.B) console.log(`  ${''.padEnd(14)} B: frames=${it.B.framesN} vals=${JSON.stringify(it.B.values)} first=${it.B.firstValues.slice(0, 10).join(',')}`);
  }
}
