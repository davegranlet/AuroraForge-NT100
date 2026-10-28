'use strict';
const fs = require('node:fs');
const MCD = 'D:/WWE2k26-resources/6th/Blender Addon_v2.10.3/WWE2K_MDL/Serialize/baseModel_ref_26.mcd';
const b = fs.readFileSync(MCD);
const s = b.toString('latin1');

function show(needle, before, after) {
  const i = s.indexOf(needle);
  console.log(`\n=== "${needle}" @0x${i.toString(16)}`);
  const from = Math.max(0, i - before);
  const chunk = b.subarray(from, i + after);
  console.log('ascii:', JSON.stringify(chunk.toString('latin1')));
}

show('au001_l', 80, 200);
const j = s.indexOf('b__au');
console.log('\n=== "b__au" @0x' + j.toString(16));
if (j >= 0) console.log('ascii:', JSON.stringify(b.subarray(j - 100, j + 200).toString('latin1')));

// Find the full contiguous NUL-separated list around au001_l; walk backward/forward to list bounds.
{
  const i = s.indexOf('ad033_l');
  let a = i, z = i;
  const isNameChar = (c) => /[A-Za-z0-9_]/.test(c);
  while (a > 0 && (isNameChar(s[a - 1]) || s[a - 1] === '\0')) a--;
  while (z < s.length && (isNameChar(s[z]) || s[z] === '\0')) z++;
  const list = s.slice(a, z).split('\0').filter((x) => x);
  console.log(`\ncontiguous list [0x${a.toString(16)}..0x${z.toString(16)}): ${list.length} entries`);
  console.log('first:', list.slice(0, 12).join(','));
  console.log('last:', list.slice(-12).join(','));
  const au = list.filter((x) => /au\d/.test(x));
  const ads = list.filter((x) => /^ad\d/.test(x));
  console.log(`au entries=${au.length} ad entries=${ads.length} other=${list.length - au.length - ads.length}`);
  fs.writeFileSync(require('node:path').join(__dirname, 'mcd-contiguous-name-list.json'), JSON.stringify(list, null, 1), 'utf8');
}
