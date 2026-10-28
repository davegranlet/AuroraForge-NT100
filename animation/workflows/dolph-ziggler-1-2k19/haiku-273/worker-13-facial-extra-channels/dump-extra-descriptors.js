'use strict';
// Dump the active extra-channel descriptors of the native 1400273 facial record and compute bit budgets.
const fs = require('node:fs');
const path = require('node:path');
function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'clips-layout.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { parse } = require(path.join(ROOT, 'animation', 'tools', 'clips-layout.js'));
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
for (const pf of ['1000273', '1100273', '1200273', '1300273', '1400273']) {
  const buf = fs.readFileSync(path.join(NAT, pf + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(r.offset, r.offset + r.length);
  const descOff = parseInt(r.sections.find((s) => s.name === 'group78 descriptors').relativeOffset, 16);
  const g90 = r.sections.find((s) => s.name === 'group90');
  const g90Off = parseInt(g90.relativeOffset, 16);
  const x9c = payload.readUInt32LE(0x9c);
  const F = r.frameValue;
  console.log(`\n===== ${pf} F=${F} x9c=${x9c} streamBits=${g90.bytes * 8} afterX9c=${g90.bytes * 8 - x9c}`);
  const active = [];
  for (let t = 0; t < 240; t++) {
    const ds = [0, 1, 2].map((c) => {
      const at = descOff + (48 + t * 3 + c) * 8;
      return { scale: payload.readInt8(at), width: payload[at + 1], rest: payload.readFloatLE(at + 4) };
    });
    if (ds.some((d) => d.width > 0)) {
      const sum = ds.reduce((a, d) => a + d.width, 0);
      active.push({ t, localTriple: t, globalTriple: t + 16, ds, sum, bitsDense: F * sum, bitsDensePlus2: F * sum + 2 });
      console.log(`  triple t=${t} (scan idx ${t + 16}) widths=[${ds.map((d) => d.width)}] sum=${sum} bits=${F * sum} rest=[${ds.map((d) => d.rest.toFixed(4))}]`);
    }
  }
  const totalSum = active.reduce((a, x) => a + x.sum, 0);
  console.log(`active=${active.length} totalWidthPerFrame=${totalSum} F*sum=${F * totalSum} +2/group=${F * totalSum + 2 * active.length}`);
}
