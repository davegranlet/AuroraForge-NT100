'use strict';
// 06-details3.js - compare decoded per-phase adefs payloads (read-only).
const fs = require('node:fs');
const crypto = require('node:crypto');
const D = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/dolph-ziggler-1-2k19/parallel-integration/lead-followup-2026-10-18/06-adefs-decoded';
const sha = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const PHASES = ['10', '11', '12', '13', '14'];

function load(fp) { const b = fs.readFileSync(fp); return b; }
function diffStat(a, b) {
  let diff = 0, first = -1, last = -1;
  const m = Math.min(a.length, b.length);
  for (let i = 0; i < m; i++) if (a[i] !== b[i]) { diff++; if (first < 0) first = i; last = i; }
  return { lenA: a.length, lenB: b.length, sameLength: a.length === b.length, diffAtCommonOffsets: diff, first, last };
}
function stringsFrom(buf, min = 5, cap = 400) {
  const out = []; const re = new RegExp(`[\\x20-\\x7e]{${min},}`, 'g'); const t = buf.toString('latin1'); let m;
  while ((m = re.exec(t)) && out.length < cap) out.push(m[0]);
  return out;
}
function setDiff(a, b) { const sb = new Set(b); return a.filter(x => !sb.has(x)); }

console.log('=== decoded adefs: comm(275) vs native275 ===');
for (const ph of PHASES) {
  const c = load(`${D}/comm-${ph}00275.bin`);
  const n = load(`${D}/n275-${ph}00275.bin`);
  const s = diffStat(c, n);
  console.log(`phase ${ph}: comm ${c.length}B sha=${sha(c).slice(0, 16)} | n275 ${n.length}B sha=${sha(n).slice(0, 16)} | ${JSON.stringify(s)}`);
}
console.log('\n=== decoded adefs: ours(14002) vs native273 (phase 10) ===');
{
  const o = load(`${D}/ours-1014002.bin`);
  const n = load(`${D}/n273-1000273.bin`);
  const s = diffStat(o, n);
  console.log(`ours ${o.length}B sha=${sha(o).slice(0, 16)} | n273 ${n.length}B sha=${sha(n).slice(0, 16)} | ${JSON.stringify(s)}`);
  const os = stringsFrom(o), ns = stringsFrom(n);
  console.log(`strings only ours: ${JSON.stringify(setDiff(os, ns).slice(0, 40))}`);
  console.log(`strings only n273: ${JSON.stringify(setDiff(ns, os).slice(0, 40))}`);
}

console.log('\n=== decoded adefs comm vs n275 strings diff (phase 10) ===');
{
  const c = load(`${D}/comm-1000275.bin`);
  const n = load(`${D}/n275-1000275.bin`);
  const cs = stringsFrom(c), ns = stringsFrom(n);
  console.log(`comm strings (${cs.length}): only-in-comm: ${JSON.stringify(setDiff(cs, ns).slice(0, 40))}`);
  console.log(`n275 strings (${ns.length}): only-in-n275: ${JSON.stringify(setDiff(ns, cs).slice(0, 40))}`);
  console.log(`comm strings sample: ${JSON.stringify(cs.slice(0, 60))}`);
}

console.log('\n=== decoded adefs comm vs n275 structure (phase 10, aligned windows) ===');
{
  const c = load(`${D}/comm-1000275.bin`);
  const n = load(`${D}/n275-1000275.bin`);
  const windows = [[0, 128], [4096, 64], [8192, 64], [12288, 64], [16384, 64], [20000, 64], [24000, 64]];
  for (const [off, len] of windows) {
    const cs = c.subarray(off, off + len).toString('hex');
    const ns = n.subarray(off, off + len).toString('hex');
    console.log(`off 0x${off.toString(16)} same=${cs === ns}`);
    if (cs !== ns) { console.log(`  comm: ${cs}`); console.log(`  n275: ${ns}`); }
  }
}
