'use strict';

// Structural bridge report only. It intentionally does not claim that packed
// YANM words are transforms or that group90 words are writable keyframes.
const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');
const { parseFile } = require('./clips-layout');

function compare(sourcePath, targetPath, recordIndex = 0, sourceSectionIndex = 0) {
  const ir = exportIr(sourcePath);
  const target = parseFile(targetPath, { includeRaw: false });
  const record = target.records[recordIndex];
  if (!record) throw new Error(`target record ${recordIndex} does not exist`);
  const section = ir.sections[sourceSectionIndex];
  if (!section) throw new Error(`source section ${sourceSectionIndex} does not exist`);
  const tracks = section.tracks;
  const shared = Math.min(tracks.length, record.trackIdentifiers.length);
  return {
    schema: 'aurora-forge-motion-metadata-bridge/v1', status: 'Experimental',
    source: { file: path.basename(sourcePath), sections: ir.sections.length, section: sourceSectionIndex, tracks: tracks.length },
    target: { file: path.basename(targetPath), record: recordIndex, id: record.id, tracks: record.trackIdentifiers.length, frameValue: record.frameValue, fps: record.fps },
    trackBridge: { sharedOrderedTracks: shared, sourceOnlyTracks: tracks.length - shared, targetOnlyTracks: record.trackIdentifiers.length - shared,
      pairs: Array.from({ length: shared }, (_, index) => ({ index, sourceType: tracks[index].type, sourceHash32: tracks[index].hash32, targetId64: record.trackIdentifiers[index] })) },
    rawTargetDiagnostics: {
      group78Entries: record.sections.find(s => s.name === 'group78 descriptors').count,
      group90Entries: record.group90Profile.count,
      group90Profile: record.group90Profile,
      group90Sha256: record.sections.find(s => s.name === 'group90').sha256,
    },
    limits: ['Track order is compared structurally only.', 'Packed source values and target group90 entries remain undecoded.', 'This report is not a conversion and cannot establish game validity.'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/compare-motion-metadata.js <source.yanm> <target.clips> [record] [source-section]');
    console.log(JSON.stringify(compare(process.argv[2], process.argv[3], process.argv[4] === undefined ? 0 : Number(process.argv[4]), process.argv[5] === undefined ? 0 : Number(process.argv[5])), null, 2));
  } catch (error) { console.error(`metadata comparison failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { compare };
