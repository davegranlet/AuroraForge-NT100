'use strict';
// Parameter sweep for the timing-group count field width (canonical: 16 bits) on native facial records.
// Acceptance oracle: the walk must end within the qword bound implied by the record header
// (ceil(usedBits/64) == group90 qword count), for every facial record of every phase.
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

// Copy of parse-timing-group.js with the count width parameterized (W). W=16 reproduces the canonical parser.
function timingGroup(rd, frames, widths, W, modeBits) {
  const start = rd.pos;
  const stride = widths[0] + widths[1] + widths[2];
  if (stride === 0) return { end: start, nrec: 0, skipped: true };
  let acc = 0;
  const entries = [];
  if (frames > 0) {
    for (;;) {
      const flag = rd.read(1);
      const bit2 = rd.read(1);
      const cnt = bit2 === 0 ? (frames - acc) & 0xffff : rd.read(W);
      acc += cnt & 0xffff;
      entries.push({ flag, cnt: cnt & 0xffff });
      if (acc >= frames) break;
      if (entries.length > 100000) throw new Error('timing runaway');
    }
  }
  const mode = rd.read(modeBits);
  const M = mode + 3;
  const bW = WIDTH_TABLE[mode];
  const ebase = rd.pos;
  let vbase = rd.pos;
  if (bW < mode * stride && entries.length > 0) {
    let skip = 0;
    for (const e of entries) if (e.flag === 0) skip += Math.floor((e.cnt - 1 + M) / M) * bW;
    vbase = rd.pos + skip;
  }
  let nrec = 0;
  for (const e of entries) {
    let r;
    if (e.flag === 0) {
      r = e.cnt;
      if (bW < mode * stride) { r = e.cnt % M; if (r > 3) r = 3; r = r + Math.floor(e.cnt / M) * 3; }
    } else r = 1;
    nrec += r;
  }
  const end = nrec * stride + vbase;
  rd.pos = end;
  return { start, end, mode, bW, stride, nrec, entries: entries.length, ebase, vbase };
}

const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const phases = ['1000273', '1100273', '1200273', '1300273', '1400273'];
const records = phases.map((ph) => {
  const buf = fs.readFileSync(path.join(NAT, ph + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const idx = L.records.findIndex((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const r = L.records[idx];
  const g = r.sections.find((s) => s.name === 'group90');
  const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
  const desc = r.raw.group78.map((e) => ({ width: parseInt(e.hex.slice(2, 4), 16) }));
  return { ph, idx, F: r.frameValue, stream, desc, T: r.trackIdentifiers.length, qwords: buf.readUInt32LE(r.offset + 0x94), x9c: buf.readUInt32LE(r.offset + 0x9c) };
});

function run(rec, W, modeBits) {
  const per = rec.desc.length / rec.T;
  const rd = new BitReader(rec.stream);
  let error = null, groups = 0, firstBoundary = null;
  try {
    for (let t = 0; t < rec.T; t++) for (let g = 0; g < per / 3; g++) {
      const k = t * per + g * 3;
      const w = [rec.desc[k].width, rec.desc[k + 1].width, rec.desc[k + 2].width];
      if (w.every((x) => x === 0)) continue;
      const pg = timingGroup(rd, rec.F, w, W, modeBits);
      groups++;
      if (firstBoundary === null && pg.mode === 0) firstBoundary = pg.start;
      if (rd.pos > rec.stream.length * 8) throw new Error('overrun');
    }
  } catch (e) { error = e.message; }
  const streamBits = rec.stream.length * 8;
  const ok = !error && rd.pos <= streamBits && rd.pos > streamBits - 64;
  return { W, modeBits, end: rd.pos, streamBits, ok, error, groups, denseBoundary: firstBoundary, x9c: rec.x9c };
}

const results = [];
for (const modeBits of [8]) {
  for (let W = 1; W <= 16; W++) {
    const rows = records.map((rec) => run(rec, W, modeBits));
    const pass = rows.filter((x) => x.ok).length;
    results.push({ W, modeBits, pass, rows: rows.map((x) => `${x.end}/${x.streamBits}${x.ok ? '' : '!'}${x.error ? '(' + x.error + ')' : ''}`) });
  }
}
for (const r of results) process.stdout.write(`W=${r.W} mode=${r.modeBits} pass=${r.pass}/5 :: ${r.rows.join('  ')}\n`);
process.stdout.write('header 0x9C per phase: ' + records.map((x) => x.x9c).join(' ') + '\n');
