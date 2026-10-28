'use strict';
// Full per-frame decode for one 3-channel group: dense path passthrough,
// entropy path with per-quantum code lookup and linear second pass.
// Returns null for skipped (all-static) groups.
const { readBitsAt } = require('./read-bits-at');
const { entropyPair } = require('./entropy-pair');
const { evalDenseGroup } = require('./eval-dense-group');

function evalGroup(stream, group, descs, frames) {
  if (group.skipped) return null;
  const dense = group.entries.every(e => e.flag === 1 || group.bW >= group.mode * group.stride);
  if (dense) return evalDenseGroup(stream, group, descs, frames);
  const M0 = group.mode + 3;
  const entryBase = [], entryCodes = [];
  let recAcc = 0, codeAcc = 0;
  for (const e of group.entries) {
    entryBase.push(recAcc); entryCodes.push(codeAcc);
    if (e.flag === 1) { recAcc += 1; }
    else {
      let r2 = e.cnt % M0; if (r2 > 3) r2 = 3;
      r2 = r2 + Math.floor(e.cnt / M0) * 3;
      recAcc += r2;
      codeAcc += Math.floor((e.cnt + M0 - 1) / M0);
    }
  }
  const offs = [0, descs[0].width, descs[0].width + descs[1].width];
  const readKey = (key) => {
    const keyPos = group.vbase + key * group.stride;
    return [0, 1, 2].map(c => {
      const w = descs[c].width;
      if (w === 0) return descs[c].rest;
      return readBitsAt(stream, keyPos + offs[c], w) * Math.pow(2, descs[c].scale) + descs[c].rest;
    });
  };
  const out = [];
  for (let f = 0; f < frames; f++) {
    let rem = f, key = 0, found = false;
    for (let i = 0; i < group.entries.length; i++) {
      const e = group.entries[i];
      if (rem < e.cnt) {
        if (e.flag === 1) { key = entryBase[i]; }
        else {
          const q = Math.floor(rem / M0);
          const rInQ = rem - q * M0;
          const r1 = e.cnt - q * M0;
          found = { entry: i, q, rInQ, Mcap: Math.min(M0, r1) };
          break;
        }
        found = true;
        break;
      }
      rem -= e.cnt;
    }
    if (found === true) { out.push(readKey(key)); continue; }
    const e = group.entries[found.entry];
    const epos = group.ebase + (entryCodes[found.entry] + found.q) * group.bW;
    const code = group.bW === 0 ? 0 : readBitsAt(stream, epos, group.bW);
    const { lo, hi: hiRaw } = entropyPair(code);
    const hi = Math.min(hiRaw, found.Mcap);
    let sub, fr;
    if (found.rInQ < lo) { sub = 0; fr = found.rInQ / (lo === 0 ? 1 : lo); }
    else if (found.rInQ < hi) { sub = 1; fr = (found.rInQ - lo) / Math.max(hi - lo, 1); }
    else { sub = 2; fr = (found.rInQ - hi) / Math.max(found.Mcap - hi, 1); }
    const kk = entryBase[found.entry] + found.q * 3 + sub;
    const A = readKey(kk);
    const needLerp = fr !== 0 && descs[2].scale !== -127;
    if (!needLerp) { out.push(A); continue; }
    const B = readKey(Math.min(kk + 1, group.nrec - 1));
    out.push([0, 1, 2].map(c => A[c] + (B[c] - A[c]) * fr));
  }
  return out;
}

module.exports = { evalGroup };
