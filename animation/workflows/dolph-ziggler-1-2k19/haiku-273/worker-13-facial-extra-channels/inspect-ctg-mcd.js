'use strict';
// Inspect baseModel_ref_26.ctg (82KB) fully: strings + hexdump segments; also examine the .mcd morph-name
// list neighborhood for adjacent IDs/counts.
const fs = require('node:fs');
const CTG = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.ctg';
const MCD = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.mcd';
const c = fs.readFileSync(CTG);
console.log('ctg bytes', c.length);
const s = c.toString('latin1');
const strs = [...new Set(s.match(/[\x20-\x7e]{4,120}/g) || [])];
console.log('ctg strings:', strs.length);
for (const t of strs.slice(0, 120)) console.log('  ', t);
fs.writeFileSync(require('node:path').join(__dirname, 'ctg-strings.txt'), strs.join('\n'), 'utf8');

// .mcd: dump hex around au001_l and around list boundaries
const b = fs.readFileSync(MCD);
function dump(buf, center, before, after, label) {
  console.log(`\n=== ${label} @0x${center.toString(16)}`);
  const from = Math.max(0, center - before);
  const to = Math.min(buf.length, center + after);
  for (let o = from; o < to; o += 16) {
    const hex = buf.subarray(o, o + 16).toString('hex').replace(/(..)/g, '$1 ').trim();
    const asc = buf.subarray(o, o + 16).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    console.log(o.toString(16).padStart(7, '0') + ': ' + hex.padEnd(48) + ' ' + asc);
  }
}
const i = s.indexOf('ad033_l');
dump(b, i, 96, 160, 'first ad/au name');
const j = s.indexOf('skinned');
dump(b, j, 64, 96, 'list start (skinned)');
