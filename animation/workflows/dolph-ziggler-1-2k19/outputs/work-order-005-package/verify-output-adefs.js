'use strict';
// verify-output-adefs.js - output-side self-verification (order 005 P2.5):
// decodes nothing at runtime: uses the freshly decoded OUR-payloads (extracted from the output adefs)
// and resolves every clip/object-name string against the actual output clips record ids.
// Fails closed. Distinguishes: resolvable name->id links, definition-name strings (no id coupling), bijection.
const fs = require('fs');
const path = require('path');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const dir = __dirname;
const clipsDir = path.join(dir, 'clips-fixed');
const payloadsDir = path.join(dir, 'payloads');
const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');

let allPass = true;
for (let d = 0; d < 5; d++) {
  const clips = parse(fs.readFileSync(path.join(clipsDir, '1' + d + '14002.clips')), { includeRaw: false });
  const ids = new Set(clips.records.map((r) => BigInt(r.id)));
  const payload = fs.readFileSync(path.join(payloadsDir, 'ours-p' + d + '.bin'));
  const strings = [...new Set((payload.toString('latin1').match(/[\x20-\x7e]{4,}/g) || []))];
  const defNames = [], nameRefs = [];
  for (const s of strings) {
    if (!/^14002_/.test(s)) continue;
    if (/[a-z]/.test(s)) nameRefs.push(s);       // clip/object names contain lowercase (a_00_m, o5009, 00_c0, 15_r14, ...)
    else defNames.push(s);                       // definition names: all-numeric segments with optional P flag (61_0_0_0, 0_0_1_P_0)
  }
  const unresolved = nameRefs.filter((n) => !ids.has(fnvLower(n)));
  const matchedIds = new Set(nameRefs.map((n) => fnvLower(n)));
  const unlinkedRecords = clips.records.filter((r) => !matchedIds.has(BigInt(r.id))).map((r) => H(BigInt(r.id)));
  const pass = unresolved.length === 0 && unlinkedRecords.length === 0;
  if (!pass) allPass = false;
  console.log('p' + d, '| name-refs', nameRefs.length, 'resolved', nameRefs.length - unresolved.length, '| def-names (exempt)', defNames.length, '| records', clips.records.length, 'linked', clips.records.length - unlinkedRecords.length, '|', pass ? 'PASS' : 'FAIL ' + JSON.stringify({ unresolved, unlinkedRecords }));
}
if (!allPass) process.exitCode = 1;
console.log(allPass ? 'output-adefs self-verification: ALL FIVE PHASES PASS' : 'FAILURES');
