'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');
const { parseRecord } = require('./yanm20-body-table-report');
const { readStream, norm16Delta } = require('./yanm20-bridge-inspect');

const PERMUTATIONS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-normalization-score.js <2k19-decoded-bin> <2k20-decoded-acts-bin> [options]',
    '',
    'Options:',
    '  --section <n>    2K19 section index, default 0',
    '  --track <n>      2K19 track index, default 7',
    '  --yanm <n>       2K20 embedded YANM offset, default 37212',
    '  --table <n>      2K20 record table offset, default 37228',
    '  --stream <A|B>   2K20 stream to score, default A',
    '  --top <n>        number of candidates to print, default 12',
    '  --tolerance <n>  normalized 16-bit tolerance, default 128',
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.length < 2) throw new Error(usage());
  const args = {
    source19: argv[0],
    acts20: argv[1],
    section: 0,
    track: 7,
    yanm: 37212,
    table: 37228,
    stream: 'A',
    top: 12,
    tolerance: 128,
  };
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${key}`);
    if (key === '--section') args.section = Number(value);
    else if (key === '--track') args.track = Number(value);
    else if (key === '--yanm') args.yanm = Number(value);
    else if (key === '--table') args.table = Number(value);
    else if (key === '--stream') args.stream = String(value).toUpperCase();
    else if (key === '--top') args.top = Number(value);
    else if (key === '--tolerance') args.tolerance = Number(value);
    else throw new Error(`Unknown option ${key}\n${usage()}`);
  }
  for (const key of ['section', 'track', 'yanm', 'table', 'top', 'tolerance']) {
    if (!Number.isInteger(args[key]) || args[key] < 0) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }
  if (!['A', 'B'].includes(args.stream)) throw new Error('stream must be A or B');
  return args;
}

function wrapS16(value) {
  const unsigned = value & 0xffff;
  return unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned;
}

function transformPacked(source, candidate) {
  return candidate.permutation.map((from, index) => {
    let value = source[from];
    if (candidate.signs[index] < 0) value = -value;
    value += candidate.offsets[index];
    return wrapS16(value);
  });
}

function scoreRows(sourceRows, targetStream, candidate, tolerance) {
  let sharedFrames = 0;
  let exact = 0;
  let withinTolerance = 0;
  const meanAbs = [0, 0, 0];
  const firstNonExact = [];

  for (const source of sourceRows) {
    const target = targetStream.byFrame.get(source.frame);
    if (!target) continue;
    sharedFrames++;
    const transformed = transformPacked(source.packed, candidate);
    const deltas = target.packed.map((value, index) => norm16Delta(value, transformed[index]));
    const maxAbs = Math.max(...deltas.map(Math.abs));
    if (maxAbs === 0) exact++;
    if (maxAbs <= tolerance) withinTolerance++;
    for (let i = 0; i < 3; i++) meanAbs[i] += Math.abs(deltas[i]);
    if (maxAbs !== 0 && firstNonExact.length < 5) {
      firstNonExact.push({ frame: source.frame, source: source.packed, transformed, target: target.packed, normalizedDelta: deltas });
    }
  }

  const coverage = sourceRows.length ? sharedFrames / sourceRows.length : 0;
  const toleranceRate = sharedFrames ? withinTolerance / sharedFrames : 0;
  return {
    sharedFrames,
    missingFrames: sourceRows.length - sharedFrames,
    exact,
    withinTolerance,
    exactRate: sharedFrames ? Number((exact / sharedFrames).toFixed(4)) : 0,
    toleranceRate: Number(toleranceRate.toFixed(4)),
    coverageScore: Number((coverage * toleranceRate).toFixed(6)),
    meanAbsNormalizedDelta: meanAbs.map(value => sharedFrames ? Number((value / sharedFrames).toFixed(2)) : 0),
    firstNonExact,
  };
}

function sourceTriples(track) {
  return track.timelines.flatMap((timeline) => {
    const words = timeline.keys[0]?.packed?.length ?? 0;
    const triples = [];
    for (let start = 0; start + 3 <= words; start += 3) {
      triples.push({
        name: `${timeline.name}.triple${start / 3}`,
        rows: timeline.keys.map(key => ({ frame: key.frame, packed: key.packed.slice(start, start + 3) })),
      });
    }
    return triples;
  });
}

function candidates() {
  const offsets = [0, 32768];
  const out = [];
  for (const permutation of PERMUTATIONS) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          for (const ox of offsets) {
            for (const oy of offsets) {
              for (const oz of offsets) {
                out.push({ permutation, signs: [sx, sy, sz], offsets: [ox, oy, oz] });
              }
            }
          }
        }
      }
    }
  }
  return out;
}

function score(args) {
  const source = exportIr(args.source19, args.section, args.track).sections[0].tracks[0];
  if (!source) throw new Error(`2K19 track ${args.track} was not found`);
  const acts20 = fs.readFileSync(path.resolve(args.acts20));
  const record = parseRecord(acts20, args.table + args.track * 40);
  if (record.hash32 !== source.hash32) {
    throw new Error(`2K20 record hash ${record.hash32} does not match 2K19 track hash ${source.hash32}`);
  }
  const selected = args.stream === 'A' ? record.streamA : record.streamB;
  const stream = readStream(acts20, args.yanm + 8, selected.relOffset, selected.count, 0);
  const results = [];
  for (const triple of sourceTriples(source)) {
    for (const candidate of candidates()) {
      results.push({
        sourceTriple: triple.name,
        stream: args.stream,
        permutation: candidate.permutation,
        signs: candidate.signs,
        offsets: candidate.offsets,
        ...scoreRows(triple.rows, stream, candidate, args.tolerance),
      });
    }
  }
  results.sort((a, b) => b.coverageScore - a.coverageScore || b.exactRate - a.exactRate);
  return {
    schema: 'aurora-forge-yanm20-normalization-score/v1',
    status: 'Research',
    source19: {
      file: path.basename(args.source19),
      section: args.section,
      track: args.track,
      type: source.type,
      hash32: source.hash32,
      timelines: source.timelines.map(timeline => ({
        name: timeline.name,
        keys: timeline.keys.length,
        stride: timeline.stride,
        packedWordsPerKey: timeline.keys[0]?.packed?.length ?? null,
      })),
    },
    target20: {
      file: path.basename(args.acts20),
      record,
      scoredStream: selected,
    },
    topCandidates: results.slice(0, args.top),
    interpretation: [
      'Offsets are added in signed 16-bit space; 32768 tests half-turn/sign-domain normalization.',
      'Permutation/sign candidates are exploratory channel-orientation tests, not final transform semantics.',
    ],
  };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(score(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 normalization score failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { score, wrapS16, transformPacked, scoreRows };
