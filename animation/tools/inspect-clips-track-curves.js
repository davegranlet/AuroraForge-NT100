'use strict';

// Offline Aurora inspector for the per-frame ranges of selected .clips tracks.
// Keeps all timing/bit decoding in the shared repo-owned clips codec.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

function trackHex(id) {
  const text = String(id);
  if (/^0x[0-9a-f]+$/i.test(text)) return text.toLowerCase();
  return `0x${BigInt(text).toString(16)}`;
}

function summarizeValues(values) {
  if (!values) return { skipped: true };
  const dimensions = values[0]?.length || 0;
  return {
    frameCount: values.length,
    channels: Array.from({ length: dimensions }, (_, channel) => {
      let min = Infinity; let max = -Infinity;
      for (const row of values) { min = Math.min(min, row[channel]); max = Math.max(max, row[channel]); }
      return { first: values[0][channel], last: values.at(-1)[channel], min, max, stationary: min === max };
    }),
  };
}

function inspect(filePath, recordIndex, requestedTrackIds) {
  const file = fs.readFileSync(filePath);
  const parsed = parseClipsRecordBuffer(file, recordIndex);
  const stream = file.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = requestedTrackIds.map(requestedId => {
    const id = trackHex(requestedId);
    const index = parsed.rec.trackIdentifiers.findIndex(value => trackHex(value) === id);
    if (index < 0) return { id, present: false };
    const descriptors = readTrackDescriptors(parsed, index);
    const curveGroups = [0, 1].map(groupIndex => {
      const group = parsed.bones[index].groups[groupIndex];
      const values = evalGroup(stream, group, descriptors.slice(groupIndex * 3, groupIndex * 3 + 3), parsed.rec.frameValue);
      return { groupIndex, ...summarizeValues(values) };
    });
    return { id, index, present: true, descriptors, curveGroups };
  });
  return {
    schema: 'aurora-forge/clips-track-curve-inspection/v1',
    input: { path: filePath, bytes: file.length, sha256: crypto.createHash('sha256').update(file).digest('hex').toUpperCase() },
    record: { index: recordIndex, frameValue: parsed.rec.frameValue, trackCount: parsed.rec.trackIdentifiers.length },
    tracks,
  };
}

function run(argv) {
  const [filePath, recordIndexText, idsText, outputPath] = argv;
  if (!filePath || recordIndexText === undefined || !idsText || !outputPath) {
    throw new Error('Usage: node inspect-clips-track-curves.js <file.clips> <record-index> <comma-separated-track-ids> <new-report.json>');
  }
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);
  const report = inspect(filePath, Number(recordIndexText), idsText.split(',').map(value => value.trim()).filter(Boolean));
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[5], record: report.record, tracks: report.tracks.map(track => ({ id: track.id, index: track.index, present: track.present, curveGroups: track.curveGroups })) }, null, 2));
  } catch (error) {
    console.error(`clips track curve inspection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspect, run, trackHex };
