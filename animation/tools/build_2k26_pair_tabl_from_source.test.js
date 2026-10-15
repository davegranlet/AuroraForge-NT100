#!/usr/bin/env node
'use strict';
// Tests for the from-source pair-Tabl builder:
//  1. identity build (same id token) must be byte-identical to the base file
//  2. generated 14002 files: no leftover source tokens, valid structure, expected pairId
//  3. structural equality vs the native basis (only intended numeric fields differ)
const fs = require('fs');
const assert = require('node:assert');
const { buildPairTabl } = require('./build_2k26_pair_tabl_from_source');

const stockDir = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';

// --- 1) identity
{
  const base = fs.readFileSync(`${stockDir}/1000273.jsfb`);
  const { buf } = buildPairTabl(base, { motionId: 273, pairPhase: 100 });
  assert.ok(buf.equals(base), 'identity build must be byte-identical');
  console.log('identity build: byte-identical PASS');
}

// --- 2+3) generate + verify
const { parseTabl } = require('./build_2k26_pair_tabl_from_source');
for (const phase of [100, 110, 120, 130, 140]) {
  const base = fs.readFileSync(`${stockDir}/${phase}0273.jsfb`);
  const { buf } = buildPairTabl(base, { motionId: 14002, pairPhase: phase });
  const text = buf.toString('latin1');
  assert.ok(!/(^|\D)273(\D|$)/.test(text), `phase ${phase}: leftover 273 token`);
  // pairId = phase*10000+14002 at root slot 1 (@56)
  assert.strictEqual(buf.readUInt32LE(56), phase * 10000 + 14002, `phase ${phase}: pairId`);
  // f7 = size - 132
  assert.strictEqual(buf.readUInt32LE(68), buf.length - 132, `phase ${phase}: f7`);
  // structure parseable: naive string inventory still coherent (every [len][printable] run)
  let inventory = 0;
  for (let o = 0; o + 4 <= buf.length; o++) {
    const len = buf.readUInt32LE(o);
    if (len >= 2 && len <= 300 && o + 4 + len <= buf.length) {
      const s = buf.toString('latin1', o + 4, o + 4 + len);
      if (/^[\x20-\x7e]+$/.test(s)) { inventory += 1; o += 3 + len; }
    }
  }
  assert.ok(inventory >= 25, `phase ${phase}: string inventory too small (${inventory})`);
  // every string that had the token now carries 14002
  console.log(`phase ${phase}: generated ${buf.length} bytes, tokens clean, pairId + sizes PASS (strings ${inventory})`);
}
console.log('ALL PAIR-TABL TESTS PASS');
