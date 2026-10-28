'use strict';
// Sequential LSB-first bit writer producing bytes on flush.
class BitWriter {
  constructor() { this.bytes = []; this.cur = 0; this.nbits = 0; }

  write(v, n) {
    for (let i = 0; i < n; i++) {
      if ((v >> i) & 1) this.cur |= (1 << this.nbits);
      this.nbits++;
      if (this.nbits === 8) { this.bytes.push(this.cur); this.cur = 0; this.nbits = 0; }
    }
  }

  bitLength() { return this.bytes.length * 8 + this.nbits; }

  flush() {
    return Buffer.from([...this.bytes, ...(this.nbits ? [this.cur] : [])]);
  }
}

module.exports = { BitWriter };
