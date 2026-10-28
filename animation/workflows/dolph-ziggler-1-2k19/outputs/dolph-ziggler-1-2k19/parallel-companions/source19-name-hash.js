'use strict';
// source19-name-hash.js — proven 2K19 source name hash (lead-verified 2026-10-16):
//   h = 0; for each case-sensitive ASCII byte: h = ROL32(h, 7) XOR byte
// Self-test: every actual body identifier across the five 273 phases (310/310) and
// every facial identifier (35/35) must reproduce from the recorded names.
const fs = require('node:fs');

function rol32(v, n) { return (((v << n) | (v >>> (32 - n))) >>> 0); }

function sourceHash(text) {
  if (typeof text !== 'string' || !text.length) throw new Error('sourceHash requires a non-empty string');
  let h = 0;
  for (const byte of Buffer.from(text, 'ascii')) h = (rol32(h, 7) ^ byte) >>> 0;
  return h;
}

const hex8 = (v) => v.toString(16).padStart(8, '0');

function selfTest(evidencePath) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const failures = [];
  let bodyChecked = 0, facialChecked = 0;
  for (const group of ['actualBody']) {
    for (const phase of evidence[group]) {
      for (const t of phase.tracks) {
        bodyChecked++;
        if (hex8(sourceHash(t.name)) !== t.actual) failures.push({ group, phase: phase.phase, name: t.name, expected: t.actual, got: hex8(sourceHash(t.name)) });
      }
    }
  }
  for (const group of ['actualFacial']) {
    for (const phase of evidence[group]) {
      for (const t of phase.tracks) {
        facialChecked++;
        if (hex8(sourceHash(t.name)) !== t.actual) failures.push({ group, phase: phase.phase, name: t.name, expected: t.actual, got: hex8(sourceHash(t.name)) });
      }
    }
  }
  return { bodyChecked, facialChecked, failures, pass: failures.length === 0 };
}

module.exports = { sourceHash, hex8 };

if (require.main === module) {
  const evidence = process.argv[2] || 'C:/nt100-codebasemain/.local/source19-name-hash-result.json';
  const result = selfTest(evidence);
  console.log(JSON.stringify(result, null, 1));
  if (!result.pass) process.exitCode = 1;
}
