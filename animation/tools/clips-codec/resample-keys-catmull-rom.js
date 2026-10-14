'use strict';
// Catmull-Rom resample of packed 16-bit key series to continuous float frames.
// keys: [{ frame, packed[] }] ascending; f: fractional source frame.
function resampleKeysCatmullRom(keys, wordIndex, f) {
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].frame < f) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i];
  const k2 = keys[Math.min(keys.length - 1, i + 1)], k3 = keys[Math.min(keys.length - 1, i + 2)];
  const f1 = k1.frame, f2 = k2.frame;
  if (f2 <= f1) return k2.packed[wordIndex];
  const t = Math.max(0, Math.min(1, (f - f1) / (f2 - f1)));
  const p0 = k0.packed[wordIndex], p1 = k1.packed[wordIndex];
  const p2 = k2.packed[wordIndex], p3 = k3.packed[wordIndex];
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

module.exports = { resampleKeysCatmullRom };
