'use strict';
// Tests a dense-group model for native facial records:
//  - canonical entropy timing parse for groups whose first entry carries an explicit count (bit2 = 1)
//  - dense groups: 2-bit header (flag 0, implied count) then F * sum(widths) value bits, no mode byte
// Checks: (a) the cumulative end of the entropy-part hits header 0x9C; (b) total end is inside the qword bound.
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
const rows = [];
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
  const qwords = buf.readUInt32LE(r.offset + 0x94);
  const streamBits = stream.length * 8;
  // Walk: classify by the first two bits of each active triple.
  const rd = new BitReader(stream);
  const events = [];
  let boundaryHit = null;
  let error = null;
  try {
    for (let t = 0; t < T; t++) for (let gi = 0; gi < per / 3; gi++) {
      const k = t * per + gi * 3;
      const w = [W[k], W[k + 1], W[k + 2]];
      if (w.every((x) => x === 0)) continue;
      const start = rd.pos;
      if (boundaryHit === null && start === x9c) boundaryHit = { t, gi, start };
      const peekFlag = rd.peekBits ? null : null;
      void peekFlag;
      const save = rd.pos;
      const flag = rd.read(1), bit2 = rd.read(1);
      if (flag === 0 && bit2 === 0) {
        const stride = w[0] + w[1] + w[2];
        rd.pos = save + 2 + F * stride;
        events.push({ t, gi, kind: 'dense2', start, end: rd.pos, stride });
      } else {
        rd.pos = save;
        const pg = parseTimingGroup(rd, F, w);
        events.push({ t, gi, kind: 'entropy', start, end: rd.pos, mode: pg.mode, bW: pg.bW, stride: pg.stride });
      }
      if (rd.pos > streamBits + 64) { error = 'overrun at ' + rd.pos; break; }
    }
  } catch (e) { error = e.message; }
  const end = rd.pos;
  const ok = !error && end <= streamBits && end > streamBits - 64;
  // Where does the entropy-part cumulate, and does it hit x9c?
  let entropyEnd = 0;
  for (const e of events) if (e.kind === 'entropy') entropyEnd = e.end; else break;
  rows.push({ phase: ph, F, qwords, streamBits, x9c, boundaryHitAtX9c: !!boundaryHit, lastEntropyEndBeforeFirstDense: entropyEnd,
    denseGroups: events.filter((e) => e.kind === 'dense2').length, entropyGroups: events.filter((e) => e.kind === 'entropy').length,
    walkEnd: end, qwordBoundOk: ok, error, events: events.map((e) => `${e.kind[0]}${e.t}.${e.gi}:${e.start}-${e.end}`).join(' ') });
}
for (const r of rows) {
  process.stdout.write(`${r.phase} F=${r.F} stream=${r.streamBits} x9c=${r.x9c} boundaryHit=${r.boundaryHitAtX9c} walkEnd=${r.walkEnd} qwordOk=${r.qwordBoundOk} dense=${r.denseGroups} entropy=${r.entropyGroups}${r.error ? ' ERR ' + r.error : ''}\n`);
  process.stdout.write(`   ${r.events}\n`);
}
