'use strict';

// Aurora Forge offline diagnostic: fit cross-generation J_Root position
// mappings independently inside corresponding SetPlace phases. A useful fit
// can distinguish a coordinate-basis/scale mismatch from trajectory changes;
// it does not authorize editing source choreography or a clip.
const fs = require('node:fs');
const path = require('node:path');
const { readRoot, setPlaceEvents } = require('./analyze-setplace-root-segments');
const { fit } = require('./analyze-root-coordinate-transform');

function lerp(a, b, t) { return a.map((value, axis) => value + (b[axis] - value) * t); }
function sample(positions, frame) {
  const f = Math.max(0, Math.min(positions.length - 1, frame));
  const low = Math.floor(f), high = Math.min(positions.length - 1, low + 1);
  return lerp(positions[low], positions[high], f - low);
}
function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(...points[i].map((v, a) => v - points[i - 1][a]));
  return total;
}
function rmse(a, b) {
  return Math.sqrt(a.reduce((sum, point, i) => sum + point.reduce((part, value, axis) => part + (value - b[i][axis]) ** 2, 0), 0) / a.length);
}
function phases(root, events, count) {
  return events.map((event, index) => {
    const next = events[index + 1];
    const end = next ? next.frame : root.frames - 1;
    const samples = Array.from({ length: count }, (_, i) => sample(root.positions, event.frame + (end - event.frame) * i / (count - 1)));
    return { name: event.placeName, startFrame: event.frame, endFrame: end, samples };
  });
}
function analyze(native, converted, nativeEvents, convertedEvents, sampleCount = 257) {
  if (nativeEvents.length !== convertedEvents.length) throw new Error('native/converted SetPlace event counts differ');
  const np = phases(native, nativeEvents, sampleCount), cp = phases(converted, convertedEvents, sampleCount);
  const results = np.map((n, index) => {
    const c = cp[index];
    if (n.name !== c.name) throw new Error(`SetPlace mismatch at segment ${index}: ${n.name} vs ${c.name}`);
    const baselineRmse = rmse(c.samples, n.samples);
    const centered = c.samples.map((point, i) => point.map((v, a) => v - (c.samples[0][a] - n.samples[0][a])));
    const boundaryAlignedRmse = rmse(centered, n.samples);
    const sourceForFit = { frames: sampleCount, fps: 60, positions: c.samples };
    const targetForFit = { frames: sampleCount, fps: 60, positions: n.samples };
    const fits = fit(sourceForFit, targetForFit);
    const bestByModel = Object.fromEntries([...new Set(fits.map(item => item.kind))].map(kind => [kind, fits.find(item => item.kind === kind)]));
    return {
      index, place: n.name,
      nativeFrames: [n.startFrame, n.endFrame], convertedFrames: [c.startFrame, c.endFrame],
      sampleCount,
      native: { start: n.samples[0], end: n.samples.at(-1), pathLength: pathLength(n.samples) },
      converted: { start: c.samples[0], end: c.samples.at(-1), pathLength: pathLength(c.samples) },
      rawPositionRmse: baselineRmse,
      boundaryTranslationOnlyRmse: boundaryAlignedRmse,
      bestByModel,
      bestOverall: fits[0],
      limits: ['Fits are per-phase diagnostics and may overfit; low residual is not proof that the native root path is the correct source choreography.',
        'A per-phase transform can create discontinuities at SetPlace boundaries and must be evaluated with root/origin hierarchy and camera/target coupling before any edit.'],
    };
  });
  return {
    schema: 'aurora-forge/setplace-root-coordinate-fit/v1',
    method: 'Sample native and converted J_Root position curves at equal normalized progress within matching SetPlace phases; compare raw, boundary-translation-only, signed-axis, uniform-scale, and per-axis-scale fits.',
    native: { path: native.inputPath, sha256: native.sha256, frames: native.frames, recordId: native.recordId },
    converted: { path: converted.inputPath, sha256: converted.sha256, frames: converted.frames, recordId: converted.recordId },
    results,
    summary: { sampleCountPerPhase: sampleCount, phases: results.length,
      bestPerPhaseRmse: results.map(result => ({ place: result.place, rmse: result.bestOverall.rmse, model: result.bestOverall.kind })) },
  };
}
function main(argv) {
  const [nativeClip, convertedClip, nativeModel, convertedModel, outputPath, sampleCountText = '257'] = argv;
  if (![nativeClip, convertedClip, nativeModel, convertedModel, outputPath].every(Boolean)) {
    throw new Error('Usage: node analyze-root-coordinate-transform-by-setplace.js <native.clips> <converted.clips> <native-command-map.json> <converted-command-map.json> <new-report.json> [sample-count]');
  }
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);
  const sampleCount = Number(sampleCountText);
  if (!Number.isInteger(sampleCount) || sampleCount < 2 || sampleCount > 10001) throw new Error('sample-count must be an integer from 2 to 10001');
  const report = analyze(readRoot(nativeClip), readRoot(convertedClip), setPlaceEvents(nativeModel), setPlaceEvents(convertedModel), sampleCount);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ output: path.resolve(outputPath), summary: report.summary,
    phases: report.results.map(result => ({ place: result.place, rawRmse: result.rawPositionRmse,
      boundaryTranslationOnlyRmse: result.boundaryTranslationOnlyRmse, best: result.bestOverall })),
  }, null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`SetPlace root coordinate fit failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { analyze };
