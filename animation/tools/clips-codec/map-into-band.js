'use strict';
// Affine band map: source [min,max] fills the target [lo,hi] band exactly
// (used to place transferred channels inside a stock-proven motion band).
function mapIntoBand(series, lo, hi) {
  const a = Math.min(...series), b = Math.max(...series);
  if (b === a) return series.map(() => lo);
  return series.map(v => lo + ((v - a) / (b - a)) * (hi - lo));
}

module.exports = { mapIntoBand };
