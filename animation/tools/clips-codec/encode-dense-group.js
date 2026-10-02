'use strict';
// Dense encoder for one 3-channel group: single full-range timing segment
// (flag 0, bit2 0, mode 0) followed by quantized per-frame values.
// keys[f][c] are floats; descs[c] = { scale, width, rest }.
// Returns a BitWriter; clamps are counted on w.clampCount.
const { BitWriter } = require('./bit-writer');

function encodeDenseGroup(keys, descs) {
  const w = new BitWriter();
  const stride = descs[0].width + descs[1].width + descs[2].width;
  if (stride === 0) return w;
  w.write(0, 1);
  w.write(0, 1);
  w.write(0, 8);
  for (const row of keys) {
    for (let c = 0; c < 3; c++) {
      const d = descs[c];
      if (d.width === 0) continue;
      const q = Math.pow(2, d.width);
      const n = Math.round((row[c] - d.rest) / Math.pow(2, d.scale));
      const clamped = Math.max(0, Math.min(q - 1, n));
      w.write(clamped, d.width);
      if (clamped !== n) w.clampCount = (w.clampCount || 0) + 1;
    }
  }
  return w;
}

module.exports = { encodeDenseGroup };
