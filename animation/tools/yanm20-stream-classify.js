'use strict';

const { buildReport } = require('./yanm20-body-table-report');
const { inspect } = require('./yanm20-bridge-inspect');

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-stream-classify.js <2k19-decoded-bin> <2k20-decoded-acts-bin> [options]',
    '',
    'Options:',
    '  --section <n>    2K19 section index, default 0',
    '  --yanm <n>       2K20 embedded YANM offset, default 37212',
    '  --table <n>      2K20 record table offset, default 37228',
    '  --count <n>      body records to classify, default 62',
    '  --sample <n>     sample rows to include inside comparison details, default 0',
    '  --tolerance <n>  normalized 16-bit tolerance, default 128',
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.length < 2) throw new Error(usage());
  const args = {
    source19: argv[0],
    acts20: argv[1],
    section: 0,
    yanm: 37212,
    table: 37228,
    count: 62,
    sample: 0,
    tolerance: 128,
  };
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${key}`);
    if (key === '--section') args.section = Number(value);
    else if (key === '--yanm') args.yanm = Number(value);
    else if (key === '--table') args.table = Number(value);
    else if (key === '--count') args.count = Number(value);
    else if (key === '--sample') args.sample = Number(value);
    else if (key === '--tolerance') args.tolerance = Number(value);
    else throw new Error(`Unknown option ${key}\n${usage()}`);
  }
  for (const key of ['section', 'yanm', 'table', 'count', 'sample', 'tolerance']) {
    if (!Number.isInteger(args[key]) || args[key] < 0) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }
  if (args.count < 1 || args.count > 4096) throw new Error('count must be between 1 and 4096');
  return args;
}

function scoreComparison(comparison) {
  const coverage = comparison.sourceKeys ? comparison.sharedFrames / comparison.sourceKeys : 0;
  return Number((comparison.toleranceRate * coverage).toFixed(6));
}

function compactComparison(comparison) {
  return {
    name: comparison.name,
    sourceKeys: comparison.sourceKeys,
    sharedFrames: comparison.sharedFrames,
    missingFrames: comparison.missingFrames,
    exact: comparison.exact,
    withinTolerance: comparison.withinTolerance,
    exactRate: comparison.exactRate,
    toleranceRate: comparison.toleranceRate,
    coverageScore: scoreComparison(comparison),
    meanAbsNormalizedDelta: comparison.meanAbsNormalizedDelta,
  };
}

function classify(args) {
  const table = buildReport(args);
  const tracks = table.records.map((record) => {
    const inspected = inspect({
      source19: args.source19,
      acts20: args.acts20,
      section: args.section,
      track: record.index,
      yanm: args.yanm,
      record: record.target20.offset,
      sample: args.sample,
      tolerance: args.tolerance,
    });
    const comparisons = inspected.comparisons.map(compactComparison);
    const bestA = comparisons
      .filter(item => item.name.startsWith('20A_'))
      .sort((a, b) => b.coverageScore - a.coverageScore || b.exactRate - a.exactRate)[0] ?? null;
    const bestB = comparisons
      .filter(item => item.name.startsWith('20B_'))
      .sort((a, b) => b.coverageScore - a.coverageScore || b.exactRate - a.exactRate)[0] ?? null;
    return {
      index: record.index,
      sourceType: record.source.type,
      hash32: record.source.hash32,
      sourceTimelines: record.source.timelines.map(timeline => ({
        name: timeline.name,
        keys: timeline.keys,
        stride: timeline.stride,
        packedWordsPerKey: timeline.packedWordsPerKey,
      })),
      streamA: record.target20.streamA,
      streamB: record.target20.streamB,
      streamBRole: record.target20.streamBRole,
      bestA,
      bestB,
      likelyPrimaryCarrier: bestA && (!bestB || bestA.coverageScore >= bestB.coverageScore)
        ? 'streamA'
        : 'streamB',
    };
  });
  const streamAWins = tracks.filter(track => track.likelyPrimaryCarrier === 'streamA').length;
  const streamBWins = tracks.filter(track => track.likelyPrimaryCarrier === 'streamB').length;
  const perfectA = tracks.filter(track => track.bestA?.coverageScore === 1).length;
  return {
    schema: 'aurora-forge-yanm20-stream-classification/v1',
    status: 'Research',
    source19: table.source19,
    target20: table.target20,
    summary: {
      records: tracks.length,
      hashMatches: table.summary.hashMatches,
      streamAWins,
      streamBWins,
      perfectStreamAMatches: perfectA,
      commonAuxiliaryStreamB: table.summary.commonAuxiliaryStreamB,
      specialStreamB: table.summary.specialStreamB,
      mismatches: table.summary.mismatches,
    },
    tracks,
    interpretation: [
      'Use coverageScore as toleranceRate multiplied by shared-frame coverage; it rewards both value agreement and timeline overlap.',
      'This is a stream classification aid, not final transform decoding.',
    ],
  };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(classify(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 stream classification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { classify, scoreComparison };
