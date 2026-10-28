'use strict';
// Sweeps header variants for single-entry groups of native facial records and scores each variant on all
// five phases. Variant = (denseModeBits in {0,8}) x (staticModeBits in {0,8}) x (staticRecords in {0,1}).
// Explicit-count groups always use the canonical parseTimingGroup (16-bit counts, 8-bit mode, codes, values).
// Score per phase: boundary (0x9C is a group start) and qword bound (walk end inside (streamBits-64, streamBits]).
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
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const g = r.sections.find((s) => s.name === 'group90');
  const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
  return { ph, F: r.frameValue, stream, W: r.raw.group78.map((e) => parseInt(e.hex.slice(2, 4), 16)), per: 96, x9c: buf.readUInt32LE(r.offset + 0x9c) };
});

function score(rec, cfg) {
  const { F, stream, W, per } = rec;
  const sb = stream.length * 8;
  const rd = new BitReader(stream);
  const starts = new Set();
  let error = null;
  try {
    for (let t = 0; t < 8; t++) for (let gi = 0; gi < per / 3; gi++) {
      const k = t * per + gi * 3;
      const w = [W[k], W[k + 1], W[k + 2]];
      if (w.every((x) => x === 0)) continue;
      const start = rd.pos;
      starts.add(start);
      const stride = w[0] + w[1] + w[2];
      const flag = rd.read(1), bit2 = rd.read(1);
      if (bit2 === 0) {
        if (flag === 0) rd.pos = start + 2 + cfg.denseMode + F * stride;
        else rd.pos = start + 2 + cfg.staticMode + cfg.staticRecords * stride;
      } else {
        rd.pos = start;
        parseTimingGroup(rd, F, w);
      }
      if (rd.pos > sb + 64) { error = 'overrun'; break; }
    }
  } catch (e) { error = e.message; }
  const end = rd.pos;
  const boundary = starts.has(rec.x9c);
  const qword = !error && end <= sb && end > sb - 64;
  return { end, sb, boundary, qword, error };
}

const configs = [];
for (const denseMode of [0, 8]) for (const staticMode of [0, 8]) for (const staticRecords of [0, 1]) configs.push({ denseMode, staticMode, staticRecords });
for (const cfg of configs) {
  const rows = recs.map((rec) => score(rec, cfg));
  const pass = rows.filter((x) => x.qword && x.boundary).length;
  process.stdout.write(`dense+${cfg.denseMode} static+${cfg.staticMode} staticRec=${cfg.staticRecords} pass=${pass}/5 :: ${rows.map((x) => `${x.end}/${x.sb}${x.qword ? '' : '!'}${x.boundary ? '' : 'b'}`).join(' ')}\n`);
}
