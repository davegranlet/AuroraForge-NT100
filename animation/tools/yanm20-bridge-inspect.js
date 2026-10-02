'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');

function hex32(value) {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

function readS16TripletBE(buffer, offset) {
  return [
    buffer.readInt16BE(offset),
    buffer.readInt16BE(offset + 2),
    buffer.readInt16BE(offset + 4),
  ];
}

function norm16Delta(a, b) {
  let delta = a - b;
  if (delta > 32767) delta -= 65536;
  if (delta < -32768) delta += 65536;
  return delta;
}

function readStream(buffer, base, relOffset, count, limit = count) {
  let frame = 0;
  const rows = [];
  const byFrame = new Map();
  const start = base + relOffset;
  for (let i = 0; i < count; i++) {
    const offset = start + i * 8;
    const delta = buffer.readUInt16BE(offset + 6);
    frame += delta;
    const row = {
      i,
      frame,
      delta,
      packed: readS16TripletBE(buffer, offset),
    };
    if (i < limit) rows.push(row);
    byFrame.set(frame, row);
  }
  return { start, count, rows, byFrame };
}

function compareRows(name, sourceRows, targetStream, tolerance = 128) {
  let exact = 0;
  let withinTolerance = 0;
  let missingFrames = 0;
  const firstNonExact = [];
  const meanAbs = [0, 0, 0];
  let sharedFrames = 0;

  for (const source of sourceRows) {
    const target = targetStream.byFrame.get(source.frame);
    if (!target) {
      missingFrames++;
      continue;
    }
    sharedFrames++;
    const deltas = target.packed.map((value, index) => norm16Delta(value, source.packed[index]));
    const maxAbs = Math.max(...deltas.map(Math.abs));
    if (maxAbs === 0) exact++;
    if (maxAbs <= tolerance) withinTolerance++;
    for (let i = 0; i < 3; i++) meanAbs[i] += Math.abs(deltas[i]);
    if (maxAbs !== 0 && firstNonExact.length < 8) {
      firstNonExact.push({
        frame: source.frame,
        source: source.packed,
        target: target.packed,
        normalizedDelta: deltas,
      });
    }
  }

  return {
    name,
    sourceKeys: sourceRows.length,
    sharedFrames,
    missingFrames,
    exact,
    withinTolerance,
    exactRate: sharedFrames ? Number((exact / sharedFrames).toFixed(4)) : 0,
    toleranceRate: sharedFrames ? Number((withinTolerance / sharedFrames).toFixed(4)) : 0,
    meanAbsNormalizedDelta: meanAbs.map(value => sharedFrames ? Number((value / sharedFrames).toFixed(2)) : 0),
    firstNonExact,
  };
}

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-bridge-inspect.js <2k19-decoded-bin> <2k20-decoded-acts-bin> [options]',
    '',
    'Options:',
    '  --section <n>      2K19 section index, default 0',
    '  --track <n>        2K19 track index, default 1 for J_Hips in Victory 6100',
    '  --yanm <offset>    2K20 embedded YANM offset, default 37212',
    '  --record <offset>  2K20 record offset, default 37268',
    '  --sample <n>       sample rows to include per stream, default 12',
    '  --tolerance <n>    normalized 16-bit tolerance, default 128',
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.length < 2) throw new Error(usage());
  const args = {
    source19: argv[0],
    acts20: argv[1],
    section: 0,
    track: 1,
    yanm: 37212,
    record: 37268,
    sample: 12,
    tolerance: 128,
  };
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${key}`);
    if (key === '--section') args.section = Number(value);
    else if (key === '--track') args.track = Number(value);
    else if (key === '--yanm') args.yanm = Number(value);
    else if (key === '--record') args.record = Number(value);
    else if (key === '--sample') args.sample = Number(value);
    else if (key === '--tolerance') args.tolerance = Number(value);
    else throw new Error(`Unknown option ${key}\n${usage()}`);
  }
  return args;
}

function inspect(args) {
  const source19 = exportIr(args.source19, args.section, args.track).sections[0].tracks[0];
  const acts20 = fs.readFileSync(path.resolve(args.acts20));
  const base20 = args.yanm + 8;
  const record = {
    offset: args.record,
    type: `0x${acts20.readUInt16BE(args.record).toString(16).toUpperCase().padStart(4, '0')}`,
    headerSize: acts20.readUInt16BE(args.record + 2),
    hash32: hex32(acts20.readUInt32BE(args.record + 4)),
    streamA: {
      relOffset: acts20.readUInt32BE(args.record + 8),
      count: acts20.readUInt32BE(args.record + 12),
    },
    streamB: {
      relOffset: acts20.readUInt32BE(args.record + 16),
      count: acts20.readUInt32BE(args.record + 20),
    },
    floats: [
      acts20.readFloatBE(args.record + 24),
      acts20.readFloatBE(args.record + 28),
      acts20.readFloatBE(args.record + 32),
      acts20.readFloatBE(args.record + 36),
    ],
  };

  const streamA = readStream(acts20, base20, record.streamA.relOffset, record.streamA.count, args.sample);
  const streamB = readStream(acts20, base20, record.streamB.relOffset, record.streamB.count, args.sample);
  const primary = source19.timelines.find(timeline => timeline.name === 'primary');
  const secondary = source19.timelines.find(timeline => timeline.name === 'secondary');
  const primaryTriples = [
    ['primary.firstTriple', 0, 3],
    ['primary.middleTriple', 3, 6],
    ['primary.lastTriple', 6, 9],
  ].filter(([, start]) => (primary.keys[0]?.packed?.length ?? 0) > start)
    .map(([name, start, end]) => ({
      name,
      rows: primary.keys.map(key => ({
        frame: key.frame,
        delta: key.delta,
        packed: key.packed.slice(start, end),
      })),
    }));
  const secondaryTriples = secondary ? [
    ['secondary.firstTriple', 0, 3],
    ['secondary.middleTriple', 3, 6],
    ['secondary.lastTriple', 6, 9],
  ].filter(([, start]) => (secondary.keys[0]?.packed?.length ?? 0) > start)
    .map(([name, start, end]) => ({
    name,
    rows: secondary.keys.map(key => ({
      frame: key.frame,
      delta: key.delta,
      packed: key.packed.slice(start, end),
    })),
  })) : [];

  return {
    schema: 'aurora-forge-yanm20-bridge-inspect/v1',
    status: 'Research',
    source19: {
      file: path.basename(args.source19),
      section: args.section,
      track: args.track,
      type: source19.type,
      hash32: source19.hash32,
      quantizationCandidates: source19.quantizationCandidates,
      timelines: source19.timelines.map(timeline => ({
        name: timeline.name,
        stride: timeline.stride,
        keys: timeline.keys.length,
        totalFrames: timeline.totalFrames,
        packedWordsPerKey: timeline.keys[0]?.packed?.length ?? null,
      })),
    },
    target20: {
      file: path.basename(args.acts20),
      yanmOffset: args.yanm,
      baseOffset: base20,
      record,
      streamSamples: {
        A: streamA.rows,
        B: streamB.rows,
      },
    },
    comparisons: [
      ...primaryTriples.map(item => compareRows(`20A_vs_19_${item.name}`, item.rows, streamA, args.tolerance)),
      ...secondaryTriples.map(item => compareRows(`20A_vs_19_${item.name}`, item.rows, streamA, args.tolerance)),
      ...primaryTriples.map(item => compareRows(`20B_vs_19_${item.name}`, item.rows, streamB, args.tolerance)),
      ...secondaryTriples.map(item => compareRows(`20B_vs_19_${item.name}`, item.rows, streamB, args.tolerance)),
    ],
    interpretation: [
      'High exact/tolerance rates indicate same semantic stream with denser sampling or signed-domain normalization.',
      'Large +/-32768 normalized deltas near quaternion/vector sign boundaries should not be treated as immediate semantic failure.',
    ],
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(inspect(args), null, 2)}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { inspect, readStream, compareRows, norm16Delta };
