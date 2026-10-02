'use strict';

const fs = require('node:fs');
const { buildReport } = require('./yanm20-body-table-report');
const { score } = require('./yanm20-normalization-score');

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-normalization-sweep.js <2k19-decoded-bin> <2k20-decoded-acts-bin> [options]',
    '',
    'Options:',
    '  --section <n>    2K19 section index, default 0',
    '  --yanm <n>       2K20 embedded YANM offset, default 37212',
    '  --table <n>      2K20 record table offset, default 37228',
    '  --count <n>      body records to sweep, default 62',
    '  --top <n>        candidates retained per track, default 3',
    '  --tolerance <n>  normalized 16-bit tolerance, default 128',
    '  --out <path>     write the JSON report to a new file as well as stdout',
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
    top: 3,
    tolerance: 128,
    out: null,
  };
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${key}`);
    if (key === '--section') args.section = Number(value);
    else if (key === '--yanm') args.yanm = Number(value);
    else if (key === '--table') args.table = Number(value);
    else if (key === '--count') args.count = Number(value);
    else if (key === '--top') args.top = Number(value);
    else if (key === '--tolerance') args.tolerance = Number(value);
    else if (key === '--out') args.out = value;
    else throw new Error(`Unknown option ${key}\n${usage()}`);
  }
  for (const key of ['section', 'yanm', 'table', 'count', 'top', 'tolerance']) {
    if (!Number.isInteger(args[key]) || args[key] < 0) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }
  if (args.count < 1 || args.count > 4096) throw new Error('count must be between 1 and 4096');
  if (args.top < 1 || args.top > 100) throw new Error('top must be between 1 and 100');
  return args;
}

function writeReport(report, output) {
  if (!output) return;
  if (fs.existsSync(output)) throw new Error(`refusing to overwrite existing output: ${output}`);
  fs.mkdirSync(require('node:path').dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function candidateKey(candidate) {
  return JSON.stringify({
    sourceTriple: candidate.sourceTriple,
    stream: candidate.stream,
    permutation: candidate.permutation,
    signs: candidate.signs,
    offsets: candidate.offsets,
  });
}

function sweep(args) {
  const table = buildReport(args);
  const tracks = table.records.map((record) => {
    const result = score({
      ...args,
      track: record.index,
      stream: record.target20.streamBRole === 'special-or-motion-bearing' ? 'B' : 'A',
      top: args.top,
    });
    const best = result.topCandidates[0];
    return {
      index: record.index,
      sourceType: record.source.type,
      hash32: record.source.hash32,
      streamBRole: record.target20.streamBRole,
      scoredStream: result.target20.scoredStream,
      best,
      topCandidates: result.topCandidates,
    };
  });

  const transformBuckets = new Map();
  for (const track of tracks) {
    const key = candidateKey(track.best);
    const bucket = transformBuckets.get(key) ?? {
      sourceTriple: track.best.sourceTriple,
      stream: track.best.stream,
      permutation: track.best.permutation,
      signs: track.best.signs,
      offsets: track.best.offsets,
      count: 0,
      indexes: [],
      averageCoverageScore: 0,
    };
    bucket.count++;
    bucket.indexes.push(track.index);
    bucket.averageCoverageScore += track.best.coverageScore;
    transformBuckets.set(key, bucket);
  }

  const transforms = [...transformBuckets.values()]
    .map(bucket => ({
      ...bucket,
      averageCoverageScore: Number((bucket.averageCoverageScore / bucket.count).toFixed(6)),
    }))
    .sort((a, b) => b.count - a.count || b.averageCoverageScore - a.averageCoverageScore);

  return {
    schema: 'aurora-forge-yanm20-normalization-sweep/v1',
    status: 'Research',
    source19: table.source19,
    target20: table.target20,
    summary: {
      records: tracks.length,
      transformFamilies: transforms.length,
      highConfidence: tracks.filter(track => track.best.coverageScore >= 0.8).length,
      mediumConfidence: tracks.filter(track => track.best.coverageScore >= 0.5 && track.best.coverageScore < 0.8).length,
      lowConfidence: tracks.filter(track => track.best.coverageScore < 0.5).length,
      dominantTransforms: transforms.slice(0, 8),
    },
    tracks,
    interpretation: [
      'This sweep scores simple signed 16-bit normalization candidates per track and groups repeated candidate transforms.',
      'It is intended to identify families worth deeper transform decoding, not to assign final channel semantics.',
    ],
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = sweep(args);
    writeReport(report, args.out);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 normalization sweep failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { sweep, candidateKey, writeReport };
