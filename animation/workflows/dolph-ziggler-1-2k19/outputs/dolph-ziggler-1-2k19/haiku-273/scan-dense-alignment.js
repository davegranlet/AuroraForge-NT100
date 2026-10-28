'use strict';
// Alignment oracle for dense (mode-0) groups of a native facial record.
// For each dense group, scan its value-block start by delta bits and score the decoded per-frame
// channels by roughness (mean |second difference| / range). Smooth trajectories -> correct alignment.
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
const { readBitsAt } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'read-bits-at.js'));

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const phase = process.argv[2] || '1400273';
const recIndex = Number(process.argv[3] || 2);
const RANGE = Number(process.argv[4] || 80);
const buf = fs.readFileSync(path.join(NAT, phase + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records[recIndex];
const g90 = r.sections.find((s) => s.name === 'group90');
const stream = buf.subarray(r.offset + parseInt(g90.relativeOffset, 16), r.offset + parseInt(g90.relativeOffset, 16) + g90.bytes);
const desc = r.raw.group78.map((e) => ({ scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), rest: e.candidate.f32le[1] }));
const T = r.trackIdentifiers.length, per = desc.length / T, F = r.frameValue;

function roughness(series) {
  const mx = Math.max(...series), mn = Math.min(...series), rng = mx - mn;
  if (rng <= 0) return 0;
  let s = 0;
  for (let i = 1; i + 1 < series.length; i++) s += Math.abs(series[i + 1] - 2 * series[i] + series[i - 1]);
  return (s / (series.length - 2)) / rng;
}
function decodeDense(vbase, trio, stride) {
  const offs = [0, trio[0].width, trio[0].width + trio[1].width];
  const cols = [[], [], []];
  for (let f = 0; f < F; f++) {
    const at = vbase + f * stride;
    for (let c = 0; c < 3; c++) {
      const w = trio[c].width;
      cols[c].push(w === 0 ? trio[c].rest : readBitsAt(stream, at + offs[c], w) * Math.pow(2, trio[c].scale) + trio[c].rest);
    }
  }
  return cols;
}

// Walk with the canonical parser to get each active group's start, header-end and the dense value position.
const rd = new BitReader(stream);
const groups = [];
for (let t = 0; t < T; t++) for (let g = 0; g < per / 3; g++) {
  const k = t * per + g * 3;
  const trio = [0, 1, 2].map((c) => desc[k + c]);
  if (trio.every((x) => x.width === 0)) continue;
  const start = rd.pos;
  const pg = parseTimingGroup(rd, F, trio.map((x) => x.width));
  groups.push({ t, g, trio, start, pg, end: rd.pos });
}
const out = [];
for (const G of groups) {
  if (G.pg.mode !== 0) continue; // dense only
  const stride = G.pg.stride;
  const base = G.pg.vbase; // value block start as the canonical parser sees it
  let best = null;
  for (let d = -RANGE; d <= RANGE; d++) {
    const cols = decodeDense(base + d, G.trio, stride);
    const score = cols.map((c, ci) => (G.trio[ci].width ? roughness(c) : 0));
    const total = score.reduce((a, b) => a + b, 0);
    if (!best || total < best.total) best = { d, total, score };
  }
  const zero = decodeDense(base, G.trio, stride);
  const zeroScore = zero.map((c, ci) => (G.trio[ci].width ? roughness(c) : 0)).reduce((a, b) => a + b, 0);
  out.push({ t: G.t, g: G.g, widths: G.trio.map((x) => x.width), stride, vbase: base, bestDelta: best.d, bestRough: +best.total.toFixed(4), zeroRough: +zeroScore.toFixed(4), channelsAtBest: best.score.map((x) => +x.toFixed(4)) });
}
process.stdout.write(`${phase} rec${recIndex} F=${F} streamBits=${stream.length * 8}\n`);
for (const o of out) process.stdout.write(JSON.stringify(o) + '\n');
