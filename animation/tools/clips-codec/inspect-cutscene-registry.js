'use strict';

const fs = require('fs');
const { locateCutsceneVector } = require('./locate-cutscene-vector');
const { findCutsceneEntry } = require('./find-cutscene-entry');

function inspectCutsceneEntry(buffer, id) {
  const entry = findCutsceneEntry(buffer, id);
  if (!entry) return null;
  const vtable = entry.table - buffer.readInt32LE(entry.table);
  const vtableBytes = buffer.readUInt16LE(vtable);
  const tableBytes = buffer.readUInt16LE(vtable + 2);
  const words = [];
  for (let offset = 0; offset < tableBytes; offset += 4) {
    words.push(buffer.readUInt32LE(entry.table + offset));
  }
  return { id, table: entry.table, vtable, vtableBytes, tableBytes, words };
}

function cutsceneTableDistribution(buffer) {
  const { count, slotsOffset } = locateCutsceneVector(buffer);
  const dist = {};
  for (let index = 0; index < count; index++) {
    const slot = slotsOffset + 4 * index;
    const table = slot + buffer.readUInt32LE(slot);
    const vtable = table - buffer.readInt32LE(table);
    const key = `${buffer.readUInt16LE(vtable)}/${buffer.readUInt16LE(vtable + 2)}${vtable > 0 && vtable < buffer.length ? '' : '!'}`;
    dist[key] = (dist[key] || 0) + 1;
  }
  return { count, dist };
}

module.exports = { inspectCutsceneEntry, cutsceneTableDistribution };

if (require.main === module) {
  const [file, command, ...ids] = process.argv.slice(2);
  if (!file || !command || !['entry', 'dist'].includes(command)) {
    console.error('Usage: node inspect-cutscene-registry.js <CutsceneNoRegistry.jsfb> <entry|dist> [id ...]');
    process.exit(2);
  }
  const buffer = fs.readFileSync(file);
  const result = command === 'dist'
    ? cutsceneTableDistribution(buffer)
    : ids.map((id) => inspectCutsceneEntry(buffer, Number(id)));
  console.log(JSON.stringify(result, null, 2));
}
