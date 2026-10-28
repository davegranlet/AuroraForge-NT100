'use strict';
// Concatenates BitWriters into one BitWriter without byte padding between them.
const { BitWriter } = require('./bit-writer');

function concatWriters(writers) {
  const out = new BitWriter();
  for (const w of writers) {
    const b = w.flush();
    const total = w.bitLength();
    for (let p = 0; p < total; p++) {
      if ((b[p >> 3] >> (p & 7)) & 1) out.cur |= (1 << out.nbits);
      out.nbits++;
      if (out.nbits === 8) { out.bytes.push(out.cur); out.cur = 0; out.nbits = 0; }
    }
  }
  return out;
}

module.exports = { concatWriters };
