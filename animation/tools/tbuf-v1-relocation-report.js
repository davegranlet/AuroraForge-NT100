'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { findTbufBlocks } = require('./amym-tbuf-report');
const { inspectRelocations } = require('./tbuf-v1-relocations');

function report(directory) {
  const result = {
    status: 'Research', files: 0, blocks: 0, passed: 0, failed: [], widths: {}, counts: {},
    candidateFields: { totalSixRelocationBlocks: 0, at48Word4Listed: 0, at60Word2Listed: 0 },
    limits: ['Relocation count is not animation channel count.',
      'Unlisted candidate pointers are not confirmed by the native relocation loop.'],
  };
  for (const file of fs.readdirSync(directory).filter(file => file.toLowerCase().endsWith('.acts')).sort()) {
    result.files += 1;
    const buffer = fs.readFileSync(path.join(directory, file));
    for (const block of findTbufBlocks(buffer)) {
      result.blocks += 1;
      try {
        const parsed = inspectRelocations(buffer, block.offset, block.nextOffset);
        result.passed += 1;
        result.widths[parsed.entryWidth] = (result.widths[parsed.entryWidth] || 0) + 1;
        result.counts[parsed.relocationCount] = (result.counts[parsed.relocationCount] || 0) + 1;
        if (parsed.relocationCount === 6 && block.offset + 88 <= parsed.tableOffset) {
          result.candidateFields.totalSixRelocationBlocks += 1;
          const payload = block.offset + 24;
          const a = payload + buffer.readUInt32LE(payload + 48) + 16;
          const b = payload + buffer.readUInt32LE(payload + 60) + 8;
          if (parsed.entries.some(entry => entry.fieldOffset === a)) result.candidateFields.at48Word4Listed += 1;
          if (parsed.entries.some(entry => entry.fieldOffset === b)) result.candidateFields.at60Word2Listed += 1;
        }
      } catch (error) {
        result.failed.push({ file, offset: block.offset, error: error.message });
      }
    }
  }
  return result;
}

if (require.main === module) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node tools/tbuf-v1-relocation-report.js <Victory directory>');
    const result = report(path.resolve(process.argv[2]));
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.failed.length) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { report };
