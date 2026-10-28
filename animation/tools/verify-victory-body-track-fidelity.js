'use strict';

// Compare a source-derived Victory body record with its packaged target-layout
// counterpart by track identifier (never by array slot). This is a stored-curve
// integrity check; it does not prove source decoding semantics or runtime use.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function openRecord(filePath, recordId, recordIndex) {
  const bytes = fs.readFileSync(filePath);
  const layout = parseFile(filePath, { includeRaw: false });
  const matches = recordIndex === undefined
    ? layout.records.filter(record => record.id.toUpperCase() === recordId.toUpperCase())
    : layout.records.filter(record => record.index === recordIndex && record.id.toUpperCase() === recordId.toUpperCase());
  if (matches.length !== 1) throw new Error(`${filePath}: expected one record ${recordId}, found ${matches.length}`);
  const record = matches[0];
  const decoded = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  return { filePath: path.resolve(filePath), bytes, record, decoded, stream };
}

function channel(opened, trackIndex, groupIndex) {
  const descriptors = Array.from({ length: 3 }, (_, axis) => {
    const item = opened.decoded.rec.raw.group78[trackIndex * 6 + groupIndex * 3 + axis];
    if (!item) throw new Error(`${opened.filePath}: missing descriptor for track ${trackIndex}, group ${groupIndex}`);
    return {
      scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0),
      width: parseInt(item.hex.slice(2, 4), 16),
      rest: item.candidate.f32le[1],
    };
  });
  return evalGroup(opened.stream, opened.decoded.bones[trackIndex].groups[groupIndex], descriptors, opened.record.frameValue)
    ?? Array.from({ length: opened.record.frameValue }, () => descriptors.map(descriptor => descriptor.rest));
}

function verifyVictoryBodyTrackFidelity({ sourcePath, targetPath, recordId, targetRecordId = recordId, sourceRecordIndex, tolerance = 0 }) {
  if (!sourcePath || !targetPath || !recordId || !targetRecordId) throw new Error('sourcePath, targetPath, recordId and targetRecordId are required');
  if (sourceRecordIndex !== undefined && (!Number.isInteger(sourceRecordIndex) || sourceRecordIndex < 0)) throw new Error('sourceRecordIndex must be a nonnegative integer');
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('tolerance must be a nonnegative finite number');
  const source = openRecord(sourcePath, recordId, sourceRecordIndex);
  const target = openRecord(targetPath, targetRecordId);
  if (source.record.frameValue !== target.record.frameValue || source.record.fps !== target.record.fps) {
    throw new Error(`record timing differs: source=${source.record.frameValue}@${source.record.fps}, target=${target.record.frameValue}@${target.record.fps}`);
  }

  const sourceIds = source.record.trackIdentifiers;
  const targetIds = target.record.trackIdentifiers;
  const missing = sourceIds.filter(id => !targetIds.includes(id));
  if (missing.length) throw new Error(`target is missing ${missing.length} source track identifiers: ${missing.join(', ')}`);
  const targetOnlyTrackIds = targetIds.filter(id => !sourceIds.includes(id));
  const targetOnlyTrackChecks = targetOnlyTrackIds.map(id => {
    const targetIndex = targetIds.indexOf(id);
    let maxAbsoluteValue = 0;
    for (let group = 0; group < 2; group += 1) {
      const values = channel(target, targetIndex, group);
      for (const frame of values) for (const value of frame) maxAbsoluteValue = Math.max(maxAbsoluteValue, Math.abs(value));
    }
    return { id, maxAbsoluteValue, allZero: maxAbsoluteValue === 0 };
  });

  const tracks = sourceIds.map(id => {
    const sourceIndex = sourceIds.indexOf(id);
    const targetIndex = targetIds.indexOf(id);
    let maxAbsoluteError = 0;
    let maxEuclideanError = 0;
    let maxFrame = 0;
    let maxGroup = 0;
    let maxAxis = 0;
    for (let group = 0; group < 2; group += 1) {
      const left = channel(source, sourceIndex, group);
      const right = channel(target, targetIndex, group);
      if (left.length !== source.record.frameValue || right.length !== target.record.frameValue) {
        throw new Error(`${id}: decoded sample count does not match record timing`);
      }
      for (let frame = 0; frame < left.length; frame += 1) {
        let squared = 0;
        for (let axis = 0; axis < 3; axis += 1) {
          const error = Math.abs(left[frame][axis] - right[frame][axis]);
          squared += error * error;
          if (error > maxAbsoluteError) {
            maxAbsoluteError = error;
            maxFrame = frame;
            maxGroup = group;
            maxAxis = axis;
          }
        }
        maxEuclideanError = Math.max(maxEuclideanError, Math.sqrt(squared));
      }
    }
    return { id, sourceTrackIndex: sourceIndex, targetTrackIndex: targetIndex, maxAbsoluteError, maxEuclideanError, maxFrame, maxGroup, maxAxis, pass: maxAbsoluteError <= tolerance };
  });

  return {
    schema: 'aurora-forge/victory-body-track-fidelity/v1',
    source: { path: source.filePath, sha256: sha256(source.bytes), recordIndex: source.record.index, trackCount: sourceIds.length },
    target: { path: target.filePath, sha256: sha256(target.bytes), recordIndex: target.record.index, trackCount: targetIds.length },
    recordId: source.record.id,
    frames: source.record.frameValue,
    fps: source.record.fps,
    matchedSourceTracks: sourceIds.length,
    targetOnlyTrackIds,
    targetOnlyTrackChecks,
    tolerance,
    maxAbsoluteError: Math.max(0, ...tracks.map(track => track.maxAbsoluteError)),
    maxEuclideanError: Math.max(0, ...tracks.map(track => track.maxEuclideanError)),
    pass: tracks.every(track => track.pass) && targetOnlyTrackChecks.every(track => track.allZero),
    tracks,
    scope: 'Decoded position and rotation curves compared by 64-bit track identifier, independent of track ordering. Proves stored curve parity only; it does not prove the original 2K19 decode model, companion/event semantics, or runtime playback.',
  };
}

function readArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    if (!args[index].startsWith('--')) throw new Error(`unexpected argument: ${args[index]}`);
    const key = args[index].slice(2);
    if (key === 'help') { out.help = true; continue; }
    if (index + 1 >= args.length || args[index + 1].startsWith('--')) throw new Error(`missing value for --${key}`);
    out[key] = args[++index];
  }
  return out;
}

if (require.main === module) {
  try {
    const args = readArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write('Usage: node verify-victory-body-track-fidelity.js --source <source-derived.clips> --target <packaged.clips> --record-id <source-hex-id> [--source-record-index <index>] --target-record-id <target-hex-id> --out <report.json> [--tolerance <value>]\n');
    } else {
      if (!args.source || !args.target || !args['record-id'] || !args.out) throw new Error('source, target, record-id and out are required');
      const report = verifyVictoryBodyTrackFidelity({ sourcePath: args.source, targetPath: args.target, recordId: args['record-id'], targetRecordId: args['target-record-id'] || args['record-id'], sourceRecordIndex: args['source-record-index'] === undefined ? undefined : Number(args['source-record-index']), tolerance: args.tolerance === undefined ? 0 : Number(args.tolerance) });
      fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
      fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ pass: report.pass, matchedSourceTracks: report.matchedSourceTracks, targetTracks: report.target.trackCount, targetOnlyTracks: report.targetOnlyTrackIds.length, frames: report.frames, fps: report.fps, maxAbsoluteError: report.maxAbsoluteError, maxEuclideanError: report.maxEuclideanError }, null, 2)}\n`);
      if (!report.pass) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`Victory body fidelity check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verifyVictoryBodyTrackFidelity };
