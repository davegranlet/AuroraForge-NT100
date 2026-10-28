'use strict';
// Resamples one keyed series (from an exported YANM IR timeline) to target
// frame positions using Catmull-Rom interpolation at rate = targetFrames/sourceFrames.
const { resampleKeysCatmullRom } = require('./resample-keys-catmull-rom');

function resampleSeries(keys, wordIndex, frames, rate) {
  const out = [];
  for (let f = 0; f < frames; f++) out.push(resampleKeysCatmullRom(keys, wordIndex, f / rate));
  return out;
}

module.exports = { resampleSeries };
