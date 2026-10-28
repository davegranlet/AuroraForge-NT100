'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { summarize } = require('./summarize-track-descriptor-patterns');

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-2k25-family-correlate.js <normalization-sweep.json> <2k19-decoded-bin> <2k25.clips> <target-record> [source-section]',
    '',
    'The sweep JSON may be UTF-8 with or without BOM.',
  ].join('\n');
}

function readJson(input) {
  const text = fs.readFileSync(path.resolve(input), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}

function transformKey(best) {
  return JSON.stringify({
    sourceTriple: best.sourceTriple,
    stream: best.stream,
    permutation: best.permutation,
    signs: best.signs,
    offsets: best.offsets,
  });
}

function descriptorKey(pair) {
  return JSON.stringify({
    mask: pair.target.nonzeroMask,
    starts: pair.target.descriptorFirstU32,
    floats: pair.target.descriptorSecondF32.map(value => (
      typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(9)) : value
    )),
  });
}

function compactDescriptor(pair) {
  return {
    mask: pair.target.nonzeroMask,
    slots: pair.target.nonzeroSlots,
    starts: pair.target.descriptorFirstU32,
    floats: pair.target.descriptorSecondF32,
  };
}

function correlate(args) {
  const sweep = readJson(args.sweep);
  const descriptorSummary = summarize(args.source19, args.target25, args.record, args.section);
  const pairsByIndex = new Map(descriptorSummary.pairs.map(pair => [pair.pairIndex, pair]));
  const families = new Map();

  for (const track of sweep.tracks) {
    const pair = pairsByIndex.get(track.index);
    if (!pair) continue;
    const key = transformKey(track.best);
    const family = families.get(key) ?? {
      sourceTriple: track.best.sourceTriple,
      stream: track.best.stream,
      permutation: track.best.permutation,
      signs: track.best.signs,
      offsets: track.best.offsets,
      count: 0,
      indexes: [],
      sourceTypes: {},
      descriptorMasks: {},
      descriptorStartsBySlot: {},
      examples: [],
    };
    family.count++;
    family.indexes.push(track.index);
    family.sourceTypes[track.sourceType] = (family.sourceTypes[track.sourceType] ?? 0) + 1;
    family.descriptorMasks[pair.target.nonzeroMask] = (family.descriptorMasks[pair.target.nonzeroMask] ?? 0) + 1;
    pair.target.descriptorFirstU32.forEach((start, slot) => {
      if (!pair.target.nonzeroSlots.includes(slot)) return;
      const slotKey = String(slot);
      const starts = family.descriptorStartsBySlot[slotKey] ?? {};
      starts[start] = (starts[start] ?? 0) + 1;
      family.descriptorStartsBySlot[slotKey] = starts;
    });
    if (family.examples.length < 8) {
      family.examples.push({
        index: track.index,
        sourceType: track.sourceType,
        hash32: track.hash32,
        bestScore: track.best.coverageScore,
        descriptor: compactDescriptor(pair),
      });
    }
    families.set(key, family);
  }

  const descriptorBuckets = new Map();
  for (const track of sweep.tracks) {
    const pair = pairsByIndex.get(track.index);
    if (!pair) continue;
    const key = descriptorKey(pair);
    const bucket = descriptorBuckets.get(key) ?? {
      descriptor: compactDescriptor(pair),
      count: 0,
      indexes: [],
      transformFamilies: {},
    };
    bucket.count++;
    bucket.indexes.push(track.index);
    const tKey = transformKey(track.best);
    bucket.transformFamilies[tKey] = (bucket.transformFamilies[tKey] ?? 0) + 1;
    descriptorBuckets.set(key, bucket);
  }

  const familyList = [...families.values()]
    .sort((a, b) => b.count - a.count || a.sourceTriple.localeCompare(b.sourceTriple));
  const descriptorList = [...descriptorBuckets.values()]
    .sort((a, b) => b.count - a.count || a.descriptor.mask.localeCompare(b.descriptor.mask));

  return {
    schema: 'aurora-forge-yanm20-2k25-family-correlation/v1',
    status: 'Research',
    source19: sweep.source19,
    target20: sweep.target20,
    target25: descriptorSummary.target,
    summary: {
      pairedTracks: descriptorSummary.pairedTracks,
      transformFamilies: familyList.length,
      descriptorBuckets: descriptorList.length,
      sourceOnlyTracks: descriptorSummary.sourceOnlyTracks,
      targetOnlyTracks: descriptorSummary.targetOnlyTracks,
    },
    transformFamilies: familyList,
    descriptorBuckets: descriptorList,
    limits: [
      'This correlates 2K20 bridge normalization families with 2K25 descriptor metadata only.',
      'Descriptor starts are not treated as direct payload offsets or decoded transform channels.',
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
  };
  if (!Number.isInteger(args.record) || args.record < 0) throw new Error('target-record must be a non-negative integer');
  if (!Number.isInteger(args.section) || args.section < 0) throw new Error('source-section must be a non-negative integer');
  return args;
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(correlate(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 to 2K25 family correlation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { correlate, transformKey };
