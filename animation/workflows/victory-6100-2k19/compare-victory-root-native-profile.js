'use strict';

// Compare the converted Rock root curve with native 2K26 Victory 6100 by the
// exact J_Root ID. This is a coordinate-profile comparison, not world placement proof.
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('../../tools/clips-layout');
const { parseClipsRecordBuffer } = require('../../tools/clips-codec/parse-clips-record');
const { evalGroup } = require('../../tools/clips-codec/eval-group');

const ROOT_ID = '0x1F4DA262FC146772';
function readRoot(file) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const records = layout.records.filter(record => record.trackIdentifiers.includes(ROOT_ID));
  if (records.length !== 1) throw new Error(`${file}: expected one record with J_Root; found ${records.length}`);
  const record = records[0], trackIndex = record.trackIdentifiers.indexOf(ROOT_ID);
  const decoded = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const descriptors = Array.from({ length: 3 }, (_, axis) => {
    const item = decoded.rec.raw.group78[trackIndex * 6 + axis];
    return { scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0), width: parseInt(item.hex.slice(2, 4), 16), rest: item.candidate.f32le[1] };
  });
  const positions = evalGroup(stream, decoded.bones[trackIndex].groups[0], descriptors, record.frameValue)
    ?? Array.from({ length: record.frameValue }, () => descriptors.map(item => item.rest));
  const min = [0, 1, 2].map(axis => Math.min(...positions.map(point => point[axis])));
  const max = [0, 1, 2].map(axis => Math.max(...positions.map(point => point[axis])));
  let polylineLength = 0;
  for (let frame = 1; frame < positions.length; frame += 1) polylineLength += Math.hypot(...positions[frame].map((v, axis) => v - positions[frame - 1][axis]));
  return { path: path.resolve(file), recordIndex: record.index, recordId: record.id, trackIndex, frames: record.frameValue, fps: record.fps, start: positions[0], end: positions.at(-1), min, max, polylineLength };
}

function compare(convertedPath, nativePath) {
  const converted = readRoot(convertedPath), native = readRoot(nativePath);
  const yMinDelta = Math.abs(converted.min[1] - native.min[1]);
  const yMaxDelta = Math.abs(converted.max[1] - native.max[1]);
  return {
    schema: 'aurora-forge/victory-root-native-profile/v1',
    converted,
    native,
    comparison: { yMinDelta, yMaxDelta, sameVerticalDirectionAndRange: converted.max[1] <= 0 && native.max[1] <= 0 && yMinDelta <= 2 && yMaxDelta <= 2 },
    limits: ['Compares packed clip-local J_Root curves only.', 'Matching vertical ranges do not prove post-event actor placement, ring anchoring, or runtime playback.'],
  };
}

if (require.main === module) {
  try {
    const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? '' : process.argv[index + 1]; };
    const converted = arg('--converted'), native = arg('--native'), out = arg('--out');
    if (!converted || !native || !out) throw new Error('Usage: node compare-victory-root-native-profile.js --converted <candidate.clips> --native <1006100.clips> --out <report.json>');
    const report = compare(converted, native);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report.comparison, null, 2));
  } catch (error) { console.error(`Victory root profile comparison failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { compare, readRoot };
