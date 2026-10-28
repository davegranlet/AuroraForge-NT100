'use strict';
// Finds the first group where the H3 model (dense: 2-bit header; static: 2+8+stride; explicit: canonical)
// produces an invalid entry list (count > F, or counts that do not sum to F). Prints group-by-group.
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
const { WIDTH_TABLE } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'width-table.js'));

const phaseFile = process.argv[2] || '1100273';
const maxGroups = Number(process.argv[3] || 60);
const buf = fs.readFileSync(path.join('D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced', phaseFile + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g = r.sections.find((s) => s.name === 'group90');
const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
const F = r.frameValue;
const W = r.raw.group78.map((e) => parseInt(e.hex.slice(2, 4), 16));
const rd = new BitReader(stream);
let n = 0;
outer:
for (let t = 0; t < 8; t++) for (let gi = 0; gi < 32; gi++) {
  const k = t * 96 + gi * 3;
  const w = [W[k], W[k + 1], W[k + 2]];
  if (w.every((x) => x === 0)) continue;
  const start = rd.pos;
  const stride = w[0] + w[1] + w[2];
  const flag = rd.read(1), bit2 = rd.read(1);
  let desc;
  if (bit2 === 0) {
    if (flag === 0) { rd.pos = start + 2 + F * stride; desc = `DENSE stride=${stride}`; }
    else { rd.pos = start + 2 + stride + 8; desc = `STATIC stride=${stride}`; }
  } else {
    rd.pos = start;
    const entries = []; let acc = 0; let bad = false;
    for (;;) {
      const f2 = rd.read(1), b2 = rd.read(1);
      const c = b2 === 0 ? F - acc : rd.read(16);
      entries.push(`${f2}:${c}`);
      acc += c;
      if (c > F || c < 0) bad = true;
      if (acc >= F) break;
      if (entries.length > 60) { bad = true; break; }
    }
    const mode = rd.read(8);
    const bW = WIDTH_TABLE[mode];
    rd.pos = start;
    // use the canonical parser for the actual advance, to keep the comparison with the walk exact
    const { parseTimingGroup } = require(path.join(ROOT, 'animation', 'tools', 'clips-codec', 'parse-timing-group.js'));
    const pg = parseTimingGroup(rd, F, w);
    desc = `EXPLICIT mode=${mode} bW=${bW} stride=${stride} entries=${entries.length}${bad ? ' BAD' : ''} [${entries.slice(0, 6).join(' ')}${entries.length > 6 ? ' ...' : ''}]`;
    void pg;
  }
  process.stdout.write(`t${t}.g${gi} @${start} ${desc} -> ${rd.pos}\n`);
  if (++n >= maxGroups) break outer;
}
