'use strict';
// Read-only dump of the native 2K26 273 facial record (8 tracks) structure:
// track identifiers, group38 table, group78 descriptors (scale/width/rest), group90 head.
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
const phase = process.argv[2] || '1000273';
const recIndex = Number(process.argv[3] || 2);
const buf = fs.readFileSync(path.join(NAT, phase + '.clips'));
const layout = parse(buf, { includeRaw: true });
const r = layout.records[recIndex];
const payload = buf.subarray(r.offset, r.offset + r.length);
const trackCount = payload.readUInt32LE(0x20);
const g38 = payload.readUInt32LE(0x38), g60 = payload.readUInt32LE(0x60), gd = payload.readUInt32LE(0x78), g90 = payload.readUInt32LE(0x90);
const out = { phase, recIndex, id: r.id, frames: r.frameValue, fps: r.fps, trackCount, counts: { g38, g60, gd, g90 }, header: payload.subarray(0, 0xA0).toString('hex') };
out.trackIds = r.trackIdentifiers;
const off38 = 0xA0 + trackCount * 8;
out.g38First = Array.from({ length: Math.min(g38, 48) }, (_, i) => payload.readUInt32LE(off38 + i * 4));
out.g38Distinct = [...new Set(Array.from({ length: g38 }, (_, i) => payload.readUInt32LE(off38 + i * 4)))].slice(0, 64);
const off78 = off38 + g38 * 4 + g60 * 8;
const desc = Array.from({ length: gd }, (_, i) => {
  const at = off78 + i * 8;
  return { i, scale: payload.readInt8(at), width: payload[at + 1], b2: payload[at + 2], b3: payload[at + 3], rest: payload.readFloatLE(at + 4) };
});
out.descriptorsTrack0 = desc.slice(0, 24);
out.descriptorsPerTrack = gd / trackCount;
out.descriptorSummary = [...new Set(desc.map((d) => `s${d.scale}/w${d.width}`))].slice(0, 40);
const off90 = off78 + gd * 8;
out.g90Head = Array.from({ length: 12 }, (_, i) => payload.readBigUInt64LE(off90 + i * 8).toString(16).padStart(16, '0'));
process.stdout.write(JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 1) + '\n');
