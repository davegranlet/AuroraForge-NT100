'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { buildVictoryAssembly } = require('./build_2k26_victory_assembly');

const nativeFile = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CutsceneAssembly/6100.jsfb';
const source = fs.readFileSync(nativeFile);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');

const identity = buildVictoryAssembly(source, 6100, 'The_Rock_M_Face');
assert.deepEqual(identity, source, 'identity regeneration must be byte-identical to native Victory 6100');

const result = buildVictoryAssembly(source, 14003, 'The_Rock_M_Face');
assert.equal(result.toString('ascii', 4, 8), 'Scen');
assert.ok(result.includes(Buffer.from('Cutscene/CaeAdvanced/1014003.xcdef')));
assert.ok(result.includes(Buffer.from('14003_VIC_SINGLE_The_Rock_M_Face')));
assert.equal(result.readUInt32LE(result.indexOf(Buffer.from('14003_VIC_SINGLE_The_Rock_M_Face')) - 4), '14003_VIC_SINGLE_The_Rock_M_Face'.length);
assert.equal(result.readUInt32LE(112), 1014003);
assert.equal(result.readUInt32LE(124), 14003);
assert.equal(result.readUInt32LE(212), 14003);
assert.equal(result.length, source.length + '14003_VIC_SINGLE_The_Rock_M_Face'.length - '6100_VIC_SINGLE_The_Rock_M_Face'.length);
assert.notEqual(sha256(result), sha256(source));

assert.throws(() => buildVictoryAssembly(source, 14003, 'Name With Spaces'), /letters, digits, and underscores/);
console.log('build_2k26_victory_assembly: 10 assertions passed');
