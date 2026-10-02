'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');

function decodeUleb128(buffer, start) {
  let value = 0n;
  let shift = 0n;
  let cursor = start;
  for (let index = 0; index < 5000 && cursor < buffer.length; index += 1) {
    const byte = buffer[cursor];
    cursor += 1;
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return { value, bytes: cursor - start };
    shift += 7n;
  }
  return null;
}

function decodeAllUleb(buffer) {
  const tokens = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const decoded = decodeUleb128(buffer, cursor);
    if (!decoded) break;
    tokens.push({ value: decoded.value, offset: cursor, bytes: decoded.bytes });
    cursor += decoded.bytes;
  }
  return { tokens, decodedBytes: cursor };
}

function parseHexOffset(value) {
  return Number.parseInt(String(value).replace(/^0x/i, ''), 16);
}

function group90Slice(clipsPath, record) {
  const section = record.sections.find(item => item.name === 'group90');
  if (!section) throw new Error('group90 section not found');
  const buffer = fs.readFileSync(clipsPath);
  const start = record.offset + parseHexOffset(section.relativeOffset);
  return buffer.subarray(start, start + section.bytes);
}

function histogram(values, limit = 12) {
  const counts = new Map();
  for (const value of values) {
    const key = value.toString();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function extractBits(value, offset, width) {
  return Number((value >> BigInt(offset)) & ((1n << BigInt(width)) - 1n));
}

function rankWindows(values, maxFrame) {
  const output = [];
  for (const width of [10, 11, 12, 13, 14, 15, 16]) {
    for (let offset = 0; offset <= 64 - width; offset += 1) {
      let inRange = 0;
      let nonZero = 0;
      let max = 0;
      for (const value of values) {
        const extracted = extractBits(value, offset, width);
        if (extracted <= maxFrame) inRange += 1;
        if (extracted !== 0) nonZero += 1;
        if (extracted > max) max = extracted;
      }
      output.push({
        offset,
        width,
        inRangeRatio: values.length ? inRange / values.length : 0,
        nonZeroRatio: values.length ? nonZero / values.length : 0,
        max,
      });
    }
  }
  return output
    .filter(item => item.nonZeroRatio > 0.1)
    .sort((a, b) => b.inRangeRatio - a.inRangeRatio || b.nonZeroRatio - a.nonZeroRatio || a.width - b.width || a.offset - b.offset)
    .slice(0, 12);
}

function fixedWidthRuns(tokens, opcode, paramCount) {
  const runs = [];
  for (let index = 0; index + paramCount < tokens.length; index += 1) {
    if (tokens[index] !== BigInt(opcode)) continue;
    runs.push({ tokenIndex: index, params: tokens.slice(index + 1, index + 1 + paramCount) });
  }
  return runs;
}

function largeFollowerRuns(tokens, opcode) {
  const runs = [];
  let index = 0;
  while (index < tokens.length) {
    if (tokens[index] !== BigInt(opcode)) {
      index += 1;
      continue;
    }
    const params = [];
    let cursor = index + 1;
    while (cursor < tokens.length && tokens[cursor] > 255n) {
      params.push(tokens[cursor]);
      cursor += 1;
    }
    runs.push({ tokenIndex: index, params });
    index = Math.max(cursor, index + 1);
  }
  return runs;
}

function summarizeRuns(name, runs, frameValue) {
  const byParam = Array.from({ length: Math.min(7, Math.max(0, ...runs.map(run => run.params.length))) }, (_, paramIndex) => {
    const values = runs.map(run => run.params[paramIndex]).filter(value => value !== undefined);
    return {
      paramIndex,
      low16Top: histogram(values.map(value => value & 0xffffn), 8),
      bestFrameWindows: rankWindows(values, frameValue).slice(0, 4),
    };
  });
  return {
    name,
    runs: runs.length,
    paramCounts: histogram(runs.map(run => BigInt(run.params.length)), 12),
    firstRuns: runs.slice(0, 3).map(run => ({ tokenIndex: run.tokenIndex, params: run.params.map(value => value.toString()) })),
    byParam,
  };
}

function score(clipsPath, recordIndex) {
  const target = parseFile(clipsPath, { includeRaw: false });
  const record = target.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const decoded = decodeAllUleb(group90Slice(clipsPath, record));
  const tokens = decoded.tokens.map(token => token.value);
  const largeFollower = largeFollowerRuns(tokens, 0);
  const sevenAny = fixedWidthRuns(tokens, 0, 7);
  const sevenAllLarge = sevenAny.filter(run => run.params.every(value => value > 255n));
  return {
    schema: 'aurora-forge-group90-op0-score/v1',
    status: 'Research',
    target: { file: path.basename(clipsPath), record: recordIndex, id: record.id, frameValue: record.frameValue, fps: record.fps },
    group90: { bytes: record.sections.find(item => item.name === 'group90').bytes, decodedBytes: decoded.decodedBytes, tokenCount: tokens.length },
    policies: [
      summarizeRuns('large-followers-until-next-small-token', largeFollower, record.frameValue),
      summarizeRuns('fixed-seven-following-tokens', sevenAny, record.frameValue),
      summarizeRuns('fixed-seven-following-tokens-all-large', sevenAllLarge, record.frameValue),
    ],
    limits: [
      'Opcode 0 grouping is candidate-level; body streams contain small values that may be parameters.',
      'The fixed-seven policy is useful for comparison with legacy notes, but it does not by itself prove command boundaries.',
    ],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/score-group90-op0.js <target.clips> <record>');
    process.stdout.write(`${JSON.stringify(score(path.resolve(process.argv[2]), Number(process.argv[3])), null, 2)}\n`);
  } catch (error) {
    console.error(`Group90 Opcode 0 scoring failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { score, decodeAllUleb };
