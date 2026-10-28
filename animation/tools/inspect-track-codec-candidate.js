'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');
const { parseFile } = require('./clips-layout');

function sectionByName(record, name) {
  const section = record.sections.find(item => item.name === name);
  if (!section) throw new Error(`target section ${name} not found`);
  return section;
}

function parseHexOffset(value) {
  return Number.parseInt(value.replace(/^0x/i, ''), 16);
}

function readDescriptors(clipsPath, record, limitTracks) {
  const buffer = fs.readFileSync(clipsPath);
  const group78 = sectionByName(record, 'group78 descriptors');
  const recordOffset = record.offset;
  const start = recordOffset + parseHexOffset(group78.relativeOffset);
  const descriptorsPerTrack = record.trackIdentifiers.length > 0
    ? group78.count / record.trackIdentifiers.length
    : 0;
  if (!Number.isInteger(descriptorsPerTrack)) throw new Error('descriptor count does not divide by track count');
  const trackCount = Math.min(record.trackIdentifiers.length, limitTracks);
  return Array.from({ length: trackCount }, (_, trackIndex) => ({
    trackIndex,
    targetId64: record.trackIdentifiers[trackIndex],
    descriptors: Array.from({ length: descriptorsPerTrack }, (_, descriptorIndex) => {
      const offset = start + (trackIndex * descriptorsPerTrack + descriptorIndex) * 8;
      return {
        descriptorIndex,
        hex: buffer.subarray(offset, offset + 8).toString('hex').toUpperCase(),
        u16le: [0, 2, 4, 6].map(delta => buffer.readUInt16LE(offset + delta)),
        u32le: [buffer.readUInt32LE(offset), buffer.readUInt32LE(offset + 4)],
        f32le: [buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4)]
          .map(value => Number.isFinite(value) ? value : null),
      };
    }),
  }));
}

function readGroup90Prefix(clipsPath, record, startEntry, count) {
  const buffer = fs.readFileSync(clipsPath);
  const group90 = sectionByName(record, 'group90');
  const start = record.offset + parseHexOffset(group90.relativeOffset) + startEntry * 8;
  const boundedCount = Math.max(0, Math.min(count, group90.count - startEntry));
  return Array.from({ length: boundedCount }, (_, index) => {
    const offset = start + index * 8;
    return {
      entry: startEntry + index,
      hex: buffer.subarray(offset, offset + 8).toString('hex').toUpperCase(),
      u16le: [0, 2, 4, 6].map(delta => buffer.readUInt16LE(offset + delta)),
      u32le: [buffer.readUInt32LE(offset), buffer.readUInt32LE(offset + 4)],
      f32le: [buffer.readFloatLE(offset), buffer.readFloatLE(offset + 4)]
        .map(value => Number.isFinite(value) ? value : null),
    };
  });
}

function timelineStats(timeline) {
  const packedWidths = timeline.keys.reduce((widths, key) => {
    key.packed.forEach((_, index) => widths.add(index));
    return widths;
  }, new Set()).size;
  return {
    name: timeline.name,
    stride: timeline.stride,
    keys: timeline.keys.length,
    totalFrames: timeline.totalFrames,
    packedWordsPerKey: packedWidths,
    firstKeys: timeline.keys.slice(0, 5),
  };
}

function inspect(sourcePath, targetPath, targetRecordIndex, sourceSectionIndex = 0, limitTracks = 8) {
  const ir = exportIr(sourcePath, sourceSectionIndex);
  const section = ir.sections[0];
  if (!section) throw new Error(`source section ${sourceSectionIndex} not found`);
  const target = parseFile(targetPath, { includeRaw: false });
  const record = target.records[targetRecordIndex];
  if (!record) throw new Error(`target record ${targetRecordIndex} not found`);
  const descriptors = readDescriptors(targetPath, record, limitTracks);
  const tracks = section.tracks.slice(0, limitTracks).map(track => ({
    index: track.index,
    type: track.type,
    hash32: track.hash32,
    frameCount: track.frameCount,
    quantizationCandidates: track.quantizationCandidates,
    timelines: track.timelines.map(timelineStats),
  }));
  return {
    schema: 'aurora-forge-track-codec-candidate-inspection/v1',
    status: 'Research',
    source: { file: path.basename(sourcePath), section: sourceSectionIndex, tracksInSection: section.tracks.length },
    target: {
      file: path.basename(targetPath),
      record: targetRecordIndex,
      id: record.id,
      tracks: record.trackIdentifiers.length,
      frameValue: record.frameValue,
      fps: record.fps,
      descriptors: sectionByName(record, 'group78 descriptors').count,
      group90: record.group90Profile,
    },
    comparedTrackPrefix: Math.min(limitTracks, section.tracks.length, record.trackIdentifiers.length),
    sourceTracks: tracks,
    targetDescriptorTracks: descriptors,
    group90Windows: descriptors.flatMap(track => track.descriptors
      .filter(descriptor => descriptor.u32le[0] > 0 && descriptor.u32le[0] < record.group90Profile.count)
      .map(descriptor => ({
        trackIndex: track.trackIndex,
        descriptorIndex: descriptor.descriptorIndex,
        startEntry: descriptor.u32le[0],
        entries: readGroup90Prefix(targetPath, record, descriptor.u32le[0], 4),
      }))),
    limits: [
      'This is a compact inspection report, not a value decoder.',
      'Descriptor fields and Group90 payload semantics remain unverified.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error('Usage: node tools/inspect-track-codec-candidate.js <source.yanm.bin> <target.clips> <target-record> [source-section] [track-limit]');
    const report = inspect(
      process.argv[2],
      process.argv[3],
      Number(process.argv[4]),
      process.argv[5] === undefined ? 0 : Number(process.argv[5]),
      process.argv[6] === undefined ? 8 : Number(process.argv[6]),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`track codec candidate inspection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { inspect };
