'use strict';
// Maps a source series into target units: the source minimum anchors at the
// target rest value and amplitude scales by the calibration gain.
function mapMinAnchored(series, rest, gain) {
  const a = Math.min(...series);
  return series.map(v => rest + (v - a) * gain);
}

module.exports = { mapMinAnchored };
