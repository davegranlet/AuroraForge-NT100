'use strict';
// Reads n bits (LSB-first) at an absolute bit position from a byte buffer.
// Native-model reader: bytes are consumed least-significant-bit first.
function readBitsAt(buffer, bitPos, n) {
  let v = 0;
  for (let i = 0; i < n; i++) {
    const p = bitPos + i;
    if ((buffer[p >> 3] >> (p & 7)) & 1) v |= (1 << i);
  }
  return v >>> 0;
}

module.exports = { readBitsAt };
