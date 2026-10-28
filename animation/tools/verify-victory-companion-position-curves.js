'use strict';

// Independently decode target .clips root-translation tracks and compare them
// with source-derived per-frame expected curves. This verifies stored motion
// samples; it does not prove runtime activation or ADefs handler semantics.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile, clipNameId } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function verifyCompanionPositionCurves({ clipsPath, pairs, tolerance = 0.001 }) {
  if (typeof clipsPath !== 'string' || !clipsPath) throw new Error('clipsPath is required');
  if (!Array.isArray(pairs) || pairs.length === 0) throw new Error('pairs must contain at least one comparison');
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('tolerance must be a nonnegative finite number');

  const clipsBytes = fs.readFileSync(clipsPath);
  const layout = parseFile(clipsPath, { includeRaw: false });
  const results = pairs.map((pair) => {
    if (!pair || typeof pair.clipName !== 'string' || !pair.clipName) throw new Error('each pair requires clipName');
    if (typeof pair.expectedPath !== 'string' || !pair.expectedPath) throw new Error(`${pair.clipName}: expectedPath is required`);
    const trackIndex = pair.trackIndex ?? 0;
    if (!Number.isInteger(trackIndex) || trackIndex < 0) throw new Error(`${pair.clipName}: trackIndex must be a nonnegative integer`);

    const expectedBytes = fs.readFileSync(pair.expectedPath);
    const expectedDocument = JSON.parse(expectedBytes.toString('utf8'));
    const expected = expectedDocument?.body?.[trackIndex]?.p;
    if (!Array.isArray(expected) || expected.length === 0 || expected.some(row => !Array.isArray(row) || row.length !== 3 || row.some(v => !Number.isFinite(v)))) {
      throw new Error(`${pair.clipName}: expected body[${trackIndex}].p must be a nonempty array of finite vec3 samples`);
    }

    const clipId = clipNameId(pair.clipName);
    const records = layout.records.filter(record => record.id === clipId);
    if (records.length !== 1) throw new Error(`${pair.clipName}: expected one clip record, found ${records.length}`);
    const record = records[0];
    if (trackIndex >= record.trackIdentifiers.length) throw new Error(`${pair.clipName}: root track ${trackIndex} is outside the record`);
    const decoded = parseClipsRecordBuffer(clipsBytes, record.index);
    const descriptors = readTrackDescriptors({ rec: decoded.rec }, trackIndex).slice(0, 3);
    const stream = clipsBytes.subarray(decoded.base, decoded.base + decoded.group.bytes);
    const actual = evalGroup(stream, decoded.bones[trackIndex].groups[0], descriptors, decoded.rec.frameValue)
      ?? Array.from({ length: decoded.rec.frameValue }, () => descriptors.map(descriptor => descriptor.rest));
    if (actual.length !== expected.length) throw new Error(`${pair.clipName}: sample count mismatch, expected ${expected.length}, decoded ${actual.length}`);

    let maxError = 0;
    let maxFrame = 0;
    let maxComponent = 0;
    for (let frame = 0; frame < expected.length; frame += 1) {
      for (let component = 0; component < 3; component += 1) {
        const error = Math.abs(actual[frame][component] - expected[frame][component]);
        if (error > maxError) {
          maxError = error;
          maxFrame = frame;
          maxComponent = component;
        }
      }
    }
    return {
      clipName: pair.clipName,
      clipId,
      recordIndex: record.index,
      trackIndex,
      frames: actual.length,
      expectedSha256: sha256(expectedBytes),
      maxAbsoluteComponentError: maxError,
      maxErrorFrame: maxFrame,
      maxErrorComponent: maxComponent,
      pass: maxError <= tolerance,
    };
  });

  return {
    schema: 'aurora-forge/victory-companion-root-curve-verification/v1',
    clipsPath: path.resolve(clipsPath),
    clipsSha256: sha256(clipsBytes),
    tolerance,
    pass: results.every(result => result.pass),
    results,
    scope: 'Decoded target root position samples compared with source-derived expected samples; no claim about runtime activation or event-handler semantics.',
  };
}

function readArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith('--')) throw new Error(`unexpected argument: ${args[i]}`);
    const key = args[i].slice(2);
    if (key === 'help') { out.help = true; continue; }
    if (i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error(`missing value for --${key}`);
    out[key] = args[++i];
  }
  return out;
}

if (require.main === module) {
  try {
    const args = readArgs(process.argv.slice(2));
    if (args.help) {
      process.stdout.write('Usage: node verify-victory-companion-position-curves.js --clips <file.clips> --pairs <pairs.json> --out <report.json> [--tolerance <units>]\n');
    } else {
      if (!args.clips || !args.pairs || !args.out) throw new Error('Usage: node verify-victory-companion-position-curves.js --clips <file.clips> --pairs <pairs.json> --out <report.json> [--tolerance <units>]');
      const pairsPath = path.resolve(args.pairs);
      const pairs = JSON.parse(fs.readFileSync(pairsPath, 'utf8')).map(pair => ({
        ...pair,
        expectedPath: path.resolve(path.dirname(pairsPath), pair.expectedPath),
      }));
      const report = verifyCompanionPositionCurves({
        clipsPath: args.clips,
        pairs,
        tolerance: args.tolerance === undefined ? 0.001 : Number(args.tolerance),
      });
      fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
      fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ pass: report.pass, clipsSha256: report.clipsSha256, results: report.results }, null, 2)}\n`);
      if (!report.pass) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`Victory companion-position verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verifyCompanionPositionCurves };
