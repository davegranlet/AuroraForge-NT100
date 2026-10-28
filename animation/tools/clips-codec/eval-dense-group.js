'use strict';
// Dense per-frame value decode for one 3-channel group (held + dense
// segments only). Returns null when the group uses the entropy path.
const { readBitsAt } = require('./read-bits-at');

function evalDenseGroup(stream, group, descs, frames) {
  const dense = group.entries.every(e => e.flag === 1 || group.bW >= group.mode * group.stride);
  if (!dense) return null;
  const out = [];
  const entryBase = [];
  let acc = 0;
  for (const e of group.entries) { entryBase.push(acc); acc += (e.flag === 1 ? 1 : e.cnt); }
  const offs = [0, descs[0].width, descs[0].width + descs[1].width];
  for (let f = 0; f < frames; f++) {
    let rem = f, key = 0, found = false;
    for (let i = 0; i < group.entries.length; i++) {
      const e = group.entries[i];
      if (rem < e.cnt) { key = entryBase[i] + (e.flag === 1 ? 0 : rem); found = true; break; }
      rem -= e.cnt;
    }
    if (!found) throw new Error('frame outside timing');
    const keyPos = group.vbase + key * group.stride;
    const vals = [0, 1, 2].map(c => {
      const w = descs[c].width;
      if (w === 0) return descs[c].rest;
      const n = readBitsAt(stream, keyPos + offs[c], w);
      return n * Math.pow(2, descs[c].scale) + descs[c].rest;
    });
    out.push(vals);
  }
  return out;
}

module.exports = { evalDenseGroup };
