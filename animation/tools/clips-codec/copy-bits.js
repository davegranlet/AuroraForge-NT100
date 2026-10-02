'use strict';
// Copies a bit range [start, end) from a source buffer into a new BitWriter
// (used for verbatim re-emission of untransferred groups).
const { BitWriter } = require('./bit-writer');

function copyBits(src, start, end) {
  const w = new BitWriter();
  for (let p = start; p < end; p++) {
    if ((src[p >> 3] >> (p & 7)) & 1) w.cur |= (1 << w.nbits);
    w.nbits++;
    if (w.nbits === 8) { w.bytes.push(w.cur); w.cur = 0; w.nbits = 0; }
  }
  return w;
}

module.exports = { copyBits };
