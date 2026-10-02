'use strict';

// Export a neutral, source-only intermediate representation. This is the
// handoff between container decoding and the future 2K25 writer; it does not
// pretend packed values are already transforms.
const fs = require('node:fs');
const path = require('node:path');
const { decode } = require('./yanm-keyframes');

function exportIr(input, sectionIndex = null, trackIndex = null) {
  const buffer = fs.readFileSync(path.resolve(input));
  const sections = decode(buffer)
    .filter((section, index) => sectionIndex === null || sectionIndex === index)
    .map((section, index) => ({
      sectionIndex: sectionIndex ?? index,
      bytes: section.bytes,
      tracks: section.tracks
        .filter(track => trackIndex === null || track.index === trackIndex)
        .map(track => ({
          index: track.index,
          type: `0x${track.type.toString(16).padStart(4, '0')}`,
          hash32: `0x${track.hash.toUpperCase()}`,
          frameCount: track.frameCount ?? null,
          channelHeader: track.channelHeader ?? null,
          quantizationCandidates: track.quantizationCandidates ?? null,
          timelines: ['primary', 'secondary', 'tertiary']
            .filter(name => track[name])
            .map(name => ({
              name,
              stride: track[name].stride,
              totalFrames: track[name].totalFrames,
              keys: track[name].keys,
            })),
          supported: track.supported,
          timelineMatches: track.timelineMatches ?? false,
        })),
    }));
  // Restore indexes after filtering without leaking source paths.
  return {
    schema: 'aurora-forge-wwe2k19-motion-ir/v1',
    status: 'Experimental',
    sourceFile: path.basename(input),
    sections,
    limits: [
      'Packed sample values are preserved as signed words; transform semantics are not assigned.',
      'A writer must reject unsupported tracks and timeline mismatches.',
      'This IR contains no target .clips encoding or game-installation changes.',
    ],
  };
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/export-yanm-ir.js <decoded-motion.bin> [section] [track]');
    const section = process.argv[3] === undefined ? null : Number(process.argv[3]);
    const track = process.argv[4] === undefined ? null : Number(process.argv[4]);
    if (section !== null && !Number.isInteger(section)) throw new Error('section must be an integer');
    if (track !== null && !Number.isInteger(track)) throw new Error('track must be an integer');
    process.stdout.write(`${JSON.stringify(exportIr(process.argv[2], section, track), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM IR export failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { exportIr };
