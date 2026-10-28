'use strict';
// Sequential LSB-first bit reader over a buffer (native FUN_140004600 model).
class BitReader {
  constructor(buffer) { this.buf = buffer; this.pos = 0; }

  read(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const p = this.pos++;
      if ((this.buf[p >> 3] >> (p & 7)) & 1) v |= (1 << i);
    }
    return v >>> 0;
  }
}

module.exports = { BitReader };
