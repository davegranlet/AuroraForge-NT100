'use strict';

const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { report: latticeReport } = require('./yanm20-2k25-group90-lattice-report');

function descriptorReferences(record) {
  const descriptors = record.raw?.group78;
  if (!descriptors) throw new Error('record must be parsed with raw descriptor entries');
  const tracks = record.trackIdentifiers.length;
  if (!tracks || descriptors.length % tracks !== 0) throw new Error('descriptor count does not divide by target track count');
  const perTrack = descriptors.length / tracks;
  return descriptors.flatMap((descriptor, index) => {
    const startEntry = descriptor.candidate.u32le[0];
    if (startEntry === 0) return [];
    if (startEntry >= record.raw.group90.length) throw new Error(`descriptor ${index} start ${startEntry} is outside Group90`);
    return [{ trackIndex: Math.floor(index / perTrack), slot: index % perTrack, startEntry }];
  });
}

function buildInput(record) {
  const references = descriptorReferences(record);
  const starts = new Map();
  for (const reference of references) {
    const item = starts.get(reference.startEntry) ?? { startEntry: reference.startEntry, referenceCount: 0, references: [] };
    item.referenceCount += 1;
    item.references.push({ trackIndex: reference.trackIndex, slot: reference.slot, transformFamily: null });
    starts.set(reference.startEntry, item);
  }
  const group90 = record.sections.find(section => section.name === 'group90');
  return {
    schema: 'aurora-forge-clips-descriptor-starts/v1',
    target: {
      record: record.index,
      id: record.id,
      frameValue: record.frameValue,
      fps: record.fps,
      tracks: record.trackIdentifiers.length,
      descriptorsPerTrack: record.raw.group78.length / record.trackIdentifiers.length,
      group90Entries: record.raw.group90.length,
      group90Bytes: group90.bytes,
    },
    starts: [...starts.values()].sort((a, b) => a.startEntry - b.startEntry),
    referenceCount: references.length,
  };
}

function run(clipsPath, recordIndex, stride = 256) {
  const target = parseFile(path.resolve(clipsPath));
  const record = target.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const input = buildInput(record);
  const lattice = latticeReport(input, stride);
  return {
    ...lattice,
    schema: 'aurora-forge-clips-descriptor-lattice-report/v1',
    target: input.target,
    summary: { referencedDescriptorFields: input.referenceCount, distinctStartEntries: input.starts.length },
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/clips-descriptor-lattice-report.js <target.clips> <record> [stride]');
    const record = Number(process.argv[3]);
    const stride = process.argv[4] === undefined ? 256 : Number(process.argv[4]);
    if (!Number.isInteger(record) || record < 0) throw new Error('record must be a non-negative integer');
    process.stdout.write(`${JSON.stringify(run(process.argv[2], record, stride), null, 2)}\n`);
  } catch (error) {
    console.error(`CLIPS descriptor lattice report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildInput, descriptorReferences, run };
