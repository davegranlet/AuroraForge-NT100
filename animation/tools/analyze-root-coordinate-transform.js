'use strict';

// Aurora Forge read-only analysis for cross-generation clip-local root motion.
// Fits signed axis permutations plus translation/scale; it never edits a clip.
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { evalGroup } = require('./clips-codec/eval-group');

function readTrack(file, trackId) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const matches = layout.records.filter(record => record.trackIdentifiers.includes(trackId));
  if (matches.length !== 1) throw new Error(`${file}: expected one record containing ${trackId}; found ${matches.length}`);
  const record = matches[0];
  const trackIndex = record.trackIdentifiers.indexOf(trackId);
  const decoded = parseClipsRecordBuffer(bytes, record.index);
  const stream = bytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
  const descriptors = Array.from({ length: 3 }, (_, axis) => {
    const item = decoded.rec.raw.group78[trackIndex * 6 + axis];
    return {
      scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0),
      width: parseInt(item.hex.slice(2, 4), 16),
      rest: item.candidate.f32le[1],
    };
  });
  const positions = evalGroup(stream, decoded.bones[trackIndex].groups[0], descriptors, record.frameValue);
  if (!positions || positions.some(point => point.length !== 3 || point.some(value => !Number.isFinite(value)))) {
    throw new Error(`${file}: position group did not decode to finite 3D samples`);
  }
  return {
    path: path.resolve(file), sha256: require('node:crypto').createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    recordIndex: record.index, recordId: record.id, trackId, trackIndex, frames: record.frameValue, fps: record.fps, positions,
  };
}

function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest]));
}

function fit(source, target) {
  if (source.frames !== target.frames || source.fps !== target.fps) {
    throw new Error(`Timeline mismatch: source ${source.frames}@${source.fps}, target ${target.frames}@${target.fps}`);
  }
  const n = source.frames;
  const results = [];
  for (const permutation of permutations([0, 1, 2])) {
    for (const signs of [[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]]) {
      const transformed = source.positions.map(point => permutation.map((axis, outAxis) => signs[outAxis] * point[axis]));
      const sourceMean = [0,1,2].map(axis => transformed.reduce((sum, point) => sum + point[axis], 0) / n);
      const targetMean = [0,1,2].map(axis => target.positions.reduce((sum, point) => sum + point[axis], 0) / n);
      const covariance = [0,1,2].map(axis => transformed.reduce((sum, point, frame) =>
        sum + (point[axis] - sourceMean[axis]) * (target.positions[frame][axis] - targetMean[axis]), 0));
      const variance = [0,1,2].map(axis => transformed.reduce((sum, point) => sum + (point[axis] - sourceMean[axis]) ** 2, 0));
      const axisScale = covariance.map((value, axis) => variance[axis] > 1e-12 ? value / variance[axis] : 1);
      const axisOffset = targetMean.map((value, axis) => value - axisScale[axis] * sourceMean[axis]);
      const totalVariance = variance.reduce((sum, value) => sum + value, 0);
      const totalCovariance = covariance.reduce((sum, value) => sum + value, 0);
      const uniformScale = totalVariance > 1e-12 ? totalCovariance / totalVariance : 1;
      const uniformOffset = targetMean.map((value, axis) => value - uniformScale * sourceMean[axis]);
      for (const model of [
        { kind: 'signed-axis-permutation-plus-translation', scale: [1,1,1], offset: targetMean.map((v, a) => v - sourceMean[a]) },
        { kind: 'uniform-scale-plus-translation', scale: [uniformScale,uniformScale,uniformScale], offset: uniformOffset },
        { kind: 'per-axis-scale-plus-translation', scale: axisScale, offset: axisOffset },
      ]) {
        let sumSquares = 0, maxError = 0;
        for (let frame = 0; frame < n; frame++) {
          const predicted = [0,1,2].map(axis => transformed[frame][axis] * model.scale[axis] + model.offset[axis]);
          const error = Math.hypot(...predicted.map((value, axis) => value - target.positions[frame][axis]));
          sumSquares += error * error;
          if (error > maxError) maxError = error;
        }
        results.push({
          kind: model.kind,
          axisMapping: permutation.map((axis, out) => `${signs[out] < 0 ? '-' : '+'}${'XYZ'[axis]} -> ${'XYZ'[out]}`),
          scale: model.scale,
          translation: model.offset,
          rmse: Math.sqrt(sumSquares / n),
          maxError,
        });
      }
    }
  }
  results.sort((a, b) => a.rmse - b.rmse || a.maxError - b.maxError);
  return results;
}

function main(argv) {
  const arg = name => { const index = argv.indexOf(name); return index < 0 ? '' : argv[index + 1]; };
  const sourcePath = arg('--source'), targetPath = arg('--target'), trackId = arg('--track') || '0x1F4DA262FC146772', outPath = arg('--out');
  if (!sourcePath || !targetPath || !outPath) throw new Error('Usage: node analyze-root-coordinate-transform.js --source <clips> --target <clips> [--track 0x... ] --out <report.json>');
  const source = readTrack(sourcePath, trackId), target = readTrack(targetPath, trackId);
  const fits = fit(source, target);
  const modelKinds = [...new Set(fits.map(item => item.kind))];
  const bestByModel = Object.fromEntries(modelKinds.map(kind => [kind, fits.find(item => item.kind === kind)]));
  const report = {
    schema: 'aurora-forge/root-coordinate-transform-fit/v1',
    source: { ...source, positions: undefined },
    target: { ...target, positions: undefined },
    bestByModel,
    best: fits.slice(0, 12),
    limits: [
      'Fits decoded clip-local position samples only; it does not prove coordinate semantics, root/origin hierarchy, actor placement, or runtime behavior.',
      'A low residual is a candidate coordinate mapping, not authorization to rewrite a clip.',
    ],
  };
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ source: report.source, target: report.target, best: report.best.slice(0, 3), out: path.resolve(outPath) }, null, 2));
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Aurora root coordinate fit failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { readTrack, fit };
