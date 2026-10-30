'use strict';

// Aurora read-only coordinate audit for matching a 2K19 Camera/tgt.Camera
// sequence to its known 2K26 camera counterpart. Fits per-axis affine maps and
// reports residuals; it never writes game assets or claims world placement.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseFile } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');
const { evalGroup } = require('./clips-codec/eval-group');

const PHASES = [
  { source: '1014002.clips', target: '1000273.clips' },
  { source: '1114002.clips', target: '1100273.clips' },
  { source: '1214002.clips', target: '1200273.clips' },
  { source: '1314002.clips', target: '1300273.clips' },
  { source: '1414002.clips', target: '1400273.clips' },
];
const CAMERA_IDS = ['0x54D1B2A64667E32E', '0x5A3744A0D6E080B1'];

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(); }
function readPair(file) {
  const bytes = fs.readFileSync(file);
  const layout = parseFile(file, { includeRaw: false });
  const matches = layout.records.filter(candidate => CAMERA_IDS.every(id => candidate.trackIdentifiers.includes(id)));
  if (matches.length !== 1) throw new Error(`${file}: expected one record containing both camera tracks; found ${matches.length}`);
  const record = matches[0], recordIndex = record.index;
  const parsed = parseClipsRecordBuffer(bytes, recordIndex);
  const stream = bytes.subarray(parsed.base, parsed.base + parsed.group.bytes);
  const tracks = CAMERA_IDS.map((id) => {
    const trackIndex = record.trackIdentifiers.findIndex((value) => `0x${BigInt(value).toString(16).toUpperCase().padStart(16, '0')}` === id);
    if (trackIndex < 0) throw new Error(`${file}: missing camera track ${id}`);
    const descriptors = readTrackDescriptors(parsed, trackIndex);
    const group = parsed.bones[trackIndex].groups[0];
    const values = evalGroup(stream, group, descriptors.slice(0, 3), record.frameValue);
    if (!values || values.length !== record.frameValue) throw new Error(`${file}: camera position track ${id} did not decode fully`);
    return values;
  });
  return { file: path.resolve(file), sha256: sha256(bytes), recordIndex, recordId: record.id, frames: record.frameValue, fps: record.fps, tracks };
}

function fit(samples) {
  const n = samples.length;
  const mx = samples.reduce((a, p) => a + p[0], 0) / n;
  const my = samples.reduce((a, p) => a + p[1], 0) / n;
  let xx = 0, xy = 0, yy = 0;
  for (const [x, y] of samples) { xx += (x - mx) ** 2; xy += (x - mx) * (y - my); yy += (y - my) ** 2; }
  const scale = xx ? xy / xx : 0;
  const offset = my - scale * mx;
  let squared = 0, maxAbs = 0;
  for (const [x, y] of samples) { const e = y - (scale * x + offset); squared += e * e; maxAbs = Math.max(maxAbs, Math.abs(e)); }
  return { samples: n, scale, offset, rmse: Math.sqrt(squared / n), maxAbsoluteError: maxAbs, rSquared: yy ? 1 - squared / yy : (squared === 0 ? 1 : 0) };
}

function audit(sourceDir, targetDir) {
  const rows = [];
  const globalSamples = Array.from({ length: 2 }, () => Array.from({ length: 3 }, () => []));
  for (const pair of PHASES) {
    const source = readPair(path.join(sourceDir, pair.source));
    const target = readPair(path.join(targetDir, pair.target));
    if (source.frames !== target.frames || source.fps !== target.fps) throw new Error(`${pair.source}/${pair.target}: timeline mismatch`);
    for (let t = 0; t < 2; t++) for (let axis = 0; axis < 3; axis++) {
      const samples = source.tracks[t].map((p, frame) => [p[axis], target.tracks[t][frame][axis]]);
      rows.push({ phase: pair.source.slice(0, 3), channel: t === 0 ? 'Camera.position' : 'tgt.Camera.position', axis: 'XYZ'[axis], ...fit(samples) });
      globalSamples[t][axis].push(...samples);
    }
  }
  return {
    schema: 'aurora-forge/2k19-camera-to-target-coordinate-audit/v1',
    method: 'Fit targetPosition = scale * convertedSourcePosition + offset independently per axis across corresponding 273 frames in all five phases.',
    sourceDirectory: path.resolve(sourceDir),
    targetDirectory: path.resolve(targetDir),
    sourceRecords: PHASES.map(p => readPair(path.join(sourceDir, p.source))),
    targetRecords: PHASES.map(p => readPair(path.join(targetDir, p.target))),
    fits: rows,
    globalFits: globalSamples.flatMap((axes, t) => axes.map((samples, axis) => ({ channel: t === 0 ? 'Camera.position' : 'tgt.Camera.position', axis: 'XYZ'[axis], ...fit(samples) }))),
    limits: [
      'The paired source and target are the same Entrance motion family, not Victory 6100.',
      'Per-axis affine fit is a diagnostic; only low residuals across all phases support a shared coordinate map.',
      'This does not prove camera-parent composition, rotation convention, Victory scene binding, or runtime framing.',
    ],
  };
}

function run(argv) {
  const get = name => { const i = argv.indexOf(name); return i < 0 ? '' : argv[i + 1]; };
  const sourceDir = get('--source-dir'), targetDir = get('--target-dir'), out = get('--out');
  if (!sourceDir || !targetDir || !out) throw new Error('Usage: node compare-2k19-camera-to-target-coordinates.js --source-dir <converted-2k19-camera-clips-dir> --target-dir <native-2k26-clips-dir> --out <new-report.json>');
  if (fs.existsSync(out)) throw new Error(`refusing to overwrite ${out}`);
  const report = audit(sourceDir, targetDir);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = run(process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[process.argv.indexOf('--out') + 1], fits: report.fits }, null, 2));
  } catch (error) { console.error(`camera coordinate audit failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { audit, fit, run };
