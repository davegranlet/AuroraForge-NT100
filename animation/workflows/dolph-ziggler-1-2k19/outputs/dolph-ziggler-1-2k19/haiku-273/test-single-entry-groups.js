'use strict';
// Layout test H2 for native facial records (all five phases).
//  - single-entry group (first entry bit2 = 0, implied count = F):
//       flag 0 (dense):  2-bit header, then F * stride value bits, no mode byte
//       flag 1 (static): 2-bit header, then one record (stride bits), no mode byte
//  - explicit-count group (bit2 = 1): canonical parseTimingGroup (16-bit counts, 8-bit mode, codes, values)
// Oracles: header 0x9C must equal a group start (boundary), walk must end inside the qword bound.
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

const STATIC_MODE_BITS = Number(process.env.STATIC_MODE_BITS || 0);
const NAT = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Animation/CaeAdvanced';
const phases = ['1000273', '1100273', '1200273', '1300273', '1400273'];
const out = [];
for (const ph of phases) {
  const buf = fs.readFileSync(path.join(NAT, ph + '.clips'));
  const L = parse(buf, { includeRaw: true });
  const r = L.records.find((x) => x.trackIdentifiers.length === 8 && x.sections.some((s) => s.name === 'group90' && s.bytes > 0));
  const g = r.sections.find((s) => s.name === 'group90');
  const stream = buf.subarray(r.offset + parseInt(g.relativeOffset, 16), r.offset + parseInt(g.relativeOffset, 16) + g.bytes);
  const F = r.frameValue, T = 8;
  const W = r.raw.group78.map((e) => parseInt(e.hex.slice(2, 4), 16));
  const per = W.length / T;
  const x9c = buf.readUInt32LE(r.offset + 0x9c);
  const sb = stream.length * 8;
  const rd = new BitReader(stream);
  const starts = new Set();
  const ev = [];
  let error = null;
  try {
    for (let t = 0; t < T; t++) for (let gi = 0; gi < per / 3; gi++) {
      const k = t * per + gi * 3;
      const w = [W[k], W[k + 1], W[k + 2]];
      if (w.every((x) => x === 0)) continue;
      const start = rd.pos;
      starts.add(start);
      const stride = w[0] + w[1] + w[2];
      const flag = rd.read(1), bit2 = rd.read(1);
      if (bit2 === 0) {
        if (flag === 0) { rd.pos = start + 2 + F * stride; ev.push(`D${t}.${gi}`); }
        else { rd.pos = start + 2 + STATIC_MODE_BITS + stride; ev.push(`S${t}.${gi}`); }
      } else {
        rd.pos = start;
        const pg = parseTimingGroup(rd, F, w);
        ev.push(`E${t}.${gi}(m${pg.mode})`);
      }
      if (rd.pos > sb + 64) { error = `overrun at group ${t}.${gi} (${rd.pos})`; break; }
    }
  } catch (e) { error = e.message; }
  const end = rd.pos;
  const boundary = starts.has(x9c);
  const ok = !error && end <= sb && end > sb - 64;
  out.push({ ph, F, sb, x9c, boundary, end, ok, error, events: ev.join(' ') });
}
for (const o of out) {
  process.stdout.write(`${o.ph} F=${o.F} stream=${o.sb} x9c=${o.x9c} boundaryHit=${o.boundary} end=${o.end} qwordOk=${o.ok}${o.error ? ' ERR ' + o.error : ''}\n`);
}
process.stdout.write('\n' + out.map((o) => `${o.ph}: ${o.events}`).join('\n') + '\n');
