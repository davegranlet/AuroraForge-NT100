'use strict';

// Bounded reporter for two individual modern .clip records created by one
// controlled editor operation. It intentionally reports structural evidence
// only; it does not assign motion semantics to Group78 or Group90 values.
const fs = require('node:fs');
const { build, parse } = require('./clips-layout');

function readIndividual(file) {
  const payload = fs.readFileSync(file);
  const [record] = parse(build([payload])).records;
  return { payload, record };
}

function changedEntries(before, after) {
  if (before.length !== after.length) return null;
  let count = 0;
  for (let index = 0; index < before.length; index++) {
    if (before[index].hex !== after[index].hex) count++;
  }
  return count;
}

function compareControlPair(originalFile, editedFile) {
  if (typeof originalFile !== 'string' || typeof editedFile !== 'string') throw new Error('two file paths are required');
  const original = readIndividual(originalFile);
  const edited = readIndividual(editedFile);
  const original78 = original.record.sections.find(section => section.name === 'group78 descriptors');
  const edited78 = edited.record.sections.find(section => section.name === 'group78 descriptors');
  const original90 = original.record.sections.find(section => section.name === 'group90');
  const edited90 = edited.record.sections.find(section => section.name === 'group90');
  return {
    schema: 'aurora-forge-controlled-clip-pair/v1',
    original: { file: originalFile, bytes: original.payload.length, sha256: original.record.sha256 },
    edited: { file: editedFile, bytes: edited.payload.length, sha256: edited.record.sha256 },
    identity: {
      sameId: original.record.id === edited.record.id,
      originalId: original.record.id,
      editedId: edited.record.id,
      sameTrackIdentifiers: JSON.stringify(original.record.trackIdentifiers) === JSON.stringify(edited.record.trackIdentifiers),
      trackCount: original.record.trackIdentifiers.length,
      fps: [original.record.fps, edited.record.fps],
      frameValue: [original.record.frameValue, edited.record.frameValue],
    },
    group78: {
      counts: [original78.count, edited78.count],
      hashes: [original78.sha256, edited78.sha256],
      changedEntries: changedEntries(original.record.raw.group78, edited.record.raw.group78),
    },
    group90: {
      counts: [original90.count, edited90.count],
      hashes: [original90.sha256, edited90.sha256],
      changedEntries: changedEntries(original.record.raw.group90, edited.record.raw.group90),
    },
  };
}

if (require.main === module) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node tools/clip-control-pair.js <original.clip> <edited.clip>');
    console.log(JSON.stringify(compareControlPair(process.argv[2], process.argv[3]), null, 2));
  } catch (error) {
    console.error(`Controlled clip-pair analysis failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { compareControlPair };
