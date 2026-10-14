'use strict';
// Fits one channel's quantization descriptor to a value series: keeps the
// stock scale (unit size), grows width only as needed, and floors rest onto
// the quantum grid so the series always fits with zero clamps. Width-0 stock
// channels are allowed to GROW: a static stock channel (width 0) must still
// carry a converted source's motion, otherwise the channel is frozen at rest.
function fitDescriptor(series, stockDescriptor) {
  const d = stockDescriptor;
  let lo = Infinity, hi = -Infinity;
  for (const v of series) { if (v < lo) lo = v; if (v > hi) hi = v; }
  // Static stock channels (width 0) carry an arbitrary scale; when the new
  // series has motion, the channel must be re-quantized at least at the
  // standard rotation precision (2^-6) or coarse steps (~25 deg) appear.
  const scale = d.width === 0 ? Math.min(d.scale, -6) : d.scale;
  const step = Math.pow(2, scale);
  let rest = d.rest;
  if (!(rest <= lo)) rest = Math.floor(lo / step) * step;
  const need = Math.ceil((hi - rest) / step);
  let width = d.width;
  while ((Math.pow(2, width) - 1) < need && width < 31) width++;
  if ((Math.pow(2, width) - 1) < need) throw new Error(`fitDescriptor: need ${need} exceeds 31-bit width`);
  return { scale, width, rest };
}

module.exports = { fitDescriptor };
