'use strict';
// Exports the decoded 2K19 273 facial tracks (source-only, canonical decoder) as Float32 binaries.
// Per phase file layout: frames x tracks x 7 floats  [q.w q.x q.y q.z  p.x p.y p.z], track order = source index 0..6.
// Channel names are NOT asserted here; see facial-channel-evidence.json for the hypothesis table.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
const outDir = path.join(__dirname, 'facial-source-decoded');
fs.mkdirSync(outDir, { recursive: true });
const decoded = decodeEntrance(src);
const index = { schema: 'aurora-forge-facial-source-f32/v1', layout: 'frames x tracks x 7 float32 LE [qw qx qy qz px py pz]', source: src, sourceSha256: decoded.sourceSha256, phases: [] };
for (const ph of decoded.phases) {
  const frames = ph.frames, tracks = ph.facial.length;
  const buf = Buffer.alloc(frames * tracks * 7 * 4);
  let o = 0;
  for (let f = 0; f < frames; f++) {
    for (let t = 0; t < tracks; t++) {
      const tr = ph.facial[t];
      const vals = [...tr.q[f], ...tr.p[f]];
      for (const v of vals) { buf.writeFloatLE(v, o); o += 4; }
    }
  }
  const name = `${ph.phase}-facial-source.f32`;
  fs.writeFileSync(path.join(outDir, name), buf);
  index.phases.push({ phase: ph.phase, frames, tracks, file: name, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex').toUpperCase(),
    hash32BySourceIndex: ph.facial.map((t) => t.hash32) });
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 1), 'utf8');
process.stdout.write(index.phases.map((p) => `${p.phase} frames=${p.frames} tracks=${p.tracks} bytes=${p.bytes} sha256=${p.sha256.slice(0, 16)}`).join('\n') + '\n');
