'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');

function ranges(trackDescriptors, group90Count) {
  const starts = new Map();
  trackDescriptors.forEach((descriptors, trackIndex) => descriptors.forEach((start, slot) => {
    if (!start) return;
    if (!Number.isInteger(start) || start < 0 || start >= group90Count) throw new Error(`descriptor start ${start} is outside Group90`);
    const item = starts.get(start) ?? { start, references: [] };
    item.references.push({ trackIndex, slot }); starts.set(start, item);
  }));
  const ordered = [...starts.values()].sort((a, b) => a.start - b.start);
  return ordered.map((item, index) => ({ ...item, endExclusive: ordered[index + 1]?.start ?? group90Count, entryCount: (ordered[index + 1]?.start ?? group90Count) - item.start }));
}

function boundedCandidates(trackDescriptors, group90Count) {
  const candidates = [];
  const excluded = [];
  trackDescriptors.forEach((descriptors, trackIndex) => descriptors.forEach((value, slot) => {
    if (value === 0) return;
    const item = { trackIndex, slot, value };
    if (Number.isInteger(value) && value > 0 && value < group90Count) candidates.push(item);
    else excluded.push(item);
  }));
  return { candidates, excluded };
}

function rangesFromCandidates(candidates, group90Count) {
  const starts = new Map();
  candidates.forEach(candidate => {
    const item = starts.get(candidate.value) ?? { start: candidate.value, references: [] };
    item.references.push({ trackIndex: candidate.trackIndex, slot: candidate.slot });
    starts.set(candidate.value, item);
  });
  const ordered = [...starts.values()].sort((a, b) => a.start - b.start);
  return ordered.map((item, index) => ({ ...item, endExclusive: ordered[index + 1]?.start ?? group90Count, entryCount: (ordered[index + 1]?.start ?? group90Count) - item.start }));
}

function inspect(clipsPath, recordIndex) {
  const parsed = parseFile(clipsPath);
  const record = parsed.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const perTrack = record.raw.group78.length / record.trackIdentifiers.length;
  if (!Number.isInteger(perTrack)) throw new Error('descriptor count does not divide by track count');
  const descriptors = record.trackIdentifiers.map((_, track) => record.raw.group78.slice(track * perTrack, (track + 1) * perTrack).map(entry => entry.candidate.u32le[0]));
  const classified = boundedCandidates(descriptors, record.raw.group90.length);
  const result = rangesFromCandidates(classified.candidates, record.raw.group90.length);
  return { schema: 'aurora-forge-group90-descriptor-ranges/v2', status: 'Research', target: { file: path.basename(clipsPath), record: recordIndex, tracks: record.trackIdentifiers.length, descriptorsPerTrack: perTrack, group90Entries: record.raw.group90.length }, summary: { boundedCandidates: classified.candidates.length, excludedNonzeroValues: classified.excluded.length, distinctRanges: result.length }, candidates: classified.candidates, excluded: classified.excluded, ranges: result, limits: ['A bounded descriptor value is only a candidate Group90 index; excluded values prove the descriptor word is not a universal direct index.'] };
}

if (require.main === module) {
  try { process.stdout.write(`${JSON.stringify(inspect(process.argv[2], Number(process.argv[3])), null, 2)}\n`); }
  catch (error) { console.error(`Group90 descriptor range inspection failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { boundedCandidates, inspect, ranges, rangesFromCandidates };
