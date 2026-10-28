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

function stats(values) {
  if (values.length === 0) return null;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    unique: new Set(values).size,
  };
}

function packedStats(timeline) {
  const columns = [];
  for (const key of timeline.keys) {
    key.packed.forEach((value, index) => {
      if (!columns[index]) columns[index] = [];
      columns[index].push(value);
    });
  }
  return {
    name: timeline.name,
    stride: timeline.stride,
    keys: timeline.keys.length,
    totalFrames: timeline.totalFrames,
    packedWordsPerKey: columns.length,
    packedColumns: columns.map(stats),
  };
}

function readTrackDescriptors(clipsPath, record) {
  const buffer = fs.readFileSync(clipsPath);
  const group78 = sectionByName(record, 'group78 descriptors');
  const start = record.offset + parseHexOffset(group78.relativeOffset);
  const descriptorsPerTrack = record.trackIdentifiers.length > 0
    ? group78.count / record.trackIdentifiers.length
    : 0;
  if (!Number.isInteger(descriptorsPerTrack)) throw new Error('descriptor count does not divide by track count');

  return record.trackIdentifiers.map((targetId64, trackIndex) => {
    const descriptors = Array.from({ length: descriptorsPerTrack }, (_, descriptorIndex) => {
      const offset = start + (trackIndex * descriptorsPerTrack + descriptorIndex) * 8;
      const first = buffer.readUInt32LE(offset);
      const second = buffer.readUInt32LE(offset + 4);
      return {
        descriptorIndex,
        hex: buffer.subarray(offset, offset + 8).toString('hex').toUpperCase(),
        firstU32: first,
        secondU32: second,
        secondF32: Number.isFinite(buffer.readFloatLE(offset + 4)) ? buffer.readFloatLE(offset + 4) : null,
        nonzero: first !== 0 || second !== 0,
      };
    });
    return {
      trackIndex,
      targetId64,
      nonzeroMask: descriptors.map(item => item.nonzero ? '1' : '0').join(''),
      nonzeroSlots: descriptors.filter(item => item.nonzero).map(item => item.descriptorIndex),
      descriptors,
    };
  });
}

function summarize(sourcePath, targetPath, targetRecordIndex, sourceSectionIndex = 0) {
  const ir = exportIr(sourcePath, sourceSectionIndex);
  const sourceSection = ir.sections[0];
  if (!sourceSection) throw new Error(`source section ${sourceSectionIndex} not found`);
  const target = parseFile(targetPath, { includeRaw: false });
  const record = target.records[targetRecordIndex];
  if (!record) throw new Error(`target record ${targetRecordIndex} not found`);
  const targetTracks = readTrackDescriptors(targetPath, record);
  const pairCount = Math.min(sourceSection.tracks.length, targetTracks.length);
  const pairs = Array.from({ length: pairCount }, (_, index) => {
    const sourceTrack = sourceSection.tracks[index];
    const targetTrack = targetTracks[index];
    return {
      pairIndex: index,
      source: {
        index: sourceTrack.index,
        type: sourceTrack.type,
        hash32: sourceTrack.hash32,
        frameCount: sourceTrack.frameCount,
        timelineShape: sourceTrack.timelines.map(timeline => ({
          name: timeline.name,
          stride: timeline.stride,
          keys: timeline.keys.length,
          totalFrames: timeline.totalFrames,
          packedWordsPerKey: timeline.keys[0]?.packed?.length ?? 0,
        })),
        packedStats: sourceTrack.timelines.map(packedStats),
      },
      target: {
        index: targetTrack.trackIndex,
        id64: targetTrack.targetId64,
        nonzeroMask: targetTrack.nonzeroMask,
        nonzeroSlots: targetTrack.nonzeroSlots,
        descriptorFirstU32: targetTrack.descriptors.map(item => item.firstU32),
        descriptorSecondF32: targetTrack.descriptors.map(item => item.secondF32),
      },
    };
  });

  const byTypeAndMask = new Map();
  for (const pair of pairs) {
    const key = `${pair.source.type}|${pair.target.nonzeroMask}`;
    const current = byTypeAndMask.get(key) ?? {
      sourceType: pair.source.type,
      targetMask: pair.target.nonzeroMask,
      count: 0,
      examples: [],
    };
    current.count += 1;
    if (current.examples.length < 5) {
      current.examples.push({
        pairIndex: pair.pairIndex,
        sourceHash32: pair.source.hash32,
        targetId64: pair.target.id64,
        sourceTimelineShape: pair.source.timelineShape,
      });
    }
    byTypeAndMask.set(key, current);
  }

  return {
    schema: 'aurora-forge-track-descriptor-pattern-summary/v1',
    status: 'Research',
    source: {
      file: path.basename(sourcePath),
      section: sourceSectionIndex,
      tracks: sourceSection.tracks.length,
    },
    target: {
      file: path.basename(targetPath),
      record: targetRecordIndex,
      id: record.id,
      tracks: record.trackIdentifiers.length,
      frameValue: record.frameValue,
      fps: record.fps,
      descriptorsPerTrack: targetTracks[0]?.descriptors.length ?? 0,
      group90: record.group90Profile,
    },
    pairedTracks: pairCount,
    sourceOnlyTracks: Math.max(0, sourceSection.tracks.length - pairCount),
    targetOnlyTracks: Math.max(0, targetTracks.length - pairCount),
    typeMaskSummary: Array.from(byTypeAndMask.values())
      .sort((a, b) => b.count - a.count || a.sourceType.localeCompare(b.sourceType) || a.targetMask.localeCompare(b.targetMask)),
    pairs,
    limits: [
      'This summarizes alignment patterns only; descriptor slot meanings are still unverified.',
      'Packed source values are treated as source words, not decoded transforms.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 5) throw new Error('Usage: node tools/summarize-track-descriptor-patterns.js <source.yanm.bin> <target.clips> <target-record> [source-section]');
    const report = summarize(
      process.argv[2],
      process.argv[3],
      Number(process.argv[4]),
      process.argv[5] === undefined ? 0 : Number(process.argv[5]),
    );
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`track descriptor pattern summary failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { summarize };
