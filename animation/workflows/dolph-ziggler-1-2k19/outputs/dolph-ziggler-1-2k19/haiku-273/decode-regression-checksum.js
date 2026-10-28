'use strict';
// Regression checksum of the canonical 2K19 source decode (all phases, body + facial, every frame).
// Used to prove that a refactor of decode-2k19-entrance-source.js leaves the 273 output byte-identical.
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

function findRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'animation', 'tools', 'decode-2k19-entrance-source.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('repository root not found');
    dir = parent;
  }
}
const ROOT = findRoot(__dirname);
const { decodeEntrance } = require(path.join(ROOT, 'animation', 'tools', 'decode-2k19-entrance-source.js'));
const src = process.argv[2] || 'D:/Program Files (x86)/Steam/steamapps/common/WWE 2K19/aurora-2k25-replace-mod-2k19-extracted/entrance/273.bin';
const decoded = decodeEntrance(src);
const h = crypto.createHash('sha256');
for (const p of decoded.phases) {
  h.update(`phase ${p.phase} ${p.durationFrames} ${p.frames}\n`);
  for (const t of p.body) {
    h.update(`body ${t.index} ${t.provenance}\n`);
    for (let f = 0; f < t.p.length; f++) h.update(Buffer.from(new Float64Array([...t.p[f], ...t.q[f]]).buffer));
  }
  for (const t of p.sourceTracks) {
    h.update(`source ${t.index} ${t.hash32}\n`);
    for (let f = 0; f < t.p.length; f++) h.update(Buffer.from(new Float64Array([...t.p[f], ...t.q[f]]).buffer));
  }
  for (const t of p.facial) {
    h.update(`facial ${t.index} ${t.hash32}\n`);
    for (let f = 0; f < t.p.length; f++) h.update(Buffer.from(new Float64Array([...t.p[f], ...t.q[f]]).buffer));
  }
}
process.stdout.write(h.digest('hex').toUpperCase() + '\n');
