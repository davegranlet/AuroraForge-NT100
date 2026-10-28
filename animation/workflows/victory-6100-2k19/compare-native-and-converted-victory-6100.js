'use strict';

// Compare the 2K19-derived 2K26 clip package directly with native 2K26
// Victory motion 6100. Values are compared after linear time normalization;
// this is a similarity report, not a claim that source and native versions
// should be byte-identical.
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('../../tools/clips-layout');
const { parseClipsRecordBuffer } = require('../../tools/clips-codec/parse-clips-record');
const { evalGroup } = require('../../tools/clips-codec/eval-group');

function decodeRecord(filePath, id) {
  const bytes = fs.readFileSync(filePath);
  const layout = parseFile(filePath);
  const found = layout.records.filter(row => row.id.toUpperCase() === id.toUpperCase());
  if (found.length !== 1) throw new Error(`${filePath}: expected one record ${id}, found ${found.length}`);
  const record = found[0];
  const decoded = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const groups = record.trackIdentifiers.map((_, track) => Array.from({ length: 2 }, (_, group) => {
    const descriptors = Array.from({ length: 3 }, (_, axis) => {
      const item = decoded.rec.raw.group78[track * 6 + group * 3 + axis];
      if (!item) throw new Error(`${filePath}: missing descriptor at track ${track}, group ${group}, axis ${axis}`);
      return {
        scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0),
        width: parseInt(item.hex.slice(2, 4), 16),
        rest: item.candidate.f32le[1],
      };
    });
    return evalGroup(stream, decoded.bones[track].groups[group], descriptors, record.frameValue)
      ?? Array.from({ length: record.frameValue }, () => descriptors.map(item => item.rest));
  }));
  return { record, groups };
}

function sampleAt(values, normalized) {
  const x = normalized * (values.length - 1);
  const lo = Math.floor(x), hi = Math.min(values.length - 1, lo + 1), t = x - lo;
  return values[lo].map((v, i) => v + (values[hi][i] - v) * t);
}

function compareRecord(nativeFile, convertedFile, id, samples = 1001) {
  const native = decodeRecord(nativeFile, id), converted = decodeRecord(convertedFile, id);
  const convertedIds = converted.record.trackIdentifiers;
  const nativeIds = native.record.trackIdentifiers;
  const missing = nativeIds.filter(track => !convertedIds.includes(track));
  const extra = convertedIds.filter(track => !nativeIds.includes(track));
  const tracks = nativeIds.filter(track => convertedIds.includes(track)).map(track => {
    const ni = nativeIds.indexOf(track), ci = convertedIds.indexOf(track);
    const groups = [0, 1].map(group => {
      let sumSq = 0, max = 0, maxSample = 0;
      const nativeSeconds = (native.record.frameValue - 1) / native.record.fps;
      const convertedSeconds = (converted.record.frameValue - 1) / converted.record.fps;
      const commonSeconds = Math.min(nativeSeconds, convertedSeconds);
      for (let sample = 0; sample < samples; sample++) {
        const seconds = commonSeconds * sample / (samples - 1);
        const a = sampleAt(native.groups[ni][group], seconds / nativeSeconds);
        const b = sampleAt(converted.groups[ci][group], seconds / convertedSeconds);
        for (let axis = 0; axis < 3; axis++) {
          const error = Math.abs(a[axis] - b[axis]);
          sumSq += error * error;
          if (error > max) { max = error; maxSample = sample; }
        }
      }
      return { group: group === 0 ? 'position' : 'rotation', comparison: 'equal elapsed seconds', commonDurationSeconds: commonSeconds, normalizedSamples: samples, rmsComponentError: Math.sqrt(sumSq / (samples * 3)), maxAbsoluteComponentError: max, maxErrorTimeSeconds: commonSeconds * maxSample / (samples - 1) };
    });
    return { trackId: track, nativeIndex: ni, convertedIndex: ci, groups: groups.map((item, group) => ({
      ...item,
      nativeStart: native.groups[ni][group][0],
      nativeMiddle: sampleAt(native.groups[ni][group], 0.5),
      nativeEnd: native.groups[ni][group].at(-1),
      convertedStart: converted.groups[ci][group][0],
      convertedMiddle: sampleAt(converted.groups[ci][group], 0.5),
      convertedEnd: converted.groups[ci][group].at(-1),
    })) };
  });
  return {
    clipId: id,
    native: { frames: native.record.frameValue, fps: native.record.fps, tracks: nativeIds.length },
    converted: { frames: converted.record.frameValue, fps: converted.record.fps, tracks: convertedIds.length },
    matchedTracks: tracks.length,
    nativeTracksMissingFromConverted: missing,
    convertedOnlyTracks: extra,
    tracks,
  };
}

if (require.main === module) {
  try {
    const [nativeFile, convertedFile, outFile] = process.argv.slice(2);
    if (!nativeFile || !convertedFile || !outFile) throw new Error('Usage: node compare-native-and-converted-victory-6100.js <native-1006100.clips> <converted-1014003.clips> <report.json>');
    const ids = ['0xA57FCBAB77BC9BD5']; // measured actor-body record ID
    const records = ids.map(id => compareRecord(nativeFile, convertedFile, id));
    const report = {
      schema: 'aurora-forge/native-vs-converted-victory-6100/v1',
      nativeFile: path.resolve(nativeFile),
      convertedFile: path.resolve(convertedFile),
    comparison: 'by stable clip and track IDs; values linearly resampled at equal elapsed seconds over the shared duration',
      records,
      limitation: 'Similarity only. 2K19 and 2K26 may contain authored differences; this does not identify which animation is correct or prove runtime behavior.',
    };
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ outFile: path.resolve(outFile), records: records.map(({ clipId, native, converted, matchedTracks, nativeTracksMissingFromConverted, convertedOnlyTracks, tracks }) => ({ clipId, native, converted, matchedTracks, missing: nativeTracksMissingFromConverted.length, convertedOnly: convertedOnlyTracks.length, maxPositionError: Math.max(...tracks.map(t => t.groups[0].maxAbsoluteComponentError)), maxRotationError: Math.max(...tracks.map(t => t.groups[1].maxAbsoluteComponentError)) })) }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { compareRecord };
