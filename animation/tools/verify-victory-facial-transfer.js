'use strict';

// Read back mapped scalar facial channels from a packaged Victory .clips file.
const fs = require('node:fs');
const path = require('node:path');
const { readScalarExtras } = require('./facial-extra-layout');
const { parse } = require('./clips-layout');
const { evalGroup } = require('./clips-codec/eval-group');
const { halfLog } = require('./decode-2k19-entrance-source');

function verifyVictoryFacialTransfer({ clipsPath, recordIndex, transferPath, sourceFacePath, tolerance = 0.002, boneTolerance = 0.0001 }) {
  if (!clipsPath || !transferPath || !Number.isInteger(recordIndex) || recordIndex < 0) {
    throw new Error('clipsPath, transferPath and nonnegative recordIndex are required');
  }
  if (!Number.isFinite(tolerance) || tolerance < 0 || !Number.isFinite(boneTolerance) || boneTolerance < 0) throw new Error('tolerances must be nonnegative and finite');
  const transfer = JSON.parse(fs.readFileSync(transferPath, 'utf8'));
  const source = fs.readFileSync(clipsPath);
  const actual = readScalarExtras(source, recordIndex);
  if (actual.frames !== transfer.source.frames || actual.channels.length !== transfer.dictionary.total) {
    throw new Error(`facial record shape mismatch: frames=${actual.frames}, channels=${actual.channels.length}`);
  }
  if (transfer.counts.unmapped !== 0 || transfer.rows.length !== transfer.source.curves) {
    throw new Error('transfer map does not account for every source morph curve');
  }
  const expectedByIndex = new Map(transfer.targetChannels.map(channel => [channel.index, channel]));
  const results = actual.channels.map((channel) => {
    const expected = expectedByIndex.get(channel.index);
    if (!expected) {
      const pass = channel.width === 0 && channel.rest === 0 && channel.static;
      return { index: channel.index, key: channel.key, mapped: false, width: channel.width, rest: channel.rest, static: channel.static, pass };
    }
    if (channel.width !== expected.width || channel.scale !== expected.scale || channel.rest !== expected.rest) {
      throw new Error(`channel ${channel.index} descriptor differs from transfer: got ${channel.scale}/${channel.width}/${channel.rest}, expected ${expected.scale}/${expected.width}/${expected.rest}`);
    }
    if (channel.values.length !== expected.series.length) throw new Error(`channel ${channel.index} sample count mismatch`);
    let maxAbsoluteError = 0;
    for (let frame = 0; frame < channel.values.length; frame += 1) {
      maxAbsoluteError = Math.max(maxAbsoluteError, Math.abs(channel.values[frame] - expected.series[frame]));
    }
    return { index: channel.index, key: channel.key, mapped: true, frames: channel.values.length, maxAbsoluteError, pass: maxAbsoluteError <= tolerance };
  });
  let facialBoneTrack = null;
  if (sourceFacePath) {
    const expectedFace = JSON.parse(fs.readFileSync(sourceFacePath, 'utf8'));
    if (expectedFace.frames !== actual.frames || expectedFace.facial?.length !== 7) throw new Error('source facial-bone report must contain seven tracks at the target frame count');
    const layout = parse(source, { includeRaw: true });
    const record = layout.records[recordIndex];
    if (!record || record.trackIdentifiers.length !== 8) throw new Error('target facial record must contain eight bone tracks');
    const streamSection = record.sections.find(section => section.name === 'group90');
    const streamStart = record.offset + parseInt(streamSection.relativeOffset, 16);
    const stream = source.subarray(streamStart, streamStart + streamSection.bytes);
    const descriptor = (track, group, axis) => {
      const item = record.raw.group78[track * 6 + group * 3 + axis];
      if (!item) throw new Error(`missing facial bone descriptor ${track}/${group}/${axis}`);
      return {
        scale: Buffer.from(item.hex.slice(0, 2), 'hex').readInt8(0),
        width: parseInt(item.hex.slice(2, 4), 16),
        rest: item.candidate.f32le[1],
      };
    };
    const boneRows = expectedFace.facial.map((sourceTrack, index) => {
      const bone = index + 1;
      const positionDescriptors = Array.from({ length: 3 }, (_, axis) => descriptor(bone, 0, axis));
      const rotationDescriptors = Array.from({ length: 3 }, (_, axis) => descriptor(bone, 1, axis));
      const position = evalGroup(stream, actual.boneGroups[bone * 2], positionDescriptors, actual.frames)
        ?? Array.from({ length: actual.frames }, () => positionDescriptors.map(item => item.rest));
      const rotation = evalGroup(stream, actual.boneGroups[bone * 2 + 1], rotationDescriptors, actual.frames)
        ?? Array.from({ length: actual.frames }, () => rotationDescriptors.map(item => item.rest));
      const sourceRotation = sourceTrack.q.map(halfLog);
      let maxPositionError = 0;
      let maxHalfLogRotationError = 0;
      for (let frame = 0; frame < actual.frames; frame += 1) {
        for (let axis = 0; axis < 3; axis += 1) {
          maxPositionError = Math.max(maxPositionError, Math.abs(position[frame][axis] - sourceTrack.p[frame][axis]));
          maxHalfLogRotationError = Math.max(maxHalfLogRotationError, Math.abs(rotation[frame][axis] - sourceRotation[frame][axis]));
        }
      }
      return { sourceTrack: index, targetBone: bone, frames: actual.frames, maxPositionError, maxHalfLogRotationError, pass: maxPositionError <= boneTolerance && maxHalfLogRotationError <= boneTolerance };
    });
    facialBoneTrack = {
      sourceFacePath: path.resolve(sourceFacePath),
      frames: actual.frames,
      maxPositionError: Math.max(...boneRows.map(row => row.maxPositionError)),
      maxHalfLogRotationError: Math.max(...boneRows.map(row => row.maxHalfLogRotationError)),
      tolerance: boneTolerance,
      pass: boneRows.every(row => row.pass),
      bones: boneRows,
    };
  }
  return {
    schema: 'aurora-forge/victory-facial-transfer-readback/v1',
    clipsPath: path.resolve(clipsPath),
    clipsSha256: actual.recordIndex === recordIndex ? require('node:crypto').createHash('sha256').update(source).digest('hex').toUpperCase() : null,
    recordIndex,
    frames: actual.frames,
    sourceCurves: transfer.source.curves,
    mappedChannels: expectedByIndex.size,
    staticUnmappedTargetChannels: actual.channels.length - expectedByIndex.size,
    maxAbsoluteError: Math.max(0, ...results.filter(row => row.mapped).map(row => row.maxAbsoluteError)),
    facialBoneTrack,
    pass: actual.boundaryExact && actual.paddingAllZero && results.length === actual.channels.length && results.every(row => row.pass) && (!facialBoneTrack || facialBoneTrack.pass),
    results,
    limits: ['Verifies stored facial scalar curves against the Aurora transfer-map output.', 'Does not prove that reference or inferred source-to-target facial semantics match the game model or runtime appearance.'],
  };
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

if (require.main === module) {
  try {
    if (process.argv.includes('--help')) {
      process.stdout.write('Usage: node verify-victory-facial-transfer.js --clips <file.clips> --record-index <index> --transfer <transfer.json> [--source-face <decoded-source.json>] --out <report.json> [--tolerance <value>] [--bone-tolerance <value>]\n');
    } else {
      const clipsPath = arg('--clips');
      const recordIndex = Number(arg('--record-index'));
      const transferPath = arg('--transfer');
      const output = arg('--out');
      if (!clipsPath || !Number.isInteger(recordIndex) || !transferPath || !output) throw new Error('clips, record-index, transfer and out are required');
      const report = verifyVictoryFacialTransfer({ clipsPath, recordIndex, transferPath, sourceFacePath: arg('--source-face'), tolerance: arg('--tolerance') === undefined ? 0.002 : Number(arg('--tolerance')), boneTolerance: arg('--bone-tolerance') === undefined ? 0.0001 : Number(arg('--bone-tolerance')) });
      fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
      fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
      process.stdout.write(`${JSON.stringify({ pass: report.pass, clipsSha256: report.clipsSha256, sourceCurves: report.sourceCurves, mappedChannels: report.mappedChannels, staticUnmappedTargetChannels: report.staticUnmappedTargetChannels, maxAbsoluteError: report.maxAbsoluteError, facialBoneTrack: report.facialBoneTrack && { pass: report.facialBoneTrack.pass, maxPositionError: report.facialBoneTrack.maxPositionError, maxHalfLogRotationError: report.facialBoneTrack.maxHalfLogRotationError } }, null, 2)}\n`);
      if (!report.pass) process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`Victory facial transfer verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { verifyVictoryFacialTransfer };
