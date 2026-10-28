'use strict';
// Diffs two WWE 2K25 EntranceListData.jsfb ("Entr") buffers by section and id.
// Returns per-section counts plus records that exist in fresh but not base.
const fs = require('fs');
const { locateEntranceVectors } = require('./locate-entrance-vectors');

function diffEntranceEntries(baseBuffer, freshBuffer) {
  const base = locateEntranceVectors(baseBuffer);
  const fresh = locateEntranceVectors(freshBuffer);
  return fresh.map((records, section) => {
    const baseIds = new Set(base[section].map((record) => record.id));
    return {
      section,
      baseCount: base[section].length,
      freshCount: records.length,
      newRecords: records.filter((record) => !baseIds.has(record.id)),
    };
  });
}

module.exports = { diffEntranceEntries };

if (require.main === module) {
  const [baseFile, freshFile] = process.argv.slice(2);
  if (!baseFile || !freshFile) {
    console.error('Usage: node diff-2k25-entrance-entries.js <base.Entr.jsfb> <fresh.Entr.jsfb>');
    process.exit(2);
  }
  console.log(JSON.stringify(
    diffEntranceEntries(fs.readFileSync(baseFile), fs.readFileSync(freshFile)),
    (key, value) => (typeof value === 'bigint' ? value.toString() : value),
    2,
  ));
}
