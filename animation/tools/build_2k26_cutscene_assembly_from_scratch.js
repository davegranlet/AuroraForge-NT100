#!/usr/bin/env node
'use strict';
// Build Cutscene/CutsceneAssembly/<motionId>.jsfb FROM SCRATCH (no donor file input).
// The "Scen" layout constants were transcribed from the native 2K26 reference family
// (single-entrance variant: marker set 01 1a 3d 3c 5a 5b 5c 5d, labels Intro/Stage/
// Ramp/RingIn/Ring, five 7-digit pair ids <phase*10000+motionId>). The writer was
// proven by byte-identical regeneration of native files 273/274/275/247.
//
// Usage: node build_2k26_cutscene_assembly_from_scratch.js <outDir> <motionId> [name]
const fs = require('fs');
const path = require('path');

const PREFIX = Buffer.from('180000005363656e10001c00040008000c0010001400180010000000bc0100002c00000024000000140000000c00000004000000000000000000000008000000011a3d3c5a5b5c5d00000000050000002c010000dc000000940000004c00000004000000f2feffff000000003000000004000000220000004375747363656e652f436165416476616e6365642f303030303030302e786364656600000400000052696e670000000036ffffff000000003000000004000000220000004375747363656e652f436165416476616e6365642f303030303030302e786364656600000600000052696e67496e00007affffff000000003000000004000000220000004375747363656e652f436165416476616e6365642f303030303030302e786364656600000400000052616d7000000000beffffff000000003000000004000000220000004375747363656e652f436165416476616e6365642f303030303030302e78636465660000050000005374616765000a001000040008000c000a000000000000003000000004000000220000004375747363656e652f436165416476616e6365642f303030303030302e7863646566000005000000496e74726f00000018001400000008000000000000000000000007000c0010001800000000000001140000000c00000004000000000000000000000026000000', 'hex');
const SCALAR_POS = [384,308,240,172,104];
const DIGIT_POS = [421,345,277,209,141];

function buildScenAssembly(motionId, name) {
  if (!Number.isInteger(motionId) || motionId < 0 || motionId > 99999) throw new Error('motionId must be 0..99999');
  const label = String(name);
  if (!label.length || label.length > 120) throw new Error('name required (1..120 chars)');
  const pad = 4 - (label.length % 4);
  const buf = Buffer.alloc(504 + label.length + pad);
  PREFIX.copy(buf);
  for (let k = 0; k < 5; k++) {
    const num = (100 + k * 10) * 10000 + motionId;
    buf.writeUInt32LE(num, SCALAR_POS[k]);
    buf.write(String(num).padStart(7, '0'), DIGIT_POS[k], 'latin1');
  }
  buf.writeUInt32LE(label.length, 500);
  buf.write(label, 504, 'latin1');
  return buf;
}

if (require.main === module) {
  const [outDir, motionArg, nameArg] = process.argv.slice(2);
  const motionId = Number(motionArg);
  if (!outDir || !Number.isInteger(motionId)) {
    console.error('Usage: node build_2k26_cutscene_assembly_from_scratch.js <outDir> <motionId> [name]');
    process.exit(2);
  }
  const name = nameArg || motionId + '_ENT_SINGLE_AURORA_ENTRY';
  const buf = buildScenAssembly(motionId, name);
  fs.mkdirSync(path.resolve(outDir), { recursive: true });
  const target = path.join(path.resolve(outDir), motionId + '.jsfb');
  fs.writeFileSync(target, buf);
  console.log(JSON.stringify({ output: target, motionId, name, bytes: buf.length,
    pairs: [100, 110, 120, 130, 140].map((p) => p * 10000 + motionId) }, null, 2));
}

module.exports = { buildScenAssembly };
