'use strict';
// Header-invariant probe for native 2K26 273 records (read-only).
// Prints 0x20 (track count), 0x38 (group38 count), 0x60, 0x78 (descriptor count), 0x90/0x94/0x98/0x9C
// words, plus the canonical timing-walk consumption for each record (track-major, 3-channel groups).
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
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));

const NAT = process.argv[2] || 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const files = process.argv.slice(3).length ? process.argv.slice(3) : ['1000273', '1100273', '1200273', '1300273', '1400273'];

function walkTrackMajor(stream, recFrames, desc, T) {
  const per = desc.length / T;
  const rd = new BitReader(stream);
  const marks = [];
  for (let t = 0; t < T; t++) {
    for (let g = 0; g < per / 3; g++) {
      const k = t * per + g * 3;
      const w = [desc[k].width, desc[k + 1].width, desc[k + 2].width];
      if (w.every((x) => x === 0)) continue;
      try { parseTimingGroup(rd, recFrames, w); } catch (e) { marks.push({ t, g, err: e.message }); break; }
      marks.push({ t, g, end: rd.pos });
    }
    if (rd.pos > stream.length * 8) break;
  }
  return { consumed: rd.pos, marks: marks.slice(0, 6), groupsWalked: marks.length };
}

for (const f of files) {
  const buf = fs.readFileSync(path.join(NAT, f + '.clips'));
  const L = parse(buf, { includeRaw: true });
  L.records.forEach((r, i) => {
    const p = buf.subarray(r.offset, r.offset + r.length);
    const words = [0x20, 0x38, 0x60, 0x78, 0x90, 0x94, 0x98, 0x9c].map((o) => `${o.toString(16)}=${p.readUInt32LE(o)}`);
    const g90 = r.sections.find((s) => s.name === 'group90');
    const desc = r.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16) }));
    let walk = null;
    if (g90 && g90.bytes > 0) {
      const stream = buf.subarray(r.offset + parseInt(g90.relativeOffset, 16), r.offset + parseInt(g90.relativeOffset, 16) + g90.bytes);
      walk = walkTrackMajor(stream, r.frameValue, desc, r.trackIdentifiers.length);
      walk.streamBits = g90.bytes * 8;
    }
    process.stdout.write(`${f} rec${i} T=${r.trackIdentifiers.length} F=${r.frameValue} ${words.join(' ')}` +
      (walk ? ` walkConsumed=${walk.consumed} streamBits=${walk.streamBits} groups=${walk.groupsWalked}` : '') + '\n');
  });
}
