'use strict';
// Extract morph-target-like names from the 2K26 base model reference (.mcd) and show their raw form/context.
const fs = require('node:fs');
const MCD = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.mcd';
const b = fs.readFileSync(MCD);
const s = b.toString('latin1');
// candidate names: runs of [A-Za-z0-9_] containing '__' or starting with b_/M_ etc.
const re = /[A-Za-z0-9_]{3,64}/g;
const counts = new Map();
let m;
while ((m = re.exec(s))) {
  const t = m[0];
  if (!/__|_au|au\d/.test(t)) continue;
  counts.set(t, (counts.get(t) || 0) + 1);
}
console.log('candidate morph-name-like tokens:', counts.size);
const names = [...counts.keys()];
console.log('samples:', names.slice(0, 40).join(' | '));
// exact context around first au001_l
const i = s.indexOf('au001_l');
console.log('context:', JSON.stringify(s.slice(i - 40, i + 80)));
// Count unique names ending _l/_r or combos
const au = names.filter((n) => /au\d/.test(n));
console.log('au-containing names:', au.length);
// print a full listing of the first 200 to a file
fs.writeFileSync(require('node:path').join(__dirname, 'morph-name-candidates.txt'), names.join('\n'), 'utf8');
console.log('written morph-name-candidates.txt');
