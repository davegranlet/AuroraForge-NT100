'use strict';

const fs = require('node:fs');
const { parseFile } = require('./clips-layout');
const { ranges } = require('./group90-descriptor-ranges');
const { decodeAt } = require('./group90-uleb');

function summarizeBytes(buffer, start, end) {
  let cursor = start; let tokens = 0; let oneByte = 0; let small = 0; let zero = 0; let largest = 0n;
  while (cursor < end) {
    const token = decodeAt(buffer, cursor);
    if (cursor + token.bytes > end) throw new Error('ULEB token crosses descriptor range boundary');
    tokens++; if (token.bytes === 1) oneByte++; if (token.value <= 255n) small++; if (token.value === 0n) zero++; if (token.value > largest) largest = token.value;
    cursor += token.bytes;
  }
  return { bytes: end - start, tokens, oneByteTokens: oneByte, smallTokens: small, zeroTokens: zero, largestToken: largest.toString() };
}

function inspect(clipsPath, recordIndex) {
  const file = fs.readFileSync(clipsPath); const parsed = parseFile(clipsPath); const record = parsed.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const group = record.sections.find(item => item.name === 'group90');
  const descriptorsPerTrack = record.raw.group78.length / record.trackIdentifiers.length;
  const descriptors = record.trackIdentifiers.map((_, track) => record.raw.group78.slice(track * descriptorsPerTrack, (track + 1) * descriptorsPerTrack).map(entry => entry.candidate.u32le[0]));
  const base = record.offset + Number.parseInt(group.relativeOffset);
  return ranges(descriptors, record.raw.group90.length).map(range => {
    try {
      return { ...range, tokenAligned: true, summary: summarizeBytes(file, base + range.start * 8, base + range.endExclusive * 8) };
    } catch (error) {
      return { ...range, tokenAligned: false, error: error.message };
    }
  });
}

if (require.main === module) {
  try {
    if (!process.argv[2] || process.argv[3] === undefined) throw new Error('Usage: node tools/group90-segment-summary.js <target.clips> <record>');
    const result = inspect(process.argv[2], Number(process.argv[3]));
    const aligned = result.filter(item => item.tokenAligned);
    process.stdout.write(`${JSON.stringify({ target: { record: Number(process.argv[3]) }, summary: { ranges: result.length, tokenAlignedRanges: aligned.length, crossingRanges: result.length - aligned.length, totalTokens: aligned.reduce((sum, item) => sum + item.summary.tokens, 0) }, ranges: result }, null, 2)}\n`);
  } catch (error) { console.error(`Group90 segment summary failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { inspect, summarizeBytes };
