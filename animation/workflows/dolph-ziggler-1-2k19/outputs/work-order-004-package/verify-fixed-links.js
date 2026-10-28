'use strict';
// verify-fixed-links.js - post-fix verification: every expected 14002 link resolves, zero stale ids.
const fs = require('fs');
const path = require('path');
const { parse } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');

const dir = __dirname;
const audit = JSON.parse(fs.readFileSync(path.join(dir, 'link-audit.json'), 'utf8'));
const MASK = (1n << 64n) - 1n;
function fnvLower(s) { let v = 0xcbf29ce484222325n; for (const b of Buffer.from(s.toLowerCase(), 'utf8')) { v ^= BigInt(b); v = (v * 0x100000001b3n) & MASK; } return v; }
const H = (v) => '0x' + v.toString(16).toUpperCase().padStart(16, '0');

let allPass = true;
for (let d = 0; d < 5; d++) {
  const fp = path.join(dir, 'package', 'Animation', 'CaeAdvanced', '1' + d + '14002.clips');
  const buf = fs.readFileSync(fp);
  const clips = parse(buf, { includeRaw: false });
  const ids = new Set(clips.records.map((r) => BigInt(r.id)));
  const natLinks = new Set(audit.phases['nat273-p' + d].links.map((l) => l.name.replace(/^273/, '14002')));
  let pass = 0; const failures = [];
  for (const nm of natLinks) { ids.has(fnvLower(nm)) ? pass++ : failures.push(nm); }
  let oldBytes = 0;
  for (const l of audit.phases['nat273-p' + d].links) {
    const n = Buffer.alloc(8); n.writeBigUInt64LE(BigInt(l.matchesLower ? l.lowerId : l.verbatimId));
    let i = 0; while ((i = buf.indexOf(n, i)) !== -1) { oldBytes++; i++; }
  }
  const pass0 = pass === natLinks.size && oldBytes === 0;
  if (!pass0) allPass = false;
  console.log('p' + d, 'records', clips.records.length, '| links', pass + '/' + natLinks.size, failures.length ? 'FAIL:' + failures.join(',') : 'PASS', '| stale-id-bytes', oldBytes);
}
console.log(allPass ? 'ALL FIVE PHASES PASS' : 'FAILURES PRESENT');
process.exitCode = allPass ? 0 : 1;
