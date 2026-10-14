'use strict';
// Reads the six per-track descriptors of one parsed .clips record as
// decoded { scale (signed byte), width, rest (float) } objects.
function readTrackDescriptors(parsedRecord, boneIndex) {
  const perTrack = 6;
  const out = [];
  for (let s = 0; s < perTrack; s++) {
    const e = parsedRecord.rec.raw.group78[boneIndex * perTrack + s];
    out.push({
      scale: Buffer.from(e.hex.slice(0, 2), 'hex').readInt8(0),
      width: parseInt(e.hex.slice(2, 4), 16),
      rest: e.candidate.f32le[1],
    });
  }
  return out;
}

module.exports = { readTrackDescriptors };
