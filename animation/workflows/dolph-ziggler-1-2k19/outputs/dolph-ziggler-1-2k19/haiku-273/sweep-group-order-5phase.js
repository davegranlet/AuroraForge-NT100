'use strict';
// Group-order sweep over all five native facial records. Oracle: the canonical walk must end within
// the qword bound (streamBits - 64, streamBits] with no error. A correct order should pass 5/5.
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

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const phases = ['1000273', '1100273', '1200273', '1300273', '1400273'];
const recs = phases.map((ph) => {
  const buf = fs.readFileSync(path.join(NAT, ph + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const idx = L.records.findIndex((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const r = L.records[idx];
  const g = r.sections.find((s) => s.name === 'group90');
  const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
  const desc = r.raw.group78.map((e) => ({ width: parseInt(e.hex.slice(2, 4), 16) }));
  return { ph, F: r.frameValue, stream, desc, T: 8, per: desc.length / 8 };
});

// Triple index sets: tr = track, gi = triple index inside the track (0..31)
const orders = {
  trackMajor: (T, G) => { const o = []; for (let t = 0; t < T; t++) for (let g = 0; g < G; g++) o.push([t, g]); return o; },
  groupMajor: (T, G) => { const o = []; for (let g = 0; g < G; g++) for (let t = 0; t < T; t++) o.push([t, g]); return o; },
  trackMajorTracksReversed: (T, G) => { const o = []; for (let t = T - 1; t >= 0; t--) for (let g = 0; g < G; g++) o.push([t, g]); return o; },
  groupMajorTracksReversed: (T, G) => { const o = []; for (let g = 0; g < G; g++) for (let t = T - 1; t >= 0; t--) o.push([t, g]); return o; },
  trackMajorGroupsReversed: (T, G) => { const o = []; for (let t = 0; t < T; t++) for (let g = G - 1; g >= 0; g--) o.push([t, g]); return o; },
  groupMajorGroupsReversed: (T, G) => { const o = []; for (let g = G - 1; g >= 0; g--) for (let t = 0; t < T; t++) o.push([t, g]); return o; },
  // six-descriptor blocks: block b = triples 2b, 2b+1 ; group-major over blocks
  blockMajor: (T, G) => { const o = []; for (let b = 0; b < G / 2; b++) for (let t = 0; t < T; t++) { o.push([t, 2 * b]); o.push([t, 2 * b + 1]); } return o; },
  blockMajorTrackFirst: (T, G) => { const o = []; for (let t = 0; t < T; t++) for (let b = 0; b < G / 2; b++) { o.push([t, 2 * b]); o.push([t, 2 * b + 1]); } return o; },
  // channel-major: all tracks' triple-0 first... already groupMajor; try triple index by stride 4 interleave
  strideFour: (T, G) => { const o = []; for (let s = 0; s < 4; s++) for (let t = 0; t < T; t++) for (let g = s; g < G; g += 4) o.push([t, g]); return o; },
};

function walk(rec, order) {
  const rd = new BitReader(rec.stream);
  let groups = 0, error = null;
  try {
    for (const [t, g] of order) {
      const k = t * rec.per + g * 3;
      const w = [rec.desc[k].width, rec.desc[k + 1].width, rec.desc[k + 2].width];
      if (w.every((x) => x === 0)) continue;
      parseTimingGroup(rd, rec.F, w);
      groups++;
      if (rd.pos > rec.stream.length * 8) { error = 'overrun'; break; }
    }
  } catch (e) { error = e.message; }
  const sb = rec.stream.length * 8;
  return { end: rd.pos, sb, ok: !error && rd.pos <= sb && rd.pos > sb - 64, error, groups };
}

for (const [name, mk] of Object.entries(orders)) {
  const rows = recs.map((rec) => {
    const order = mk(rec.T, rec.per / 3);
    return walk(rec, order);
  });
  const pass = rows.filter((x) => x.ok).length;
  process.stdout.write(`${name.padEnd(28)} pass=${pass}/5 :: ${rows.map((x) => `${x.end}/${x.sb}${x.ok ? '' : '!'}${x.error ? '(' + x.error + ')' : ''}`).join('  ')}\n`);
}
