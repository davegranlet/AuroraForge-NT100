'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseFile } = require('./clips-layout');
const { decodeAllUleb } = require('./score-group90-op0');

function mapReferences(trackDescriptors, tokenCount, context = 4) {
  const refs = new Map();
  trackDescriptors.forEach((descriptors, trackIndex) => descriptors.forEach((startToken, slot) => {
    if (!startToken) return;
    if (!Number.isInteger(startToken) || startToken < 0 || startToken >= tokenCount) throw new Error(`descriptor token index ${startToken} is outside Group90 token stream`);
    const item = refs.get(startToken) ?? { startToken, references: [] };
    item.references.push({ trackIndex, slot }); refs.set(startToken, item);
  }));
  return [...refs.values()].sort((a, b) => a.startToken - b.startToken).map(item => ({ ...item, context }));
}

function inspect(clipsPath, recordIndex, context = 4) {
  const file = fs.readFileSync(clipsPath); const parsed = parseFile(clipsPath); const record = parsed.records[recordIndex];
  if (!record) throw new Error(`record ${recordIndex} not found`);
  const group = record.sections.find(item => item.name === 'group90');
  const descriptorsPerTrack = record.raw.group78.length / record.trackIdentifiers.length;
  if (!Number.isInteger(descriptorsPerTrack)) throw new Error('descriptor count does not divide by track count');
  const descriptors = record.trackIdentifiers.map((_, track) => record.raw.group78.slice(track * descriptorsPerTrack, (track + 1) * descriptorsPerTrack).map(entry => entry.candidate.u32le[0]));
  const base = record.offset + Number.parseInt(group.relativeOffset);
  const tokens = decodeAllUleb(file.subarray(base, base + group.bytes)).tokens;
  const starts = mapReferences(descriptors, tokens.length, context);
  return {
    schema: 'aurora-forge-group90-token-index-map/v1', status: 'Research',
    target: { file: path.basename(clipsPath), record: recordIndex, tokens: tokens.length, tracks: record.trackIdentifiers.length, descriptorsPerTrack },
    summary: { referencedDescriptorFields: starts.reduce((sum, item) => sum + item.references.length, 0), distinctTokenIndexes: starts.length },
    starts: starts.map(item => ({ ...item, tokens: tokens.slice(Math.max(0, item.startToken - context), item.startToken + context + 1).map((token, offset) => ({ index: Math.max(0, item.startToken - context) + offset, value: token.value.toString(), bytes: token.bytes })) })),
  };
}

if (require.main === module) {
  try {
    if (!process.argv[2] || process.argv[3] === undefined) throw new Error('Usage: node tools/group90-token-index-map.js <target.clips> <record> [context]');
    process.stdout.write(`${JSON.stringify(inspect(process.argv[2], Number(process.argv[3]), process.argv[4] === undefined ? 4 : Number(process.argv[4])), null, 2)}\n`);
  } catch (error) { console.error(`Group90 token-index mapping failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { mapReferences, inspect };
