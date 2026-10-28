'use strict';

// Maps the 2K25 descriptor start fields onto the fixed eight-byte Group90
// entry table. This deliberately does not assign transform semantics to an
// entry; it only establishes reusable entry references and local context.
const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { correlate } = require('./yanm20-2k25-family-correlate');

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-2k25-group90-entry-correlate.js <normalization-sweep.json> <2k19-decoded-bin> <2k25.clips> <target-record> [source-section] [context-entries]',
    '',
    'Reports descriptor starts as Group90 entry indexes. It does not decode packed transforms.',
  ].join('\n');
}

function entryView(entry) {
  return {
    index: entry.index,
    hex: entry.hex,
    u32le: entry.candidate.u32le,
    u16le: entry.candidate.u16le,
  };
}

function window(entries, start, radius) {
  const first = Math.max(0, start - radius);
  const last = Math.min(entries.length, start + radius + 1);
  return entries.slice(first, last).map(entryView);
}

function compactFamily(family) {
  return {
    sourceTriple: family.sourceTriple,
    stream: family.stream,
    permutation: family.permutation,
    signs: family.signs,
    offsets: family.offsets,
  };
}

function buildReport(correlation, record, radius) {
  const group90 = record.raw.group90;
  const byTrack = new Map();
  for (const family of correlation.transformFamilies) {
    for (const trackIndex of family.indexes) byTrack.set(trackIndex, compactFamily(family));
  }

  const references = [];
  for (const bucket of correlation.descriptorBuckets) {
    for (const trackIndex of bucket.indexes) {
      bucket.descriptor.starts.forEach((start, slot) => {
        if (!bucket.descriptor.slots.includes(slot) || start === 0) return;
        if (!Number.isInteger(start) || start < 0 || start >= group90.length) {
          throw new Error(`descriptor start ${start} for track ${trackIndex}, slot ${slot} is outside Group90`);
        }
        references.push({
          trackIndex,
          slot,
          startEntry: start,
          transformFamily: byTrack.get(trackIndex) ?? null,
        });
      });
    }
  }

  const starts = new Map();
  for (const reference of references) {
    const catalog = starts.get(reference.startEntry) ?? {
      startEntry: reference.startEntry,
      entry: entryView(group90[reference.startEntry]),
      references: [],
    };
    catalog.references.push({
      trackIndex: reference.trackIndex,
      slot: reference.slot,
      transformFamily: reference.transformFamily,
    });
    starts.set(reference.startEntry, catalog);
  }

  const startCatalog = [...starts.values()]
    .map(item => ({
      ...item,
      referenceCount: item.references.length,
      context: window(group90, item.startEntry, radius),
    }))
    .sort((a, b) => a.startEntry - b.startEntry);

  const used = new Set(startCatalog.map(item => item.startEntry));
  const gaps = [];
  for (let index = 0; index < startCatalog.length - 1; index += 1) {
    const from = startCatalog[index].startEntry;
    const to = startCatalog[index + 1].startEntry;
    gaps.push({ fromStartEntry: from, toStartEntry: to, entryCount: to - from, interveningUnreferencedEntries: Math.max(0, to - from - 1) });
  }

  return {
    schema: 'aurora-forge-yanm20-2k25-group90-entry-correlation/v1',
    status: 'Research',
    target: {
      record: record.index,
      id: record.id,
      frameValue: record.frameValue,
      fps: record.fps,
      group90Entries: group90.length,
      group90Bytes: record.sections.find(section => section.name === 'group90').bytes,
    },
    summary: {
      pairedTracks: correlation.summary.pairedTracks,
      referencedDescriptorFields: references.length,
      distinctStartEntries: startCatalog.length,
      unusedGroup90Entries: group90.length - used.size,
    },
    starts: startCatalog,
    startGaps: gaps,
    limits: [
      'The descriptor first field is reported against Group90 entry indexes as one candidate interpretation; range membership alone does not prove that interpretation.',
      'Entry contents are preserved as raw words; this report does not claim codec command boundaries or transform semantics.',
    ],
  };
}

function parseArgs(argv) {
  if (argv.length < 4) throw new Error(usage());
  const args = {
    sweep: argv[0],
    source19: argv[1],
    target25: argv[2],
    record: Number(argv[3]),
    section: argv[4] === undefined ? 0 : Number(argv[4]),
    radius: argv[5] === undefined ? 2 : Number(argv[5]),
  };
  if (!Number.isInteger(args.record) || args.record < 0) throw new Error('target-record must be a non-negative integer');
  if (!Number.isInteger(args.section) || args.section < 0) throw new Error('source-section must be a non-negative integer');
  if (!Number.isInteger(args.radius) || args.radius < 0 || args.radius > 32) throw new Error('context-entries must be an integer from 0 to 32');
  return args;
}

function run(args) {
  const correlation = correlate(args);
  const target = parseFile(path.resolve(args.target25));
  const record = target.records[args.record];
  if (!record) throw new Error(`target record ${args.record} not found`);
  return buildReport(correlation, record, args.radius);
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(run(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 to 2K25 Group90 entry correlation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildReport, window };
