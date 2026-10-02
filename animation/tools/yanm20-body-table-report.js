'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');

const DEFAULT_YANM20_OFFSET = 37212;
const DEFAULT_RECORD_TABLE_OFFSET = 37228;
const DEFAULT_RECORD_COUNT = 62;
const COMMON_AUXILIARY_COUNT = 19;

function hex32(value) {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

function range(buffer, offset, bytes) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(bytes) ||
      offset < 0 || bytes < 0 || offset + bytes > buffer.length) {
    throw new Error('YANM20 span exceeds file bounds');
  }
}

function parseRecord(buffer, offset) {
  range(buffer, offset, 40);
  return {
    offset,
    type: `0x${buffer.readUInt16BE(offset).toString(16).toUpperCase().padStart(4, '0')}`,
    headerSize: buffer.readUInt16BE(offset + 2),
    hash32: hex32(buffer.readUInt32BE(offset + 4)),
    streamA: {
      relOffset: buffer.readUInt32BE(offset + 8),
      count: buffer.readUInt32BE(offset + 12),
    },
    streamB: {
      relOffset: buffer.readUInt32BE(offset + 16),
      count: buffer.readUInt32BE(offset + 20),
    },
    floats: Array.from({ length: 4 }, (_, i) => buffer.readFloatBE(offset + 24 + i * 4)),
  };
}

function summarizeTrack(track) {
  return {
    index: track.index,
    type: track.type,
    hash32: track.hash32,
    frameCount: track.frameCount,
    timelineMatches: track.timelineMatches,
    timelines: track.timelines.map(timeline => ({
      name: timeline.name,
      stride: timeline.stride,
      keys: timeline.keys.length,
      totalFrames: timeline.totalFrames,
      packedWordsPerKey: timeline.keys[0]?.packed?.length ?? null,
    })),
  };
}

function buildReport(args) {
  const sourceIr = exportIr(args.source19, args.section, null);
  const section = sourceIr.sections[0];
  if (!section) throw new Error(`2K19 section ${args.section} was not found`);
  if (section.tracks.length < args.count) {
    throw new Error(`2K19 section has ${section.tracks.length} tracks; expected at least ${args.count}`);
  }

  const acts20 = fs.readFileSync(path.resolve(args.acts20));
  range(acts20, args.yanm, 16);
  if (acts20.toString('ascii', args.yanm, args.yanm + 4) !== 'YANM') {
    throw new Error(`No YANM marker at 2K20 offset ${args.yanm}`);
  }
  const declaredSize = acts20.readUInt32BE(args.yanm + 4);
  const declaredCount = acts20.readUInt16BE(args.yanm + 10);
  range(acts20, args.yanm, 8 + declaredSize);
  range(acts20, args.table, args.count * 40);

  const records = [];
  let hashMatches = 0;
  let typeMatches = 0;
  let headerMatches = 0;
  let commonAuxiliaryB = 0;
  const mismatches = [];

  for (let index = 0; index < args.count; index++) {
    const source = section.tracks[index];
    const record = parseRecord(acts20, args.table + index * 40);
    const hashMatchesSource = record.hash32 === source.hash32;
    const is2100 = record.type === '0x2100';
    const has40ByteHeader = record.headerSize === 40;
    const streamBRole = record.streamB.count === COMMON_AUXILIARY_COUNT
      ? 'common-19-key-auxiliary'
      : 'special-or-motion-bearing';

    if (hashMatchesSource) hashMatches++;
    if (is2100) typeMatches++;
    if (has40ByteHeader) headerMatches++;
    if (streamBRole === 'common-19-key-auxiliary') commonAuxiliaryB++;
    if (!hashMatchesSource || !is2100 || !has40ByteHeader) {
      mismatches.push({
        index,
        sourceHash32: source.hash32,
        recordHash32: record.hash32,
        recordType: record.type,
        headerSize: record.headerSize,
      });
    }

    records.push({
      index,
      source: summarizeTrack(source),
      target20: {
        ...record,
        hashMatchesSource,
        streamBRole,
      },
    });
  }

  return {
    schema: 'aurora-forge-yanm20-body-table-report/v1',
    status: 'Research',
    source19: {
      file: path.basename(args.source19),
      section: args.section,
      tracks: section.tracks.length,
    },
    target20: {
      file: path.basename(args.acts20),
      yanmOffset: args.yanm,
      recordTableOffset: args.table,
      declaredSize,
      declaredCount,
      reportedRecords: args.count,
    },
    summary: {
      hashMatches,
      type2100: typeMatches,
      headerSize40: headerMatches,
      commonAuxiliaryStreamB: commonAuxiliaryB,
      specialStreamB: args.count - commonAuxiliaryB,
      mismatches,
    },
    records,
    interpretation: [
      'Hash/order matches confirm the corrected 2K20 body table is the direct bridge for the 2K19 body section.',
      'Stream A is the primary motion candidate; stream B is common auxiliary when count is 19 and should be handled specially otherwise.',
      'This report is metadata only and does not contain proprietary animation payload bytes.',
    ],
  };
}

function usage() {
  return [
    'Usage:',
    '  node tools/yanm20-body-table-report.js <2k19-decoded-bin> <2k20-decoded-acts-bin> [options]',
    '',
    'Options:',
    '  --section <n>  2K19 section index, default 0',
    '  --yanm <n>     2K20 embedded YANM offset, default 37212',
    '  --table <n>    2K20 record table offset, default 37228',
    '  --count <n>    body records to report, default 62',
    '  --compact      omit per-record details and print summary only',
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.length < 2) throw new Error(usage());
  const args = {
    source19: argv[0],
    acts20: argv[1],
    section: 0,
    yanm: DEFAULT_YANM20_OFFSET,
    table: DEFAULT_RECORD_TABLE_OFFSET,
    count: DEFAULT_RECORD_COUNT,
    compact: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--compact') {
      args.compact = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) throw new Error(`Missing value for ${key}`);
    if (key === '--section') args.section = Number(value);
    else if (key === '--yanm') args.yanm = Number(value);
    else if (key === '--table') args.table = Number(value);
    else if (key === '--count') args.count = Number(value);
    else throw new Error(`Unknown option ${key}\n${usage()}`);
  }
  for (const key of ['section', 'yanm', 'table', 'count']) {
    if (!Number.isInteger(args[key]) || args[key] < 0) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }
  if (args.count < 1 || args.count > 4096) throw new Error('count must be between 1 and 4096');
  return args;
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const report = buildReport(args);
    if (args.compact) delete report.records;
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 body table report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildReport, parseRecord };
