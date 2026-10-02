'use strict';
// Fits one channel's quantization descriptor to a value series: keeps the
// stock scale (unit size), grows width only as needed, and floors rest onto
// the quantum grid so the series always fits with zero clamps.
function fitDescriptor(series, stockDescriptor) {
  const d = stockDescriptor;
  if (d.width === 0) return d;
  let lo = Infinity, hi = -Infinity;
  for (const v of series) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const step = Math.pow(2, d.scale);
  let rest = d.rest;
  if (!(rest <= lo)) rest = Math.floor(lo / step) * step;
  const need = Math.ceil((hi - rest) / step);
  let width = d.width;
  while ((Math.pow(2, width) - 1) < need && width < 31) width++;
  if ((Math.pow(2, width) - 1) < need) throw new Error(`fitDescriptor: need ${need} exceeds 31-bit width`);
  return { scale: d.scale, width, rest };
}

module.exports = { fitDescriptor };
