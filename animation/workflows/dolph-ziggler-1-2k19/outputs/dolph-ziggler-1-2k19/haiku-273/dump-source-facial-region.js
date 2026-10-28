'use strict';
// Structural dump of the 2K19 273 source facial regions (phase 100 = yanm[1], phase 110 = yanm[3]).
// Region layout to establish: [YANM 7-track facial] [POF0][POF0] [overlay bank: name table + data] [POF0].
const fs = require('node:fs');
const b = fs.readFileSync(process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin');
const hex = (o, n) => b.subarray(o, Math.min(o + n, b.length)).toString('hex').replace(/(.{32})/g, '$1\n').trim();
const ascii = (o, n) => b.subarray(o, Math.min(o + n, b.length)).toString('latin1').replace(/[\x00-\x1f\x7f-\xff]/g, '.');
function dump(label, o, n) {
  process.stdout.write(`== ${label} @${o} (${n} bytes)\n${hex(o, n)}\nASCII: ${ascii(o, n)}\n\n`);
}
// phase 100 facial region 37056..65312 ; phase 110 region 163872..255360
dump('p100 yanmEnd', 38120, 96);
dump('p100 pof0#2', 38220, 96);
dump('p100 gap mid', 41090, 120);
dump('p100 name table head', 41136, 160);
dump('p100 name table near-tail (cLip*)', 42520, 160);
dump('p100 names end', 42920, 120);
dump('p100 data after names', 43040, 96);
dump('p100 trailing pof0', 64928, 96);
dump('p110 yanmEnd', 170128, 96);
dump('p110 pof0#2', 170256, 64);
dump('p110 name head (around 173150)', 173130, 160);
