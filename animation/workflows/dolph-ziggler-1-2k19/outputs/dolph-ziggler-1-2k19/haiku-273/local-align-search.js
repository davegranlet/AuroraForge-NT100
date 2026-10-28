'use strict';
// Local alignment search: for a group expected near a given bit position, which offsets yield a valid
// explicit entry list (counts <= F and summing exactly to F, then a plausible mode and values)?
// Usage: node local-align-search.js <phaseFile> <expectedBit> <radius>
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
const expected = Number(process.argv[3] || 71384);
const radius = Number(process.argv[4] || 40);
const buf = fs.readFileSync(path.join('D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced', phaseFile + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
const g = r.sections.find((s) => s.name === 'group90');
const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
const F = r.frameValue;
const sb = stream.length * 8;

function tryAt(pos) {
  const rd = new BitReader(stream);
  rd.pos = pos;
  const entries = []; let acc = 0;
  for (;;) {
    const f2 = rd.read(1), b2 = rd.read(1);
    const c = b2 === 0 ? F - acc : rd.read(16);
    if (c > F || c < 0) return null;
    entries.push(`${f2}:${c}`);
    acc += c;
    if (acc >= F) break;
    if (entries.length > 40) return null;
  }
  const mode = rd.read(8);
  return { entries: entries.join(' '), mode, bW: WIDTH_TABLE[mode], afterMode: rd.pos };
}

for (let d = -radius; d <= radius; d++) {
  const res = tryAt(expected + d);
  if (res) process.stdout.write(`delta ${d >= 0 ? '+' : ''}${d} pos=${expected + d} entries=[${res.entries}] mode=${res.mode} bW=${res.bW} afterMode=${res.afterMode}\n`);
}
process.stdout.write(`streamBits=${sb} F=${F}\n`);
