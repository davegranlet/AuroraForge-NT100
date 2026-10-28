'use strict';
// Rotation-vector (axis * angle) to quaternion, matching the native path:
// sin/cos with a small-angle series branch below length 1.
function rotToQuat(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  let s;
  if (1.0 < len) s = Math.sin(len) / len;
  else s = 0.003000020980834961 - (len * len) / -1.0;
  return [s * v[0], s * v[1], s * v[2], Math.cos(len)];
}

module.exports = { rotToQuat };
