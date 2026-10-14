#!/usr/bin/env node
'use strict';
// Byte-identity proof for the from-scratch Scen assembly builder: regenerate the
// native single-entrance reference files and require exact equality. Skips (fails)
// if the stock extraction is missing.
const fs = require('fs');
const assert = require('node:assert');
const { buildScenAssembly } = require('./build_2k26_cutscene_assembly_from_scratch');

const stockDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CutsceneAssembly';
const cases = [
  [273, '273_ENT_SINGLE_Dolph_Ziggler_18_M_Heel'],
  [274, '274_ENT_SINGLE_Happy_Corbin_M_Heel'],
  [275, '275_ENT_SINGLE_Dolph_Ziggler_14_M_Face'],
  [247, '247_ENT_SINGLE_Albert_M_Heel']
];
let run = 0;
for (const [id, name] of cases) {
  const p = stockDir + '/' + id + '.jsfb';
  if (!fs.existsSync(p)) { console.log('skip (missing stock ref):', id); continue; }
  const stock = fs.readFileSync(p);
  const built = buildScenAssembly(id, name);
  assert.strictEqual(built.length, stock.length, 'length mismatch for ' + id);
  assert.ok(built.equals(stock), 'byte mismatch for ' + id);
  run += 1;
  console.log('byte-identical:', id);
}
if (!run) throw new Error('no stock references available; cannot verify');
console.log('PASS: from-scratch assembly builder verified against ' + run + ' native files');
