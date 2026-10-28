'use strict';
// final-qa: independent channel-identity check for cam-A.
// Confirms at decoded-series level: A track0 rotation == 673B track0 rotation (max delta),
// A track0 position == 9D94 (and != 673B if differs), A track1 target == 9D94,
// so the 22:10 owner observation is a rotation-only (A) render and its dark signature
// cannot be attributed to position/target. Writes only under final-qa/.
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
const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
const { BitReader } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'bit-reader.js'));
const { evalGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'eval-group.js'));
const HERE = __dirname;

const D = {
  camA: path.join(HERE, 'artifacts', 'cached_camA'),
  n9D94: path.join(HERE, 'artifacts', 'cached_9D94'),
  n673B: path.join(HERE, 'artifacts', 'cached_673B'),
};
function getDesc(rec, i) {
  const e = rec.raw.group78[i];
  return { scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] };
}
function decode(rec, buf) {
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const off = parseInt(g90.relativeOffset, 16);
  const stream = buf.subarray(rec.offset + off, rec.offset + off + g90.bytes);
  const rd = new BitReader(stream);
  const tracks = [];
  for (let t = 0; t < rec.trackIdentifiers.length; t++) {
    const d = [0, 1, 2, 3, 4, 5].map((s) => getDesc(rec, t * 6 + s));
    const pg = parseTimingGroup(rd, rec.frameValue, [d[0].width, d[1].width, d[2].width]);
    const pos = pg.skipped ? null : evalGroup(stream, pg, [d[0], d[1], d[2]], rec.frameValue);
    const rg = parseTimingGroup(rd, rec.frameValue, [d[3].width, d[4].width, d[5].width]);
    const rot = rg.skipped ? null : evalGroup(stream, rg, [d[3], d[4], d[5]], rec.frameValue);
    tracks.push({ t, id: rec.trackIdentifiers[t], pos, rot });
  }
  return tracks;
}
const maxDelta = (a, b, len) => {
  if (!a || !b) return null;
  let m = 0; const n = Math.min(a.length, b.length, len || a.length);
  for (let i = 0; i < n; i++) for (let c = 0; c < a[i].length; c++) m = Math.max(m, Math.abs(a[i][c] - b[i][c]));
  return +m.toFixed(8);
};
const out = { schema: 'aurora-forge-final-qa-A-identity/v1', generated: new Date().toISOString(), phases: [] };
for (let p = 0; p < 5; p++) {
  const load = (dir) => {
    const f = path.join(dir, 'Animation', 'CaeAdvanced', `1${p}14002.clips`);
    const buf = fs.readFileSync(f);
    const layout = parse(buf, { includeRaw: true });
    const cam = layout.records.find((r) => r.trackIdentifiers.length === 3);
    return decode(cam, buf);
  };
  const A = load(D.camA), N = load(D.n9D94), B = load(D.n673B);
  const row = {
    phase: 100 + p * 10,
    trackIds: A.map((t) => t.id),
    rot0: { A_vs_673B: maxDelta(A[0].rot, B[0].rot), A_vs_9D94: maxDelta(A[0].rot, N[0].rot) },
    pos0: { A_vs_9D94: maxDelta(A[0].pos, N[0].pos), A_vs_673B: maxDelta(A[0].pos, B[0].pos) },
    pos1_target: { A_vs_9D94: maxDelta(A[1].pos, N[1].pos), A_vs_673B: maxDelta(A[1].pos, B[1].pos) },
    pos2_third: { A_vs_9D94: maxDelta(A[2].pos, N[2].pos) },
  };
  out.phases.push(row);
  console.log(`phase ${row.phase}: rot0 A==673B delta ${row.rot0.A_vs_673B} (A vs 9D94 ${row.rot0.A_vs_9D94}) | pos0 A vs 9D94 ${row.pos0.A_vs_9D94} (A vs 673B ${row.pos0.A_vs_673B}) | target1 A vs 9D94 ${row.pos1_target.A_vs_9D94} (A vs 673B ${row.pos1_target.A_vs_673B}) | third2 A vs 9D94 ${row.pos2_third.A_vs_9D94}`);
}
fs.writeFileSync(path.join(HERE, 'A-channel-identity-check.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('A-channel-identity-check.json written');
