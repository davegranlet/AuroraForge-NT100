'use strict';
// Extra-area walk variant sweep (all five native phases). From bone-pass end (0x9C), walk the 240 extra
// descriptor triples under variants: single-implied groups either (a) canonical (mode byte) or (b) dense2/static2
// without a mode byte; static runs consume 0/stride/8/8+stride bits. Acceptance: walk must end inside the
// qword bound (streamBits-64, streamBits] for ALL phases.
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
const recs = [];
for (let p = 0; p < 5; p++) {
  const buf = fs.readFileSync(path.join(NAT, `1${p}00273.clips`));
  const layout = parse(buf, { includeRaw: true });
  const rec = layout.records.find((r) => r.trackIdentifiers.length === 8 && r.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const payload = buf.subarray(rec.offset, rec.offset + rec.length);
  const g90 = rec.sections.find((s) => s.name === 'group90');
  const stream = payload.subarray(parseInt(g90.relativeOffset, 16), parseInt(g90.relativeOffset, 16) + g90.bytes);
  const desc = rec.raw.group78.map((e) => ({ width: parseInt(e.hex.slice(2, 4), 16) }));
  const active = [];
  for (let k = 16; k < 256; k++) {
    const w = [desc[k * 3].width, desc[k * 3 + 1].width, desc[k * 3 + 2].width];
    if (!w.every((x) => x === 0)) active.push({ k, w, stride: w[0] + w[1] + w[2] });
  }
  recs.push({ p, phase: 100 + p * 10, F: rec.frameValue, stream, streamBits: stream.length * 8, x9c: payload.readUInt32LE(0x9c), active });
}

function walk(rec, variant) {
  const rd = new BitReader(rec.stream);
  rd.pos = rec.x9c;
  let error = null, n = 0;
  for (const a of rec.active) {
    if (rd.pos > rec.streamBits + 64) { error = `overrun pre triple ${a.k}`; break; }
    if (variant.mode === 'canonical') {
      try { parseTimingGroup(rd, rec.F, a.w); } catch (e) { error = `parse ${a.k}: ${e.message}`; break; }
    } else {
      const save = rd.pos;
      if (save + 2 > rec.streamBits) { error = 'insufficient bits'; break; }
      const flag = rd.read(1), bit2 = rd.read(1);
      if (bit2 === 0) {
        if (flag === 0) rd.pos = save + 2 + rec.F * a.stride;
        else rd.pos = save + 2 + variant.staticBits(a.stride);
      } else {
        rd.pos = save;
        try { parseTimingGroup(rd, rec.F, a.w); } catch (e) { error = `parse ${a.k}: ${e.message}`; break; }
      }
    }
    n++;
    if (rd.pos > rec.streamBits + 64) { error = `overrun at triple ${a.k} (${rd.pos} > ${rec.streamBits})`; break; }
  }
  return { end: rd.pos, groups: n, error, ok: !error && rd.pos <= rec.streamBits && rd.pos > rec.streamBits - 64 };
}

const variants = [
  { name: 'canonical', mode: 'canonical', staticBits: () => 0 },
  { name: 'H2 static0', mode: 'h2', staticBits: () => 0 },
  { name: 'H2 static=2+stride', mode: 'h2', staticBits: (s) => s },
  { name: 'H2 static=8+stride', mode: 'h2', staticBits: (s) => 8 + s },
  { name: 'H2 static=2+8+stride', mode: 'h2', staticBits: (s) => 8 + s },
];
for (const v of variants) {
  const rows = recs.map((r) => walk(r, v));
  const pass = rows.filter((x) => x.ok).length;
  process.stdout.write(`${v.name.padEnd(22)} pass=${pass}/5 :: ${rows.map((x, i) => `${recs[i].phase}:${x.end}/${recs[i].streamBits}${x.ok ? ' OK' : ''}${x.error ? '(' + x.error + ')' : ''}`).join('  ')}\n`);
}
// detailed group spans for phase 140 under canonical vs H2 static0
{
  const r = recs[4];
  for (const v of [variants[0], variants[1]]) {
    const rd = new BitReader(r.stream); rd.pos = r.x9c;
    const spans = [];
    for (const a of r.active) {
      const save = rd.pos;
      if (v.mode === 'canonical') { const pg = parseTimingGroup(rd, r.F, a.w); spans.push(`${a.k}:${save}-${rd.pos}(m${pg.mode})`); }
      else {
        const flag = rd.read(1), bit2 = rd.read(1);
        if (bit2 === 0) { rd.pos = save + 2 + (flag === 0 ? r.F * a.stride : v.staticBits(a.stride)); spans.push(`${a.k}:${save}-${rd.pos}(${flag === 0 ? 'D' : 'S'})`); }
        else { rd.pos = save; const pg = parseTimingGroup(rd, r.F, a.w); spans.push(`${a.k}:${save}-${rd.pos}(m${pg.mode})`); }
      }
      if (rd.pos > r.streamBits + 64) { spans.push('OVERRUN'); break; }
    }
    process.stdout.write(`phase140 ${v.name}: ${spans.join(' ')}\n`);
  }
}
