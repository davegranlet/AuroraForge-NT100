'use strict';
// Finds an entrance-list record by entry id across the nine section vectors
// of a WWE 2K25 EntranceListData.jsfb ("Entr") buffer.
// Returns { section, index, record } or null. Record fields mirror
// append_2k25_entrance_entry.js: { id, nameString, type, hideId, field4..9 }.
const fs = require('fs');
const { locateEntranceVectors } = require('./locate-entrance-vectors');

function findEntranceEntry(buffer, entryId) {
  const sections = locateEntranceVectors(buffer);
  for (let section = 0; section < sections.length; section++) {
    const records = sections[section];
    for (let index = 0; index < records.length; index++) {
      if (records[index].id === entryId) return { section, index, record: records[index] };
    }
  }
  return null;
}

module.exports = { findEntranceEntry };

if (require.main === module) {
  const file = process.argv[2];
  const want = Number(process.argv[3]);
  if (!file || !Number.isSafeInteger(want)) {
    console.error('Usage: node find-2k25-entrance-entry.js <input.jsfb> <id>');
    process.exit(2);
  }
  const found = findEntranceEntry(fs.readFileSync(file), want);
  console.log(JSON.stringify(found, (key, value) => (typeof value === 'bigint' ? value.toString() : value)));
}
