'use strict';
// Gaussian smoothing of a float column (sigma in frames, radius 7).
// Removes resample judder while keeping low-frequency phrasing.
function smoothColumnGaussian(col, sigma = 2.5, radius = 7) {
  const out = new Array(col.length);
  const k = [];
  for (let i = -radius; i <= radius; i++) k.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  for (let f = 0; f < col.length; f++) {
    let a = 0, w = 0;
    for (let i = -radius; i <= radius; i++) {
      const j = f + i;
      if (j < 0 || j >= col.length) continue;
      a += col[j] * k[i + radius]; w += k[i + radius];
    }
    out[f] = a / w;
  }
  return out;
}

module.exports = { smoothColumnGaussian };
