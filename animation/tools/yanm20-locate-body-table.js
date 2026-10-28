'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { exportIr } = require('./export-yanm-ir');

function scanBlocks(buffer) {
  const marker = Buffer.from('YANM');
  const blocks = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf(marker, cursor)) !== -1) {
    if (cursor + 16 <= buffer.length) {
      const size = buffer.readUInt32BE(cursor + 4);
      const count = buffer.readUInt16BE(cursor + 10);
      blocks.push({ offset: cursor, size, count, tableOffset: cursor + 16, declaredEnd: cursor + size });
    }
    cursor += marker.length;
  }
  return blocks;
}

function readHashes(buffer, block) {
  const records = Math.max(0, block.count - 1);
  const hashes = [];
  for (let index = 0; index < records; index += 1) {
    const offset = block.tableOffset + index * 40;
    if (offset + 40 > buffer.length) break;
    hashes.push({
      index,
      offset,
      type: `0x${buffer.readUInt16BE(offset).toString(16).toUpperCase().padStart(4, '0')}`,
      headerSize: buffer.readUInt16BE(offset + 2),
      hash32: `0x${buffer.readUInt32BE(offset + 4).toString(16).toUpperCase().padStart(8, '0')}`,
    });
  }
  return hashes;
}

function commonPrefix(left, right) {
  let count = 0;
  while (count < left.length && count < right.length && left[count] === right[count]) count += 1;
  return count;
}

function canonicalHash(value) {
  return String(value).replace(/^0x/i, '').toUpperCase();
}

function locate(actsPath, sourcePath, sectionIndex = 0) {
  const source = exportIr(sourcePath, sectionIndex).sections[0];
  if (!source) throw new Error(`source section ${sectionIndex} not found`);
  const sourceHashes = source.tracks.map(track => canonicalHash(track.hash32));
  const buffer = fs.readFileSync(path.resolve(actsPath));
  const candidates = scanBlocks(buffer).map(block => {
    const records = readHashes(buffer, block);
    const hashes = records.map(record => canonicalHash(record.hash32));
    const prefixMatches = commonPrefix(hashes, sourceHashes);
    const exactHashOrder = hashes.length === sourceHashes.length && prefixMatches === sourceHashes.length;
    return {
      ...block,
      recordsRead: records.length,
      firstType: records[0]?.type ?? null,
      firstHeaderSize: records[0]?.headerSize ?? null,
      prefixMatches,
      exactHashOrder,
      firstHashes: hashes.slice(0, 8),
    };
  }).sort((a, b) => b.prefixMatches - a.prefixMatches || b.recordsRead - a.recordsRead || a.offset - b.offset);
  return {
    schema: 'aurora-forge-yanm20-body-table-location/v1',
    status: 'Research',
    source: { file: path.basename(sourcePath), section: sectionIndex, tracks: sourceHashes.length },
    acts20: { file: path.basename(actsPath), bytes: buffer.length, yanmBlocks: candidates.length },
    bestCandidate: candidates[0] ?? null,
    candidates,
    limits: ['Hash/order matching locates a structurally corresponding 2K20 track table; it does not decode the individual motion streams.'],
  };
}

if (require.main === module) {
  try {
    if (process.argv.length < 4) throw new Error('Usage: node tools/yanm20-locate-body-table.js <2k20.acts> <2k19-decoded-bin> [source-section]');
    const section = process.argv[4] === undefined ? 0 : Number(process.argv[4]);
    if (!Number.isInteger(section) || section < 0) throw new Error('source-section must be a non-negative integer');
    process.stdout.write(`${JSON.stringify(locate(process.argv[2], process.argv[3], section), null, 2)}\n`);
  } catch (error) {
    console.error(`YANM20 body-table location failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { canonicalHash, commonPrefix, readHashes, scanBlocks };
