'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const baseline = path.join(__dirname, 'post-crash-analysis-20261023', 'left', 'Cutscene', 'CutsceneNoRegistry.jsfb');
const candidate = path.join(__dirname, 'post-crash-analysis-20261023', 'right', 'Cutscene', 'CutsceneNoRegistry.jsfb');
const find = require(path.join(root, 'animation', 'tools', 'clips-codec', 'find-cutscene-entry.js')).findCutsceneEntry;
const fnv1a32 = require(path.join(root, 'animation', 'tools', 'clips-codec', 'repair-cutscene-f7.js')).fnv1a32;
function entry(buffer, id) {
  const found = find(buffer, id);
  if (!found) return null;
  const at = found.table;
  const vtable = at - buffer.readInt32LE(at);
  const vtableBytes = buffer.readUInt16LE(vtable), tableBytes = buffer.readUInt16LE(vtable + 2);
  const slots = [];
  for (let i = 0; i < Math.floor((vtableBytes - 4) / 2); i++) {
    const offset = buffer.readUInt16LE(vtable + 4 + i * 2);
    slots.push(offset ? { offset, value: offset === 8 || offset === 12 ? buffer.readUInt32LE(at + offset) : null } : null);
  }
  return { id, index: found.index, tableBytes, vtableBytes, f7: buffer.readUInt32LE(at + 24), f7Hex: buffer.readUInt32LE(at + 24).toString(16), formulaCandidate0: fnv1a32(`AURORA-${id}-0`).toString(16), tableHex: buffer.subarray(at, at + tableBytes).toString('hex') };
}
const left = fs.readFileSync(baseline), right = fs.readFileSync(candidate);
console.log(JSON.stringify({ baseline: [100, 6100, 14002].map(id => entry(left, id)), candidate: [100, 6100, 14002, 14003, 14004, 14005].map(id => entry(right, id)) }, null, 2));
