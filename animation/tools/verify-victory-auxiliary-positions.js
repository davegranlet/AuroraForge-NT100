'use strict';

// Verify source-derived static Victory6100 companion placements in a target
// .clips payload. Scoped to the four measured 6100 auxiliary roots.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readVictoryAuxiliaryPlacements } = require('./fop19-victory-rope-placement');
const { parseFile, clipNameId } = require('./clips-layout');
const { parseClipsRecordBuffer } = require('./clips-codec/parse-clips-record');
const { readTrackDescriptors } = require('./clips-codec/read-track-descriptors');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function verifyVictoryAuxiliaryPositions({ source0fopPath, targetClipsPath, motionId, tolerance = 0.001 }) {
  if (!source0fopPath || !targetClipsPath || !Number.isInteger(Number(motionId))) {
    throw new Error('source0fopPath, targetClipsPath and integer motionId are required');
  }
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error('tolerance must be a nonnegative finite number');
  const sourceBytes = fs.readFileSync(source0fopPath);
  const clipsBytes = fs.readFileSync(targetClipsPath);
  const rows = readVictoryAuxiliaryPlacements(sourceBytes);
  const layout = parseFile(targetClipsPath, { includeRaw: false });
  const results = rows.map((row) => {
    const clipName = `${motionId}_00_r${row.sourceRootName.slice(-2)}`;
    const id = clipNameId(clipName);
    const matches = layout.records.filter(record => record.id === id);
    if (matches.length !== 1) throw new Error(`${clipName}: expected one record, found ${matches.length}`);
    const record = matches[0];
    if (record.frameValue !== 2421) throw new Error(`${clipName}: expected 2421 samples, found ${record.frameValue}`);
    const decoded = parseClipsRecordBuffer(clipsBytes, record.index);
    const descriptors = readTrackDescriptors({ rec: decoded.rec }, 0);
    if (descriptors.length !== 6) throw new Error(`${clipName}: expected six root transform descriptors, found ${descriptors.length}`);
    if (descriptors.some(item => item.width !== 0) || decoded.group.bytes !== 0) {
      throw new Error(`${clipName}: source static placement is not stored as a static root transform`);
    }
    const expected = [row.position[0], -row.position[1], row.position[2], 0, -row.yaw / 2, 0];
    const errors = descriptors.map((item, index) => Math.abs(item.rest - expected[index]));
    return {
      sourceChild: row.sourceChild,
      sourceSection: row.section,
      sourceRecordIndex: row.recordIndex,
      clipName,
      clipId: id,
      targetRecordIndex: record.index,
      frames: record.frameValue,
      expected,
      actual: descriptors.map(item => item.rest),
      maxAbsoluteError: Math.max(...errors),
      pass: errors.every(error => error <= tolerance),
    };
  });
  return {
    schema: 'aurora-forge/victory-auxiliary-position-verification/v1',
    source0fopPath: path.resolve(source0fopPath),
    source0fopSha256: sha256(sourceBytes),
    targetClipsPath: path.resolve(targetClipsPath),
    targetClipsSha256: sha256(clipsBytes),
    tolerance,
    pass: results.length === 4 && results.every(result => result.pass),
    results,
    scope: 'Verifies four measured static 2K19 Victory6100 auxiliary root placements in stored target clips; does not prove runtime activation or event-handler semantics.',
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

if (require.main === module) {
  try {
    if (process.argv.includes('--help')) {
      process.stdout.write('Usage: node verify-victory-auxiliary-positions.js --source-0fop <file.0fop> --target-clips <file.clips> --motion-id <id> --out <report.json> [--tolerance <units>]\n');
    } else {
      const source0fopPath = arg('--source-0fop');
      const targetClipsPath = arg('--target-clips');
      const motionId = arg('--motion-id');
      const output = arg('--out');
      if (!source0fopPath || !targetClipsPath || !motionId || !output) throw new Error('source-0fop, target-clips, motion-id and out are required');
      const report = verifyVictoryAuxiliaryPositions({ source0fopPath, targetClipsPath, motionId, tolerance: arg('--tolerance') === undefined ? 0.001 : Number(arg('--tolerance')) });
      fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ pass: report.pass, source0fopSha256: report.source0fopSha256, targetClipsSha256: report.targetClipsSha256, placements: report.results.map(({ clipName, frames, maxAbsoluteError, pass }) => ({ clipName, frames, maxAbsoluteError, pass })) }, null, 2)}\n`);
      if (!report.pass) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`Victory auxiliary-position verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verifyVictoryAuxiliaryPositions };
