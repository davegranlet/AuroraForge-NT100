'use strict';
const fs = require('node:fs');
const { findBodySections, readStream } = require('C:/AFnt100b3/animation/tools/export-2k20-ir.js');
const buf = fs.readFileSync('D:/forge-files/Extracted Files/2k20/Root/Animation/Entrance/275.acts');
for (const [si, sec] of findBodySections(buf).entries()) {
  for (const tr of [13, 14, 48, 49]) {
    const at = sec.off + 16 + tr * 40;
    const keys = readStream(buf, sec.off + 8, buf.readUInt32BE(at + 8), buf.readUInt32BE(at + 12), false, false);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].packed[0] !== -32768 || keys[i].packed[2] !== -32768) continue;
      console.log(JSON.stringify({ phase: 100 + si * 10, tr, window: keys.slice(Math.max(0, i - 1), i + 2).map(k => ({ f: k.frame, v: k.packed })) }));
    }
  }
}
