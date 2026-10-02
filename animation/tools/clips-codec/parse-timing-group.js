'use strict';
// Parses one 3-channel timing group from the group90 bit stream
// (native FUN_140002e50 model). Returns the segment table plus the
// value/entropy block geometry for this group.
const { BitReader } = require('./bit-reader');
const { WIDTH_TABLE } = require('./width-table');

function parseTimingGroup(rd, frames, widths) {
  const start = rd.pos;
  const stride = widths[0] + widths[1] + widths[2];
  if (stride === 0) {
    return { start, entries: [], mode: 0, bW: 0, stride: 0, ebase: start, vbase: start, nrec: 0, end: start, timingBits: 0, skipped: true };
  }
  let acc = 0, stored = 0;
  const entries = [];
  if (frames > 0) {
    while (true) {
      const flag = rd.read(1);
      const bit2 = rd.read(1);
      let cnt;
      if (bit2 === 0) cnt = (frames - acc) & 0xffff;
      else cnt = rd.read(16);
      acc += cnt & 0xffff;
      if (stored < 15) { entries.push({ flag, cnt: cnt & 0xffff }); stored++; }
      if (acc >= frames) break;
      if (entries.length > 100000) throw new Error('timing runaway');
    }
  }
  const mode = rd.read(8);
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
      if (bW < mode * stride) {
        r = e.cnt % M;
        if (r > 3) r = 3;
        r = r + Math.floor(e.cnt / M) * 3;
      }
    } else r = 1;
    nrec += r;
  }
  const end = nrec * stride + vbase;
  rd.pos = end;
  return { start, entries, mode, bW, stride, ebase, vbase, nrec, end, timingBits: end - start };
}

module.exports = { parseTimingGroup, BitReader };
