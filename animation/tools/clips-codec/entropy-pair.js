'use strict';
// Decodes one per-quantum entropy code into its (lo, hi) split pair.
// Codes are enumerated as 1 <= lo < hi, ordered by hi then lo:
//   index = (hi-1)(hi-2)/2 + (lo-1)
function entropyPair(index) {
  let hi = 2;
  while ((hi * (hi - 1)) / 2 <= index) hi++;
  const base = ((hi - 1) * (hi - 2)) / 2;
  return { lo: index - base + 1, hi };
}

module.exports = { entropyPair };
