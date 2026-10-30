'use strict';
// Repairs appended CutsceneNoRegistry rows whose f7 (per-entry motion key) is
// DUPLICATED: the clone-based appender copies the anchor's f7, so appended clones
// collide with an existing row. The game keys motions by f7; duplicates break
// lookup and crash on play. Only rows in [firstAppendedIndex, count) whose f7 is
// duplicated anywhere in the file are re-keyed; unique keys are preserved (a
// blanket re-key destroys valid pre-existing library keys). Patches only the f7 u32.
const fs = require('fs');
const path = require('path');
const { repairCutsceneF7 } = require('./clips-codec/repair-cutscene-f7');

const input = process.argv[2];
const output = process.argv[3];
const firstAppendedIndex = Number(process.argv[4] || 0);
if (!input || !output) {
  console.error('Usage: node fix-2k26-cutscene-f7.js <in> <out> <firstAppendedIndex>');
  process.exit(2);
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const buffer = fs.readFileSync(input);
const result = repairCutsceneF7(buffer, firstAppendedIndex);
fs.writeFileSync(output, buffer);
console.log(JSON.stringify({ output: path.resolve(output), ...result }, null, 2));
