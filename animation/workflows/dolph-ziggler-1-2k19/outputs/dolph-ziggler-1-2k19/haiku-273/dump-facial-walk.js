'use strict';
// Detailed per-group dump of a native facial record walk (read-only). Usage: node dump-facial-walk.js <phaseFile> <recIndex>
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
const phase = process.argv[2] || '1400273';
const recIndex = Number(process.argv[3] || 2);
const buf = fs.readFileSync(path.join(NAT, phase + '.clips'));
const L = parse(buf, { includeRaw: true });
const r = L.records[recIndex];
const p = buf.subarray(r.offset, r.offset + r.length);
const g90 = r.sections.find((s) => s.name === 'group90');
const stream = buf.subarray(r.offset + parseInt(g90.relativeOffset, 16), r.offset + parseInt(g90.relativeOffset, 16) + g90.bytes);
const desc = r.raw.group78.map((e) => ({ hex: e.hex, scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(e.hex.slice(2, 4), 16), b2: e.hex.slice(4, 6), b3: e.hex.slice(6, 8), rest: e.candidate.f32le[1] }));
const T = r.trackIdentifiers.length;
const per = desc.length / T;
const rd = new BitReader(stream);
process.stdout.write(`${phase} rec${recIndex} T=${T} F=${r.frameValue} streamBits=${stream.length * 8} header9c=${p.readUInt32LE(0x9c)}\n`);
let active = 0;
for (let t = 0; t < T; t++) {
  for (let g = 0; g < per / 3; g++) {
    const k = t * per + g * 3;
    const trio = [0, 1, 2].map((c) => desc[k + c]);
    const w = trio.map((x) => x.width);
    if (w.every((x) => x === 0)) continue;
    active++;
    const start = rd.pos;
    let pg;
    try { pg = parseTimingGroup(rd, r.frameValue, w); } catch (e) { process.stdout.write(`t${t} g${g} ERROR ${e.message} at ${start}\n`); break; }
    const ent = pg.entries.map((e) => `${e.flag}:${e.cnt}`).join(',');
    process.stdout.write(`t${t} g${g} w=${w.join('/')} s=${trio.map((x) => x.scale).join('/')} rest=${trio.map((x) => x.rest.toFixed(4)).join('/')} mode=${pg.mode} bW=${pg.bW} stride=${pg.stride} ent=[${ent}] nrec=${pg.nrec} ${start}->${rd.pos}\n`);
    if (active >= 40) break;
  }
  if (active >= 40) break;
}
process.stdout.write(`walkEnd=${rd.pos} streamBits=${stream.length * 8}\n`);
